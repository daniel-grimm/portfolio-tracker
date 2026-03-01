import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount } from '../../server/src/services/accounts.js'
import {
  createDividend,
  getDividendsForAccount,
  getDividendsForPortfolio,
  getAllDividendsForUser,
  getActiveDividendsForUser,
  updateDividend,
  deleteDividend,
} from '../../server/src/services/dividends.js'
import { disableAccount } from '../../server/src/services/accounts.js'
import { NotFoundError } from '../../server/src/lib/errors.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

const MISSING_ID = '00000000-0000-0000-0000-000000000000'

const baseDividend = {
  ticker: 'AAPL',
  amountPerShare: '0.50',
  totalAmount: '5.00',
  payDate: '2024-01-15',
  status: 'paid' as const,
}

// ── createDividend ─────────────────────────────────────────────────────────────

describe('createDividend', () => {
  it('stores totalAmount as provided by caller', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'AAPL',
        amountPerShare: '0.50',
        totalAmount: '7.50',
        payDate: '2024-01-15',
      })
      expect(Number(d.totalAmount)).toBeCloseTo(7.5)
    })
  })

  it('stores the ticker from input', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'MSFT',
        amountPerShare: '1.00',
        totalAmount: '15.00',
        payDate: '2024-01-15',
      })
      expect(d.ticker).toBe('MSFT')
    })
  })

  it('sets default status to scheduled when not provided', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'AAPL',
        amountPerShare: '0.25',
        totalAmount: '2.50',
        payDate: '2024-03-15',
      })
      expect(d.status).toBe('scheduled')
    })
  })

  it('stores projectedPerShare and projectedPayout when provided', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', {
        ticker: 'AAPL',
        amountPerShare: '0.00',
        totalAmount: '0.00',
        payDate: '2025-03-15',
        projectedPerShare: '0.55',
        projectedPayout: '8.25',
        status: 'projected',
      })
      expect(Number(d.projectedPerShare)).toBeCloseTo(0.55)
      expect(Number(d.projectedPayout)).toBeCloseTo(8.25)
      expect(d.status).toBe('projected')
    })
  })

  it('returns null projectedPerShare and projectedPayout when not provided', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', baseDividend)
      expect(d.projectedPerShare).toBeNull()
      expect(d.projectedPayout).toBeNull()
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
      await createDividend(db, a1.id, 'user-1', { ...baseDividend, ticker: 'AAPL' })

      const p2 = await createPortfolio(db, 'user-2', { name: 'P2' })
      const a2 = await createAccount(db, p2.id, 'user-2', { name: 'Acct' })
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

// ── getActiveDividendsForUser ──────────────────────────────────────────────────

describe('getActiveDividendsForUser', () => {
  it('excludes dividends from disabled accounts', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const active = await createAccount(db, p.id, 'user-1', { name: 'Active' })
      const disabled = await createAccount(db, p.id, 'user-1', { name: 'Disabled' })

      await createDividend(db, active.id, 'user-1', { ...baseDividend, ticker: 'AAPL' })
      await createDividend(db, disabled.id, 'user-1', { ...baseDividend, ticker: 'MSFT' })

      await disableAccount(db, disabled.id, 'user-1')

      const result = await getActiveDividendsForUser(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })
  })

  it('includes paid dividends from active accounts', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Active' })
      await createDividend(db, a.id, 'user-1', { ...baseDividend, ticker: 'VTI' })

      const result = await getActiveDividendsForUser(db, 'user-1')
      expect(result).toHaveLength(1)
    })
  })

  it('returns empty array for user with no active dividends', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getActiveDividendsForUser(db, 'no-active-user')
      expect(result).toEqual([])
    })
  })
})

// ── updateDividend ────────────────────────────────────────────────────────────

describe('updateDividend', () => {
  it('updates status and returns the dividend', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', { ...baseDividend, status: 'scheduled' })

      const updated = await updateDividend(db, d.id, 'user-1', { status: 'paid' })
      expect(updated.status).toBe('paid')
    })
  })

  it('updates totalAmount as provided (no auto-recalculation)', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', { ...baseDividend, totalAmount: '5.00' })
      const updated = await updateDividend(db, d.id, 'user-1', { totalAmount: '12.50' })
      expect(Number(updated.totalAmount)).toBeCloseTo(12.5)
    })
  })

  it('updates projectedPerShare and projectedPayout', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      const d = await createDividend(db, a.id, 'user-1', { ...baseDividend, status: 'projected' })
      const updated = await updateDividend(db, d.id, 'user-1', {
        projectedPerShare: '0.60',
        projectedPayout: '9.00',
      })
      expect(Number(updated.projectedPerShare)).toBeCloseTo(0.6)
      expect(Number(updated.projectedPayout)).toBeCloseTo(9.0)
    })
  })

  it('throws NotFoundError for wrong userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
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
      const d = await createDividend(db, a.id, 'user-1', baseDividend)

      await expect(deleteDividend(db, d.id, 'user-2')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
