import { eq, and } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { dividends, holdings, accounts, portfolios } from '../db/schema.js'
import { NotFoundError } from '../lib/errors.js'
import { getAccountById } from './accounts.js'
import { getPortfolioById } from './portfolios.js'
import type { Dividend, CreateDividendInput, UpdateDividendInput } from 'shared'

const dividendColumns = {
  id: dividends.id,
  accountId: dividends.accountId,
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

async function getDividendWithAccount(
  db: DbInstance,
  dividendId: string,
  userId: string,
): Promise<Dividend> {
  const [row] = await db
    .select(dividendColumns)
    .from(dividends)
    .innerJoin(accounts, eq(dividends.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(and(eq(dividends.id, dividendId), eq(portfolios.userId, userId)))

  if (!row) throw new NotFoundError(`Dividend ${dividendId} not found`)

  return row
}

export async function getDividendById(
  db: DbInstance,
  dividendId: string,
  userId: string,
): Promise<Dividend> {
  return getDividendWithAccount(db, dividendId, userId)
}

export async function createDividend(
  db: DbInstance,
  accountId: string,
  userId: string,
  input: CreateDividendInput,
): Promise<Dividend> {
  await getAccountById(db, accountId, userId)

  const lotsForTicker = await db
    .select({ shares: holdings.shares })
    .from(holdings)
    .where(and(eq(holdings.accountId, accountId), eq(holdings.ticker, input.ticker)))

  const totalShares = lotsForTicker.reduce((sum, h) => sum + Number(h.shares), 0)
  const totalAmount = (Number(input.amountPerShare) * totalShares).toString()

  const [dividend] = await db
    .insert(dividends)
    .values({
      accountId,
      ticker: input.ticker,
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

export async function getDividendsForAccount(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<Dividend[]> {
  await getAccountById(db, accountId, userId)
  return db
    .select(dividendColumns)
    .from(dividends)
    .where(eq(dividends.accountId, accountId))
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
    .innerJoin(accounts, eq(dividends.accountId, accounts.id))
    .where(eq(accounts.portfolioId, portfolioId))
}

export async function getAllDividendsForUser(
  db: DbInstance,
  userId: string,
): Promise<Dividend[]> {
  return db
    .select(dividendColumns)
    .from(dividends)
    .innerJoin(accounts, eq(dividends.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(eq(portfolios.userId, userId))
}

export async function updateDividend(
  db: DbInstance,
  dividendId: string,
  userId: string,
  input: UpdateDividendInput,
): Promise<Dividend> {
  const existing = await getDividendWithAccount(db, dividendId, userId)

  const newAmountPerShare = input.amountPerShare ?? existing.amountPerShare
  let totalAmount = existing.totalAmount

  if (input.amountPerShare !== undefined) {
    const lotsForTicker = await db
      .select({ shares: holdings.shares })
      .from(holdings)
      .where(and(eq(holdings.accountId, existing.accountId), eq(holdings.ticker, existing.ticker)))
    const totalShares = lotsForTicker.reduce((sum, h) => sum + Number(h.shares), 0)
    totalAmount = (Number(newAmountPerShare) * totalShares).toString()
  }

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
