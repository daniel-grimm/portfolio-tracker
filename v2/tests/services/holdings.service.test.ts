import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount } from '../../server/src/services/accounts.js'
import {
  getHoldingsForAccount,
  getHoldingById,
  getAllHoldingsForUser,
  createHolding,
  updateHolding,
  deleteHolding,
  importHoldings,
} from '../../server/src/services/holdings.js'
import { NotFoundError, ForbiddenError } from '../../server/src/lib/errors.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

const MISSING_ID = '00000000-0000-0000-0000-000000000000'

const baseHolding = {
  ticker: 'AAPL',
  shares: '10',
  avgCostBasis: '150.00',
  purchaseDate: '2024-01-15',
}

describe('getHoldingsForAccount', () => {
  it('returns only holdings for the given account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a1 = await createAccount(db, p.id, 'user-1', { name: 'Acct A' })
      const a2 = await createAccount(db, p.id, 'user-1', { name: 'Acct B' })
      const h = await createHolding(db, a1.id, 'user-1', baseHolding)
      await createHolding(db, a2.id, 'user-1', { ...baseHolding, ticker: 'MSFT' })

      const result = await getHoldingsForAccount(db, a1.id, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(h.id)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await expect(getHoldingsForAccount(db, a.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  it('returns empty array when account has no holdings', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const result = await getHoldingsForAccount(db, a.id, 'user-1')
      expect(result).toEqual([])
    })
  })
})

describe('getHoldingById', () => {
  it('returns holding when userId matches via join', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const result = await getHoldingById(db, h.id, 'user-1')
      expect(result.id).toBe(h.id)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      await expect(getHoldingById(db, h.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  it('throws NotFoundError for missing id', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(getHoldingById(db, MISSING_ID, 'user-1')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('getAllHoldingsForUser', () => {
  it('returns only the requesting user holdings', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p1 = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a1 = await createAccount(db, p1.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a1.id, 'user-1', baseHolding)

      const p2 = await createPortfolio(db, 'user-2', { name: 'P2' })
      const a2 = await createAccount(db, p2.id, 'user-2', { name: 'Acct' })
      await createHolding(db, a2.id, 'user-2', { ...baseHolding, ticker: 'MSFT' })

      const result = await getAllHoldingsForUser(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })
  })

  it('aggregates same ticker across accounts correctly', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a1 = await createAccount(db, p.id, 'user-1', { name: 'A1' })
      const a2 = await createAccount(db, p.id, 'user-1', { name: 'A2' })
      await createHolding(db, a1.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '100',
        purchaseDate: '2024-01-01',
      })
      await createHolding(db, a2.id, 'user-1', {
        ticker: 'AAPL',
        shares: '20',
        avgCostBasis: '200',
        purchaseDate: '2024-06-01',
      })

      const result = await getAllHoldingsForUser(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
      expect(Number(result[0].totalShares)).toBeCloseTo(30)
      // weighted avg = (10*100 + 20*200) / 30 = 5000/30 ≈ 166.67
      expect(Number(result[0].weightedAvgCostBasis)).toBeCloseTo(166.67, 1)
      expect(result[0].holdings).toHaveLength(2)
    })
  })

  it('returns empty array for user with no holdings', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getAllHoldingsForUser(db, 'no-holdings-user')
      expect(result).toEqual([])
    })
  })
})

describe('createHolding', () => {
  it('inserts and returns holding with all fields', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const result = await createHolding(db, a.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10.5',
        avgCostBasis: '175.25',
        purchaseDate: '2024-03-15',
      })
      expect(result.id).toBeDefined()
      expect(result.accountId).toBe(a.id)
      expect(result.ticker).toBe('AAPL')
      expect(Number(result.shares)).toBeCloseTo(10.5)
      expect(result.purchaseDate).toBe('2024-03-15')
      expect(result.createdAt).toBeInstanceOf(Date)
    })
  })

  it('throws NotFoundError for another user account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await expect(createHolding(db, a.id, 'user-2', baseHolding)).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })
})

describe('updateHolding', () => {
  it('updates and returns the holding', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const updated = await updateHolding(db, h.id, 'user-1', { shares: '20' })
      expect(Number(updated.shares)).toBeCloseTo(20)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      await expect(updateHolding(db, h.id, 'user-2', { shares: '5' })).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })
})

describe('deleteHolding', () => {
  it('removes the holding', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      await deleteHolding(db, h.id, 'user-1')
      const result = await getHoldingsForAccount(db, a.id, 'user-1')
      expect(result).toHaveLength(0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      await expect(deleteHolding(db, h.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

describe('importHoldings', () => {
  const lots = [
    { ticker: 'AAPL', shares: '10', avgCostBasis: '150.00', purchaseDate: '2024-01-15' },
    { ticker: 'AAPL', shares: '5', avgCostBasis: '160.00', purchaseDate: '2024-06-01' },
    { ticker: 'MSFT', shares: '3', avgCostBasis: '300.00', purchaseDate: '2024-03-10' },
  ]

  it('inserts all lot rows and returns correct count', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const result = await importHoldings(db, a.id, 'user-1', lots)
      expect(result).toEqual({ imported: 3, skipped: 0 })
      const inserted = await getHoldingsForAccount(db, a.id, 'user-1')
      expect(inserted).toHaveLength(3)
    })
  })

  it('uppercases tickers on insert', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await importHoldings(db, a.id, 'user-1', [
        { ticker: 'schd', shares: '10', avgCostBasis: '25', purchaseDate: '2024-01-01' },
      ])
      const inserted = await getHoldingsForAccount(db, a.id, 'user-1')
      expect(inserted[0].ticker).toBe('SCHD')
    })
  })

  it('returns { imported: 0, skipped: 0 } for empty array', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const result = await importHoldings(db, a.id, 'user-1', [])
      expect(result).toEqual({ imported: 0, skipped: 0 })
    })
  })

  it('throws NotFoundError for missing accountId', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(importHoldings(db, MISSING_ID, 'user-1', lots)).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })

  it('throws ForbiddenError when account belongs to another user', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await expect(importHoldings(db, a.id, 'user-2', lots)).rejects.toBeInstanceOf(ForbiddenError)
    })
  })
})
