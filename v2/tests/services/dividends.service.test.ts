import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount } from '../../server/src/services/accounts.js'
import { createHolding } from '../../server/src/services/holdings.js'
import {
  createDividend,
  getDividendsForHolding,
  getDividendsForAccount,
  getDividendsForPortfolio,
  getAllDividendsForUser,
  updateDividend,
  deleteDividend,
} from '../../server/src/services/dividends.js'
import { NotFoundError } from '../../server/src/lib/errors.js'

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

const baseDividend = {
  amountPerShare: '0.50',
  exDate: '2024-01-10',
  payDate: '2024-01-15',
  recordDate: null,
  status: 'paid' as const,
}

// ── createDividend ─────────────────────────────────────────────────────────────

describe('createDividend', () => {
  it('auto-calculates totalAmount = amountPerShare × shares', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      const d = await createDividend(db, h.id, 'user-1', {
        amountPerShare: '0.50',
        exDate: '2024-01-10',
        payDate: '2024-01-15',
      })
      // totalAmount = 0.50 × 10 = 5.00
      expect(Number(d.totalAmount)).toBeCloseTo(5.0)
    })
  })

  it('uses ticker from the holding', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', {
        ticker: 'MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      const d = await createDividend(db, h.id, 'user-1', {
        amountPerShare: '1.00',
        exDate: '2024-01-10',
        payDate: '2024-01-15',
      })
      expect(d.ticker).toBe('MSFT')
    })
  })

  it('sets default status to scheduled when not provided', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, h.id, 'user-1', {
        amountPerShare: '0.25',
        exDate: '2024-03-01',
        payDate: '2024-03-15',
      })
      expect(d.status).toBe('scheduled')
    })
  })

  it('throws NotFoundError for another user holding', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      await expect(createDividend(db, h.id, 'user-2', baseDividend)).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })

  it('throws NotFoundError for missing holdingId', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(
        createDividend(db, MISSING_ID, 'user-1', baseDividend),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

// ── getDividendsForHolding ────────────────────────────────────────────────────

describe('getDividendsForHolding', () => {
  it('returns dividends when ownership matches', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, h.id, 'user-1', baseDividend)

      const result = await getDividendsForHolding(db, h.id, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(d.id)
    })
  })

  it('returns empty array when holding has no dividends', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)

      const result = await getDividendsForHolding(db, h.id, 'user-1')
      expect(result).toEqual([])
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)

      await expect(getDividendsForHolding(db, h.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

// ── getDividendsForAccount ────────────────────────────────────────────────────

describe('getDividendsForAccount', () => {
  it('returns dividends across all holdings in the account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h1 = await createHolding(db, a.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      const h2 = await createHolding(db, a.id, 'user-1', {
        ticker: 'MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      await createDividend(db, h1.id, 'user-1', baseDividend)
      await createDividend(db, h2.id, 'user-1', baseDividend)

      const result = await getDividendsForAccount(db, a.id, 'user-1')
      expect(result).toHaveLength(2)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })

      await expect(getDividendsForAccount(db, a.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

// ── getDividendsForPortfolio ──────────────────────────────────────────────────

describe('getDividendsForPortfolio', () => {
  it('returns dividends across all accounts in the portfolio', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a1 = await createAccount(db, p.id, 'user-1', { name: 'A1' })
      const a2 = await createAccount(db, p.id, 'user-1', { name: 'A2' })
      const h1 = await createHolding(db, a1.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      const h2 = await createHolding(db, a2.id, 'user-1', {
        ticker: 'MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      await createDividend(db, h1.id, 'user-1', baseDividend)
      await createDividend(db, h2.id, 'user-1', baseDividend)

      const result = await getDividendsForPortfolio(db, p.id, 'user-1')
      expect(result).toHaveLength(2)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await expect(getDividendsForPortfolio(db, p.id, 'user-2')).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })
})

// ── getAllDividendsForUser ─────────────────────────────────────────────────────

describe('getAllDividendsForUser', () => {
  it('returns only the requesting user dividends', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p1 = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a1 = await createAccount(db, p1.id, 'user-1', { name: 'Acct' })
      const h1 = await createHolding(db, a1.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      await createDividend(db, h1.id, 'user-1', baseDividend)

      const p2 = await createPortfolio(db, 'user-2', { name: 'P2' })
      const a2 = await createAccount(db, p2.id, 'user-2', { name: 'Acct' })
      const h2 = await createHolding(db, a2.id, 'user-2', {
        ticker: 'MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      await createDividend(db, h2.id, 'user-2', baseDividend)

      const result = await getAllDividendsForUser(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })
  })

  it('returns empty array for user with no dividends', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getAllDividendsForUser(db, 'no-dividends-user')
      expect(result).toEqual([])
    })
  })
})

// ── updateDividend ────────────────────────────────────────────────────────────

describe('updateDividend', () => {
  it('updates and returns the dividend', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, h.id, 'user-1', baseDividend)

      const updated = await updateDividend(db, d.id, 'user-1', { status: 'paid' })
      expect(updated.status).toBe('paid')
    })
  })

  it('recalculates totalAmount when amountPerShare is updated', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      const d = await createDividend(db, h.id, 'user-1', { ...baseDividend, amountPerShare: '0.50' })
      const updated = await updateDividend(db, d.id, 'user-1', { amountPerShare: '1.00' })
      // totalAmount = 1.00 × 10 = 10.00
      expect(Number(updated.totalAmount)).toBeCloseTo(10.0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, h.id, 'user-1', baseDividend)

      await expect(updateDividend(db, d.id, 'user-2', { status: 'paid' })).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })
})

// ── deleteDividend ────────────────────────────────────────────────────────────

describe('deleteDividend', () => {
  it('removes the dividend', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, h.id, 'user-1', baseDividend)

      await deleteDividend(db, d.id, 'user-1')

      const remaining = await getDividendsForHolding(db, h.id, 'user-1')
      expect(remaining).toHaveLength(0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const h = await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, h.id, 'user-1', baseDividend)

      await expect(deleteDividend(db, d.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
