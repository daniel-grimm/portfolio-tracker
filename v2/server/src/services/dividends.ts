import { eq, and } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { dividends, holdings, accounts, portfolios } from '../db/schema.js'
import { NotFoundError } from '../lib/errors.js'
import { getHoldingById } from './holdings.js'
import { getAccountById } from './accounts.js'
import { getPortfolioById } from './portfolios.js'
import type { Dividend, CreateDividendInput, UpdateDividendInput } from 'shared'

const dividendColumns = {
  id: dividends.id,
  holdingId: dividends.holdingId,
  ticker: dividends.ticker,
  amountPerShare: dividends.amountPerShare,
  totalAmount: dividends.totalAmount,
  exDate: dividends.exDate,
  payDate: dividends.payDate,
  recordDate: dividends.recordDate,
  status: dividends.status,
  createdAt: dividends.createdAt,
  updatedAt: dividends.updatedAt,
}

async function getDividendWithHolding(
  db: DbInstance,
  dividendId: string,
  userId: string,
): Promise<{ dividend: Dividend; shares: string }> {
  const [row] = await db
    .select({ ...dividendColumns, shares: holdings.shares })
    .from(dividends)
    .innerJoin(holdings, eq(dividends.holdingId, holdings.id))
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(and(eq(dividends.id, dividendId), eq(portfolios.userId, userId)))

  if (!row) throw new NotFoundError(`Dividend ${dividendId} not found`)

  const { shares, ...dividend } = row
  return { dividend, shares }
}

export async function getDividendById(
  db: DbInstance,
  dividendId: string,
  userId: string,
): Promise<Dividend> {
  const { dividend } = await getDividendWithHolding(db, dividendId, userId)
  return dividend
}

export async function createDividend(
  db: DbInstance,
  holdingId: string,
  userId: string,
  input: CreateDividendInput,
): Promise<Dividend> {
  const holding = await getHoldingById(db, holdingId, userId)
  const totalAmount = (Number(input.amountPerShare) * Number(holding.shares)).toString()

  const [dividend] = await db
    .insert(dividends)
    .values({
      holdingId,
      ticker: holding.ticker,
      amountPerShare: input.amountPerShare,
      totalAmount,
      exDate: input.exDate,
      payDate: input.payDate,
      recordDate: input.recordDate ?? null,
      status: input.status ?? 'scheduled',
    })
    .returning(dividendColumns)

  return dividend
}

export async function getDividendsForHolding(
  db: DbInstance,
  holdingId: string,
  userId: string,
): Promise<Dividend[]> {
  await getHoldingById(db, holdingId, userId)
  return db
    .select(dividendColumns)
    .from(dividends)
    .where(eq(dividends.holdingId, holdingId))
}

export async function getDividendsForAccount(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<Dividend[]> {
  await getAccountById(db, accountId, userId)
  return db
    .select(dividendColumns)
    .from(dividends)
    .innerJoin(holdings, eq(dividends.holdingId, holdings.id))
    .where(eq(holdings.accountId, accountId))
}

export async function getDividendsForPortfolio(
  db: DbInstance,
  portfolioId: string,
  userId: string,
): Promise<Dividend[]> {
  await getPortfolioById(db, portfolioId, userId)
  return db
    .select(dividendColumns)
    .from(dividends)
    .innerJoin(holdings, eq(dividends.holdingId, holdings.id))
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(eq(accounts.portfolioId, portfolioId))
}

export async function getAllDividendsForUser(
  db: DbInstance,
  userId: string,
): Promise<Dividend[]> {
  return db
    .select(dividendColumns)
    .from(dividends)
    .innerJoin(holdings, eq(dividends.holdingId, holdings.id))
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(eq(portfolios.userId, userId))
}

export async function updateDividend(
  db: DbInstance,
  dividendId: string,
  userId: string,
  input: UpdateDividendInput,
): Promise<Dividend> {
  const { dividend: existing, shares } = await getDividendWithHolding(db, dividendId, userId)

  const newAmountPerShare = input.amountPerShare ?? existing.amountPerShare
  const totalAmount =
    input.amountPerShare !== undefined
      ? (Number(newAmountPerShare) * Number(shares)).toString()
      : existing.totalAmount

  const [updated] = await db
    .update(dividends)
    .set({
      amountPerShare: newAmountPerShare,
      totalAmount,
      exDate: input.exDate ?? existing.exDate,
      payDate: input.payDate ?? existing.payDate,
      recordDate: input.recordDate !== undefined ? input.recordDate : existing.recordDate,
      status: input.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(eq(dividends.id, dividendId))
    .returning(dividendColumns)

  return updated
}

export async function deleteDividend(
  db: DbInstance,
  dividendId: string,
  userId: string,
): Promise<void> {
  await getDividendById(db, dividendId, userId)
  await db.delete(dividends).where(eq(dividends.id, dividendId))
}
