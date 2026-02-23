import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import {
  getUserPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from '../../server/src/services/portfolios.js'
import { NotFoundError } from '../../server/src/lib/errors.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

const MISSING_ID = '00000000-0000-0000-0000-000000000000'

describe('getUserPortfolios', () => {
  it("returns only the requesting user's portfolios", async () => {
    await withTestTransaction(testDb, async (db) => {
      const p1 = await createPortfolio(db, 'user-1', { name: 'Port A' })
      await createPortfolio(db, 'user-2', { name: 'Port B' })

      const result = await getUserPortfolios(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(p1.id)
    })
  })

  it('returns empty array for user with no portfolios', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getUserPortfolios(db, 'no-portfolios-user')
      expect(result).toEqual([])
    })
  })
})

describe('getPortfolioById', () => {
  it('returns portfolio when userId matches', async () => {
    await withTestTransaction(testDb, async (db) => {
      const created = await createPortfolio(db, 'user-1', { name: 'Port A' })
      const result = await getPortfolioById(db, created.id, 'user-1')
      expect(result.id).toBe(created.id)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const created = await createPortfolio(db, 'user-1', { name: 'Port A' })
      await expect(
        getPortfolioById(db, created.id, 'user-2'),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  it('throws NotFoundError for missing id', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(
        getPortfolioById(db, MISSING_ID, 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('createPortfolio', () => {
  it('inserts and returns portfolio with all fields', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await createPortfolio(db, 'user-1', {
        name: 'My Portfolio',
        description: 'A test portfolio',
      })
      expect(result.id).toBeDefined()
      expect(result.userId).toBe('user-1')
      expect(result.name).toBe('My Portfolio')
      expect(result.description).toBe('A test portfolio')
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  it('sets null description when not provided', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await createPortfolio(db, 'user-1', { name: 'No Desc' })
      expect(result.description).toBeNull()
    })
  })
})

describe('updatePortfolio', () => {
  it('updates and returns the portfolio', async () => {
    await withTestTransaction(testDb, async (db) => {
      const created = await createPortfolio(db, 'user-1', { name: 'Old Name' })
      const updated = await updatePortfolio(db, created.id, 'user-1', {
        name: 'New Name',
      })
      expect(updated.name).toBe('New Name')
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const created = await createPortfolio(db, 'user-1', { name: 'Port A' })
      await expect(
        updatePortfolio(db, created.id, 'user-2', { name: 'Hacked' }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('deletePortfolio', () => {
  it('removes the portfolio', async () => {
    await withTestTransaction(testDb, async (db) => {
      const created = await createPortfolio(db, 'user-1', { name: 'To Delete' })
      await deletePortfolio(db, created.id, 'user-1')
      const result = await getUserPortfolios(db, 'user-1')
      expect(result).toHaveLength(0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const created = await createPortfolio(db, 'user-1', { name: 'Port A' })
      await expect(
        deletePortfolio(db, created.id, 'user-2'),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
