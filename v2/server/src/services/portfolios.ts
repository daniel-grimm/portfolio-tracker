import { eq, and } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { portfolios } from '../db/schema.js'
import { NotFoundError } from '../lib/errors.js'
import type { CreatePortfolioInput, UpdatePortfolioInput, Portfolio } from 'shared'

export async function getUserPortfolios(
  db: DbInstance,
  userId: string,
): Promise<Portfolio[]> {
  return db.select().from(portfolios).where(eq(portfolios.userId, userId))
}

export async function getPortfolioById(
  db: DbInstance,
  portfolioId: string,
  userId: string,
): Promise<Portfolio> {
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)))

  if (!portfolio) throw new NotFoundError(`Portfolio ${portfolioId} not found`)
  return portfolio
}

export async function createPortfolio(
  db: DbInstance,
  userId: string,
  input: CreatePortfolioInput,
): Promise<Portfolio> {
  const [portfolio] = await db
    .insert(portfolios)
    .values({
      userId,
      name: input.name,
      description: input.description ?? null,
    })
    .returning()
  return portfolio
}

export async function updatePortfolio(
  db: DbInstance,
  portfolioId: string,
  userId: string,
  input: UpdatePortfolioInput,
): Promise<Portfolio> {
  const existing = await getPortfolioById(db, portfolioId, userId)

  const [updated] = await db
    .update(portfolios)
    .set({
      name: input.name ?? existing.name,
      description:
        input.description !== undefined ? input.description : existing.description,
      updatedAt: new Date(),
    })
    .where(eq(portfolios.id, portfolioId))
    .returning()

  return updated
}

export async function deletePortfolio(
  db: DbInstance,
  portfolioId: string,
  userId: string,
): Promise<void> {
  await getPortfolioById(db, portfolioId, userId)
  await db.delete(portfolios).where(eq(portfolios.id, portfolioId))
}
