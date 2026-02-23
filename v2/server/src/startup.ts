import { db } from './db/index.js'
import { portfolios } from './db/schema.js'
import { getTickersNeedingPriceUpdate, savePrices } from './services/prices.js'
import { computePortfolioSnapshot, savePortfolioValueSnapshot } from './services/portfolioValue.js'
import { fetchFinnhubQuotesBatched } from './lib/finnhub.js'
import { fetchAlphaVantageQuote } from './lib/alphaVantage.js'

export async function startup(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  console.log(`Startup: beginning price fetch and portfolio snapshot for ${today}`)

  // ── 1. Find tickers needing today's price ──────────────────────────────────
  let tickersToFetch: string[] = []
  try {
    tickersToFetch = await getTickersNeedingPriceUpdate(db)
    console.log(`Startup: ${tickersToFetch.length} tickers need price update`)
  } catch (err) {
    console.error('Startup: failed to get tickers needing update:', err)
    return
  }

  if (tickersToFetch.length === 0) {
    console.log('Startup: all prices are up to date')
  }

  // ── 2. Fetch via Finnhub ───────────────────────────────────────────────────
  let finnhubCount = 0
  let alphaVantageCount = 0
  let skippedCount = 0
  const pricesToSave: Array<{ ticker: string; date: string; closePrice: string }> = []

  if (tickersToFetch.length > 0) {
    let finnhubResults: Map<string, { closePrice: number; fetchedAt: Date } & { ticker: string } | null>
    try {
      finnhubResults = await fetchFinnhubQuotesBatched(tickersToFetch)
    } catch (err) {
      console.error('Startup: Finnhub batch fetch failed:', err)
      finnhubResults = new Map()
    }

    for (const ticker of tickersToFetch) {
      const quote = finnhubResults.get(ticker) ?? null

      if (quote) {
        pricesToSave.push({ ticker, date: today, closePrice: String(quote.closePrice) })
        finnhubCount++
      } else {
        // ── 3. Fallback to Alpha Vantage ───────────────────────────────────
        try {
          const avQuote = await fetchAlphaVantageQuote(ticker)
          if (avQuote) {
            pricesToSave.push({ ticker, date: today, closePrice: String(avQuote.closePrice) })
            alphaVantageCount++
          } else {
            skippedCount++
          }
        } catch {
          skippedCount++
        }
      }
    }

    // ── 4. Save prices ─────────────────────────────────────────────────────
    if (pricesToSave.length > 0) {
      try {
        await savePrices(db, pricesToSave)
      } catch (err) {
        console.error('Startup: failed to save prices:', err)
      }
    }
  }

  // ── 5. Snapshot every portfolio ────────────────────────────────────────────
  let allPortfolios: Array<{ id: string; userId: string }> = []
  try {
    allPortfolios = await db.select({ id: portfolios.id, userId: portfolios.userId }).from(portfolios)
  } catch (err) {
    console.error('Startup: failed to query portfolios:', err)
  }

  let snapshotCount = 0
  for (const portfolio of allPortfolios) {
    try {
      const snapshot = await computePortfolioSnapshot(db, portfolio.id, portfolio.userId)
      await savePortfolioValueSnapshot(db, portfolio.id, today, snapshot)
      snapshotCount++
    } catch (err) {
      console.error(`Startup: failed to snapshot portfolio ${portfolio.id}:`, err)
    }
  }

  console.log(
    `Startup complete: ${finnhubCount} prices via Finnhub, ${alphaVantageCount} via Alpha Vantage, ` +
      `${skippedCount} tickers skipped, ${snapshotCount} portfolios snapshotted`,
  )
}
