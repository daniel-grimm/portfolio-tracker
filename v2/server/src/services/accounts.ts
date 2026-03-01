import { eq, and, isNull, inArray } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { accounts, portfolios, dividends } from '../db/schema.js'
import { NotFoundError } from '../lib/errors.js'
import { getPortfolioById } from './portfolios.js'
import type { Account, CreateAccountInput, UpdateAccountInput } from 'shared'

const accountColumns = {
  id: accounts.id,
  portfolioId: accounts.portfolioId,
  name: accounts.name,
  description: accounts.description,
  disabledAt: accounts.disabledAt,
  createdAt: accounts.createdAt,
  updatedAt: accounts.updatedAt,
}

export async function getAccountsForPortfolio(
  db: DbInstance,
  portfolioId: string,
  userId: string,
): Promise<Account[]> {
  await getPortfolioById(db, portfolioId, userId)
  return db
    .select(accountColumns)
    .from(accounts)
    .where(and(eq(accounts.portfolioId, portfolioId), isNull(accounts.disabledAt)))
}

export async function getAccountById(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<Account> {
  const [result] = await db
    .select(accountColumns)
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
    .returning(accountColumns)
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
    .returning(accountColumns)
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

export async function disableAccount(
  db: DbInstance,
  accountId: string,
  userId: string,
): Promise<Account> {
  await getAccountById(db, accountId, userId)

  // Delete scheduled and projected dividends — paid dividends stay as historical records
  await db
    .delete(dividends)
    .where(
      and(
        eq(dividends.accountId, accountId),
        inArray(dividends.status, ['scheduled', 'projected']),
      ),
    )

  const [disabled] = await db
    .update(accounts)
    .set({ disabledAt: new Date(), updatedAt: new Date() })
    .where(eq(accounts.id, accountId))
    .returning(accountColumns)

  return disabled
}
