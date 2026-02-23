import { eq, and, gte, asc } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { portfolioValueHistory, holdings, accounts } from '../db/schema.js'
import { getPortfolioById } from './portfolios.js'
import { getLatestPricesForTickers } from './prices.js'
import type { PortfolioValuePoint, ValueHistoryRange } from 'shared'

const holdingColumns = {
  ticker: holdings.ticker,
  shares: holdings.shares,
  avgCostBasis: holdings.avgCostBasis,
}

function getRangeCutoff(range: ValueHistoryRange): string | null {
  if (range === 'all') return null
  const days: Record<Exclude<ValueHistoryRange, 'all'>, number> = {
    '1m': 30,
    '3m': 90,
    '6m': 180,
    '1y': 365,
  }
  const d = new Date()
  d.setDate(d.getDate() - days[range])
  return d.toISOString().slice(0, 10)
}

export async function computePortfolioSnapshot(
  db: DbInstance,
  portfolioId: string,
  userId: string,
): Promise<{ totalValue: string; costBasis: string; isPartial: boolean }> {
  await getPortfolioById(db, portfolioId, userId)

  const portfolioHoldings = await db
    .select(holdingColumns)
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(eq(accounts.portfolioId, portfolioId))

  if (portfolioHoldings.length === 0) {
    return { totalValue: '0', costBasis: '0', isPartial: false }
  }

  const tickers = [...new Set(portfolioHoldings.map((h) => h.ticker))]
  const priceMap = await getLatestPricesForTickers(db, tickers)

  let totalValue = 0
  let costBasis = 0
  let isPartial = false

  for (const h of portfolioHoldings) {
    const shares = Number(h.shares)
    const avgCost = Number(h.avgCostBasis)
    costBasis += shares * avgCost

    const priceRow = priceMap.get(h.ticker)
    if (priceRow) {
      totalValue += shares * Number(priceRow.closePrice)
    } else {
      isPartial = true
      totalValue += shares * avgCost // use cost basis as fallback
    }
  }

  return {
    totalValue: totalValue.toFixed(6),
    costBasis: costBasis.toFixed(6),
    isPartial,
  }
}

export async function savePortfolioValueSnapshot(
  db: DbInstance,
  portfolioId: string,
  date: string,
  snapshot: { totalValue: string; costBasis: string; isPartial: boolean },
): Promise<void> {
  const [existing] = await db
    .select({ id: portfolioValueHistory.id })
    .from(portfolioValueHistory)
    .where(
      and(
        eq(portfolioValueHistory.portfolioId, portfolioId),
        eq(portfolioValueHistory.date, date),
      ),
    )

  if (existing) {
    await db
      .update(portfolioValueHistory)
      .set({
        totalValue: snapshot.totalValue,
        costBasis: snapshot.costBasis,
        isPartial: snapshot.isPartial,
      })
      .where(eq(portfolioValueHistory.id, existing.id))
  } else {
    await db.insert(portfolioValueHistory).values({
      portfolioId,
      date,
      totalValue: snapshot.totalValue,
      costBasis: snapshot.costBasis,
      isPartial: snapshot.isPartial,
    })
  }
}

export async function getPortfolioValueHistory(
  db: DbInstance,
  portfolioId: string,
  userId: string,
  range: ValueHistoryRange = 'all',
): Promise<PortfolioValuePoint[]> {
  await getPortfolioById(db, portfolioId, userId)

  const cutoff = getRangeCutoff(range)
  const where = cutoff
    ? and(
        eq(portfolioValueHistory.portfolioId, portfolioId),
        gte(portfolioValueHistory.date, cutoff),
      )
    : eq(portfolioValueHistory.portfolioId, portfolioId)

  const rows = await db
    .select()
    .from(portfolioValueHistory)
    .where(where)
    .orderBy(asc(portfolioValueHistory.date))

  return rows.map((r) => ({
    date: r.date,
    totalValue: Number(r.totalValue),
    costBasis: Number(r.costBasis),
    isPartial: r.isPartial,
  }))
}
