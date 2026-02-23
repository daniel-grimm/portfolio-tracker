import { eq, and } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { accounts, portfolios } from '../db/schema.js'
import { NotFoundError } from '../lib/errors.js'
import { getPortfolioById } from './portfolios.js'
import type { Account, CreateAccountInput, UpdateAccountInput } from 'shared'

export async function getAccountsForPortfolio(
  db: DbInstance,
  portfolioId: string,
  userId: string,
): Promise<Account[]> {
  await getPortfolioById(db, portfolioId, userId)
  return db.select().from(accounts).where(eq(accounts.portfolioId, portfolioId))
}

export async function getAccountById(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<Account> {
  const [result] = await db
    .select({
      id: accounts.id,
      portfolioId: accounts.portfolioId,
      name: accounts.name,
      description: accounts.description,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(and(eq(accounts.id, accountId), eq(portfolios.userId, userId)))

  if (!result) throw new NotFoundError(`Account ${accountId} not found`)
  return result
}

export async function createAccount(
  db: DbInstance,
  portfolioId: string,
  userId: string,
  input: CreateAccountInput,
): Promise<Account> {
  await getPortfolioById(db, portfolioId, userId)
  const [account] = await db
    .insert(accounts)
    .values({
      portfolioId,
      name: input.name,
      description: input.description ?? null,
    })
    .returning()
  return account
}

export async function updateAccount(
  db: DbInstance,
  accountId: string,
  userId: string,
  input: UpdateAccountInput,
): Promise<Account> {
  const existing = await getAccountById(db, accountId, userId)
  const [updated] = await db
    .update(accounts)
    .set({
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning()
  return updated
}

export async function deleteAccount(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<void> {
  await getAccountById(db, accountId, userId)
  await db.delete(accounts).where(eq(accounts.id, accountId))
}
