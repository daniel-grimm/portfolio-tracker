import { eq, and } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { holdings, accounts, portfolios } from '../db/schema.js'
import { NotFoundError, ForbiddenError } from '../lib/errors.js'
import { getAccountById } from './accounts.js'
import type {
  Holding,
  AggregatedHolding,
  CreateHoldingInput,
  UpdateHoldingInput,
  ImportHoldingsResult,
} from 'shared'

const holdingColumns = {
  id: holdings.id,
  accountId: holdings.accountId,
  ticker: holdings.ticker,
  shares: holdings.shares,
  avgCostBasis: holdings.avgCostBasis,
  purchaseDate: holdings.purchaseDate,
  createdAt: holdings.createdAt,
  updatedAt: holdings.updatedAt,
}

export async function getHoldingsForAccount(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<Holding[]> {
  await getAccountById(db, accountId, userId)
  return db.select().from(holdings).where(eq(holdings.accountId, accountId))
}

export async function getHoldingById(
  db: DbInstance,
  holdingId: string,
  userId: string,
): Promise<Holding> {
  const [result] = await db
    .select(holdingColumns)
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(and(eq(holdings.id, holdingId), eq(portfolios.userId, userId)))

  if (!result) throw new NotFoundError(`Holding ${holdingId} not found`)
  return result
}

export async function getAllHoldingsForUser(
  db: DbInstance,
  userId: string,
): Promise<AggregatedHolding[]> {
  const rows = await db
    .select(holdingColumns)
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(eq(portfolios.userId, userId))

  const byTicker = new Map<string, Holding[]>()
  for (const h of rows) {
    const list = byTicker.get(h.ticker) ?? []
    list.push(h)
    byTicker.set(h.ticker, list)
  }

  return Array.from(byTicker.entries()).map(([ticker, hs]) => {
    const totalShares = hs.reduce((sum, h) => sum + Number(h.shares), 0)
    const weightedSum = hs.reduce(
      (sum, h) => sum + Number(h.shares) * Number(h.avgCostBasis),
      0,
    )
    const weightedAvgCostBasis = totalShares > 0 ? weightedSum / totalShares : 0
    return {
      ticker,
      totalShares: String(totalShares),
      weightedAvgCostBasis: String(weightedAvgCostBasis),
      holdings: hs,
    }
  })
}

export async function createHolding(
  db: DbInstance,
  accountId: string,
  userId: string,
  input: CreateHoldingInput,
): Promise<Holding> {
  await getAccountById(db, accountId, userId)
  const [holding] = await db
    .insert(holdings)
    .values({
      accountId,
      ticker: input.ticker.toUpperCase(),
      shares: input.shares,
      avgCostBasis: input.avgCostBasis,
      purchaseDate: input.purchaseDate,
    })
    .returning()
  return holding
}

export async function updateHolding(
  db: DbInstance,
  holdingId: string,
  userId: string,
  input: UpdateHoldingInput,
): Promise<Holding> {
  const existing = await getHoldingById(db, holdingId, userId)
  const [updated] = await db
    .update(holdings)
    .set({
      ticker: input.ticker !== undefined ? input.ticker.toUpperCase() : existing.ticker,
      shares: input.shares ?? existing.shares,
      avgCostBasis: input.avgCostBasis ?? existing.avgCostBasis,
      purchaseDate: input.purchaseDate ?? existing.purchaseDate,
      updatedAt: new Date(),
    })
    .where(eq(holdings.id, holdingId))
    .returning()
  return updated
}

export async function deleteHolding(
  db: DbInstance,
  holdingId: string,
  userId: string,
): Promise<void> {
  await getHoldingById(db, holdingId, userId)
  await db.delete(holdings).where(eq(holdings.id, holdingId))
}

export async function importHoldings(
  db: DbInstance,
  accountId: string,
  userId: string,
  lots: CreateHoldingInput[],
): Promise<ImportHoldingsResult> {
  // Check account exists (404 if not)
  const [account] = await db
    .select({ id: accounts.id, portfolioId: accounts.portfolioId })
    .from(accounts)
    .where(eq(accounts.id, accountId))

  if (!account) throw new NotFoundError(`Account ${accountId} not found`)

  // Check ownership (403 if wrong user)
  const [portfolio] = await db
    .select({ userId: portfolios.userId })
    .from(portfolios)
    .where(eq(portfolios.id, account.portfolioId))

  if (!portfolio || portfolio.userId !== userId) throw new ForbiddenError('Access denied')

  if (lots.length === 0) return { imported: 0, skipped: 0 }

  await db.insert(holdings).values(
    lots.map((lot) => ({
      accountId,
      ticker: lot.ticker.toUpperCase(),
      shares: lot.shares,
      avgCostBasis: lot.avgCostBasis,
      purchaseDate: lot.purchaseDate,
    })),
  )

  return { imported: lots.length, skipped: 0 }
}
