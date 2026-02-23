import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import {
  getAccountsForPortfolio,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../../server/src/services/accounts.js'
import { NotFoundError } from '../../server/src/lib/errors.js'
import { holdings } from '../../server/src/db/schema.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

const MISSING_ID = '00000000-0000-0000-0000-000000000000'

describe('getAccountsForPortfolio', () => {
  it('returns only accounts for the given portfolio', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p1 = await createPortfolio(db, 'user-1', { name: 'P1' })
      const p2 = await createPortfolio(db, 'user-1', { name: 'P2' })
      const a = await createAccount(db, p1.id, 'user-1', { name: 'Acct A' })
      await createAccount(db, p2.id, 'user-1', { name: 'Acct B' })

      const result = await getAccountsForPortfolio(db, p1.id, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(a.id)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await expect(
        getAccountsForPortfolio(db, p.id, 'user-2'),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  it('returns empty array when portfolio has no accounts', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const result = await getAccountsForPortfolio(db, p.id, 'user-1')
      expect(result).toEqual([])
    })
  })
})

describe('getAccountById', () => {
  it('returns account when userId matches via join', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct A' })
      const result = await getAccountById(db, a.id, 'user-1')
      expect(result.id).toBe(a.id)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct A' })
      await expect(getAccountById(db, a.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  it('throws NotFoundError for missing id', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(getAccountById(db, MISSING_ID, 'user-1')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('createAccount', () => {
  it('inserts and returns account with all fields', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const result = await createAccount(db, p.id, 'user-1', {
        name: 'Roth IRA',
        description: 'My Roth',
      })
      expect(result.id).toBeDefined()
      expect(result.portfolioId).toBe(p.id)
      expect(result.name).toBe('Roth IRA')
      expect(result.description).toBe('My Roth')
      expect(result.createdAt).toBeInstanceOf(Date)
    })
  })

  it('sets null description when not provided', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const result = await createAccount(db, p.id, 'user-1', { name: 'No Desc' })
      expect(result.description).toBeNull()
    })
  })

  it('throws NotFoundError for another user portfolio', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await expect(
        createAccount(db, p.id, 'user-2', { name: 'Acct' }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('updateAccount', () => {
  it('updates and returns the account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Old Name' })
      const updated = await updateAccount(db, a.id, 'user-1', { name: 'New Name' })
      expect(updated.name).toBe('New Name')
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await expect(
        updateAccount(db, a.id, 'user-2', { name: 'Hacked' }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('deleteAccount', () => {
  it('removes the account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'To Delete' })
      await deleteAccount(db, a.id, 'user-1')
      const result = await getAccountsForPortfolio(db, p.id, 'user-1')
      expect(result).toHaveLength(0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await expect(deleteAccount(db, a.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  it('cascades — holdings removed when account deleted', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await db.insert(holdings).values({
        accountId: a.id,
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      await deleteAccount(db, a.id, 'user-1')
      const remaining = await db.select().from(holdings)
      expect(remaining).toHaveLength(0)
    })
  })
})
