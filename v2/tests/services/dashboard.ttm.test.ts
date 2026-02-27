import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount } from '../../server/src/services/accounts.js'
import { createDividend } from '../../server/src/services/dividends.js'
import { getTTMIncome } from '../../server/src/services/dashboard.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

// A date known to be within the TTM window
const IN_WINDOW = '2025-08-15'
// A date known to be outside the TTM window (before Mar 2025)
const OUT_OF_WINDOW = '2024-12-15'

describe('getTTMIncome', () => {
  it('returns exactly 12 months in ascending order', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-ttm-1', { name: 'P' })
      const data = await getTTMIncome(db, 'user-ttm-1')
      expect(data.months).toHaveLength(12)
      for (let i = 1; i < 12; i++) {
        const prev = data.months[i - 1]
        const curr = data.months[i]
        const prevKey = prev.year * 100 + prev.month
        const currKey = curr.year * 100 + curr.month
        expect(currKey).toBeGreaterThan(prevKey)
      }
    })
  })

  it('only includes paid dividends — excludes scheduled and projected', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-ttm-2', { name: 'P' })
      const a = await createAccount(db, p.id, 'user-ttm-2', { name: 'Acct' })
      await createDividend(db, a.id, 'user-ttm-2', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '10.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      await createDividend(db, a.id, 'user-ttm-2', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '50.00',
        payDate: IN_WINDOW, status: 'scheduled',
      })
      await createDividend(db, a.id, 'user-ttm-2', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '50.00',
        payDate: IN_WINDOW, status: 'projected',
      })
      const data = await getTTMIncome(db, 'user-ttm-2')
      const total = data.months.reduce((s, m) => s + m.total, 0)
      expect(total).toBeCloseTo(10)
    })
  })

  it('groups correctly across two accounts in the same month', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-ttm-3', { name: 'P' })
      const a1 = await createAccount(db, p.id, 'user-ttm-3', { name: 'Roth' })
      const a2 = await createAccount(db, p.id, 'user-ttm-3', { name: 'Taxable' })
      await createDividend(db, a1.id, 'user-ttm-3', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '20.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      await createDividend(db, a2.id, 'user-ttm-3', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '30.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      const data = await getTTMIncome(db, 'user-ttm-3')
      const month = data.months.find((m) => m.month === 8 && m.year === 2025)
      expect(month).toBeDefined()
      expect(month!.total).toBeCloseTo(50)
      expect(month!.byAccount).toHaveLength(2)
      const roth = month!.byAccount.find((a) => a.accountName === 'Roth')
      const taxable = month!.byAccount.find((a) => a.accountName === 'Taxable')
      expect(roth!.income).toBeCloseTo(20)
      expect(taxable!.income).toBeCloseTo(30)
    })
  })

  it('fills months with no dividends for an account with income: 0', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-ttm-4', { name: 'P' })
      const a = await createAccount(db, p.id, 'user-ttm-4', { name: 'Acct' })
      // Only one dividend in August — other months should have 0
      await createDividend(db, a.id, 'user-ttm-4', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '10.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      const data = await getTTMIncome(db, 'user-ttm-4')
      const emptyMonths = data.months.filter((m) => m.total === 0)
      expect(emptyMonths.length).toBe(11)
      const [acct] = data.accounts
      for (const m of emptyMonths) {
        const byAcct = m.byAccount.find((a) => a.accountId === acct.accountId)
        expect(byAcct!.income).toBe(0)
      }
    })
  })

  it('excludes dividends older than the TTM window', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-ttm-5', { name: 'P' })
      const a = await createAccount(db, p.id, 'user-ttm-5', { name: 'Acct' })
      await createDividend(db, a.id, 'user-ttm-5', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '999.00',
        payDate: OUT_OF_WINDOW, status: 'paid',
      })
      const data = await getTTMIncome(db, 'user-ttm-5')
      const total = data.months.reduce((s, m) => s + m.total, 0)
      expect(total).toBe(0)
    })
  })

  it('isolates data by user — does not return another user\'s dividends', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'other-user', { name: 'P' })
      const a = await createAccount(db, p.id, 'other-user', { name: 'Acct' })
      await createDividend(db, a.id, 'other-user', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '500.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      const data = await getTTMIncome(db, 'requesting-user')
      const total = data.months.reduce((s, m) => s + m.total, 0)
      expect(total).toBe(0)
    })
  })

  it('accounts array contains exactly the distinct accounts in the data', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-ttm-6', { name: 'P' })
      const a1 = await createAccount(db, p.id, 'user-ttm-6', { name: 'Alpha' })
      const a2 = await createAccount(db, p.id, 'user-ttm-6', { name: 'Beta' })
      await createDividend(db, a1.id, 'user-ttm-6', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '10.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      await createDividend(db, a2.id, 'user-ttm-6', {
        ticker: 'VTI', amountPerShare: '1.00', totalAmount: '10.00',
        payDate: IN_WINDOW, status: 'paid',
      })
      const data = await getTTMIncome(db, 'user-ttm-6')
      expect(data.accounts).toHaveLength(2)
      const names = data.accounts.map((a) => a.accountName).sort()
      expect(names).toEqual(['Alpha', 'Beta'])
    })
  })
})
