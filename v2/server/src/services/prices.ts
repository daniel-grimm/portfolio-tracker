import { eq, and, desc, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { priceHistory, holdings } from '../db/schema.js'
import type { PriceHistory } from 'shared'

export async function getTodaysPriceForTicker(
  db: DbInstance,
  ticker: string,
): Promise<PriceHistory | null> {
  const today = new Date().toISOString().slice(0, 10)
  const [row] = await db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.ticker, ticker), eq(priceHistory.date, today)))
  return row ?? null
}

export async function getLatestPriceForTicker(
  db: DbInstance,
  ticker: string,
): Promise<PriceHistory | null> {
  const [row] = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.ticker, ticker))
    .orderBy(desc(priceHistory.date))
    .limit(1)
  return row ?? null
}

export async function getLatestPricesForTickers(
  db: DbInstance,
  tickers: string[],
): Promise<Map<string, PriceHistory | null>> {
  const result = new Map<string, PriceHistory | null>()
  if (tickers.length === 0) return result

  const rows = await Promise.all(tickers.map((ticker) => getLatestPriceForTicker(db, ticker)))
  tickers.forEach((ticker, i) => result.set(ticker, rows[i]))
  return result
}

export async function savePrices(
  db: DbInstance,
  prices: Array<{ ticker: string; date: string; closePrice: string }>,
): Promise<void> {
  if (prices.length === 0) return

  await db
    .insert(priceHistory)
    .values(
      prices.map((p) => ({
        ticker: p.ticker,
        date: p.date,
        closePrice: p.closePrice,
        fetchedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: [priceHistory.ticker, priceHistory.date],
      set: {
        closePrice: sql`excluded.close_price`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    })
}

export async function getTickersNeedingPriceUpdate(db: DbInstance): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10)

  const [allTickerRows, pricedTickerRows] = await Promise.all([
    db.selectDistinct({ ticker: holdings.ticker }).from(holdings),
    db
      .selectDistinct({ ticker: priceHistory.ticker })
      .from(priceHistory)
      .where(eq(priceHistory.date, today)),
  ])

  const pricedSet = new Set(pricedTickerRows.map((r) => r.ticker))
  return allTickerRows.map((r) => r.ticker).filter((t) => !pricedSet.has(t))
}
