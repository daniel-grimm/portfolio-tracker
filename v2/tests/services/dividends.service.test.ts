import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount } from '../../server/src/services/accounts.js'
import { createHolding } from '../../server/src/services/holdings.js'
import {
  createDividend,
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
  ticker: 'AAPL',
  amountPerShare: '0.50',
  exDate: '2024-01-10',
  payDate: '2024-01-15',
  recordDate: null,
  status: 'paid' as const,
}

// ── createDividend ─────────────────────────────────────────────────────────────

describe('createDividend', () => {
  it('auto-calculates totalAmount = amountPerShare × total shares for ticker', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', {
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'AAPL',
        amountPerShare: '0.50',
        exDate: '2024-01-10',
        payDate: '2024-01-15',
      })
      // totalAmount = 0.50 × 10 = 5.00
      expect(Number(d.totalAmount)).toBeCloseTo(5.0)
    })
  })

  it('sums across multiple lots for the same ticker', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', { ticker: 'AAPL', shares: '10', avgCostBasis: '150', purchaseDate: '2024-01-01' })
      await createHolding(db, a.id, 'user-1', { ticker: 'AAPL', shares: '5', avgCostBasis: '160', purchaseDate: '2024-02-01' })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'AAPL',
        amountPerShare: '1.00',
        exDate: '2024-03-10',
        payDate: '2024-03-15',
      })
      // totalAmount = 1.00 × (10 + 5) = 15.00
      expect(Number(d.totalAmount)).toBeCloseTo(15.0)
    })
  })

  it('stores the ticker from input', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', { ticker: 'MSFT', shares: '5', avgCostBasis: '300', purchaseDate: '2024-01-01' })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'MSFT',
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
      await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'AAPL',
        amountPerShare: '0.25',
        exDate: '2024-03-01',
        payDate: '2024-03-15',
      })
      expect(d.status).toBe('scheduled')
    })
  })

  it('throws NotFoundError for another user account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await expect(createDividend(db, a.id, 'user-2', baseDividend)).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })

  it('throws NotFoundError for missing accountId', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(
        createDividend(db, MISSING_ID, 'user-1', baseDividend),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

// ── getDividendsForAccount ────────────────────────────────────────────────────

describe('getDividendsForAccount', () => {
  it('returns dividends for the account', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', { ticker: 'AAPL', shares: '10', avgCostBasis: '150', purchaseDate: '2024-01-01' })
      await createHolding(db, a.id, 'user-1', { ticker: 'MSFT', shares: '5', avgCostBasis: '300', purchaseDate: '2024-01-01' })
      const d1 = await createDividend(db, a.id, 'user-1', { ...baseDividend, ticker: 'AAPL' })
      const d2 = await createDividend(db, a.id, 'user-1', { ...baseDividend, ticker: 'MSFT' })

      const result = await getDividendsForAccount(db, a.id, 'user-1')
      expect(result).toHaveLength(2)
      expect(result.map((d) => d.id)).toEqual(expect.arrayContaining([d1.id, d2.id]))
    })
  })

  it('returns empty array when account has no dividends', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })

      const result = await getDividendsForAccount(db, a.id, 'user-1')
      expect(result).toEqual([])
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
      await createHolding(db, a1.id, 'user-1', { ticker: 'AAPL', shares: '10', avgCostBasis: '150', purchaseDate: '2024-01-01' })
      await createHolding(db, a2.id, 'user-1', { ticker: 'MSFT', shares: '5', avgCostBasis: '300', purchaseDate: '2024-01-01' })
      await createDividend(db, a1.id, 'user-1', { ...baseDividend, ticker: 'AAPL' })
      await createDividend(db, a2.id, 'user-1', { ...baseDividend, ticker: 'MSFT' })

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
      await createHolding(db, a1.id, 'user-1', { ticker: 'AAPL', shares: '10', avgCostBasis: '150', purchaseDate: '2024-01-01' })
      await createDividend(db, a1.id, 'user-1', { ...baseDividend, ticker: 'AAPL' })

      const p2 = await createPortfolio(db, 'user-2', { name: 'P2' })
      const a2 = await createAccount(db, p2.id, 'user-2', { name: 'Acct' })
      await createHolding(db, a2.id, 'user-2', { ticker: 'MSFT', shares: '5', avgCostBasis: '300', purchaseDate: '2024-01-01' })
      await createDividend(db, a2.id, 'user-2', { ...baseDividend, ticker: 'MSFT' })

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
      await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, a.id, 'user-1', baseDividend)

      const updated = await updateDividend(db, d.id, 'user-1', { status: 'paid' })
      expect(updated.status).toBe('paid')
    })
  })

  it('recalculates totalAmount when amountPerShare is updated', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', { ticker: 'AAPL', shares: '10', avgCostBasis: '150', purchaseDate: '2024-01-01' })
      const d = await createDividend(db, a.id, 'user-1', { ...baseDividend, amountPerShare: '0.50' })
      const updated = await updateDividend(db, d.id, 'user-1', { amountPerShare: '1.00' })
      // totalAmount = 1.00 × 10 = 10.00
      expect(Number(updated.totalAmount)).toBeCloseTo(10.0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, a.id, 'user-1', baseDividend)

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
      await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, a.id, 'user-1', baseDividend)

      await deleteDividend(db, d.id, 'user-1')

      const remaining = await getDividendsForAccount(db, a.id, 'user-1')
      expect(remaining).toHaveLength(0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', baseHolding)
      const d = await createDividend(db, a.id, 'user-1', baseDividend)

      await expect(deleteDividend(db, d.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
