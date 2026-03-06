import { eq } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { holdings, priceHistory, portfolios } from '../db/schema.js'
import { savePrices } from './prices.js'
import { computePortfolioSnapshot, savePortfolioValueSnapshot } from './portfolioValue.js'
import { fetchFinnhubQuotesBatched } from '../lib/finnhub.js'
import { fetchAlphaVantageQuote } from '../lib/alphaVantage.js'
import type { PriceQuote } from 'shared'

export type PriceFetchResult = {
  fetched: number
  skipped: number
  failed: string[]
}

export async function fetchAndStorePrices(db: DbInstance): Promise<PriceFetchResult> {
  const today = new Date().toISOString().slice(0, 10)

  // ── 1. Find tickers needing today's price ──────────────────────────────────
  const [allTickerRows, pricedTickerRows] = await Promise.all([
    db.selectDistinct({ ticker: holdings.ticker }).from(holdings),
    db
      .selectDistinct({ ticker: priceHistory.ticker })
      .from(priceHistory)
      .where(eq(priceHistory.date, today)),
  ])

  const pricedSet = new Set(pricedTickerRows.map((r) => r.ticker))
  const allTickers = allTickerRows.map((r) => r.ticker)
  const tickersToFetch = allTickers.filter((t) => !pricedSet.has(t))
  const skipped = allTickers.length - tickersToFetch.length

  // ── 2. Fetch via Finnhub → Alpha Vantage fallback ─────────────────────────
  const pricesToSave: Array<{ ticker: string; date: string; closePrice: string }> = []
  const failed: string[] = []

  if (tickersToFetch.length > 0) {
    let finnhubResults: Map<string, PriceQuote | null> = new Map()
    try {
      finnhubResults = await fetchFinnhubQuotesBatched(tickersToFetch)
    } catch (err) {
      console.error('priceFetchService: Finnhub batch fetch failed:', err)
    }

    for (const ticker of tickersToFetch) {
      const quote = finnhubResults.get(ticker) ?? null

      if (quote) {
        pricesToSave.push({ ticker, date: today, closePrice: String(quote.closePrice) })
      } else {
        // Fallback to Alpha Vantage
        try {
          const avQuote = await fetchAlphaVantageQuote(ticker)
          if (avQuote) {
            pricesToSave.push({ ticker, date: today, closePrice: String(avQuote.closePrice) })
          } else {
            failed.push(ticker)
          }
        } catch {
          failed.push(ticker)
        }
      }
    }

    // ── 3. Save fetched prices ──────────────────────────────────────────────
    if (pricesToSave.length > 0) {
      try {
        await savePrices(db, pricesToSave)
      } catch (err) {
        console.error('priceFetchService: failed to save prices:', err)
      }
    }
  }

  // ── 4. Snapshot every portfolio ────────────────────────────────────────────
  let allPortfolios: Array<{ id: string; userId: string }> = []
  try {
    allPortfolios = await db.select({ id: portfolios.id, userId: portfolios.userId }).from(portfolios)
  } catch (err) {
    console.error('priceFetchService: failed to query portfolios:', err)
  }

  for (const portfolio of allPortfolios) {
    try {
      const snapshot = await computePortfolioSnapshot(db, portfolio.id, portfolio.userId)
      await savePortfolioValueSnapshot(db, portfolio.id, today, snapshot)
    } catch (err) {
      console.error(`priceFetchService: failed to snapshot portfolio ${portfolio.id}:`, err)
    }
  }

  return { fetched: pricesToSave.length, skipped, failed }
}
