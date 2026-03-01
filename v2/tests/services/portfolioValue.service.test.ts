import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount, disableAccount } from '../../server/src/services/accounts.js'
import { createHolding } from '../../server/src/services/holdings.js'
import { savePrices } from '../../server/src/services/prices.js'
import {
  computePortfolioSnapshot,
  savePortfolioValueSnapshot,
  getPortfolioValueHistory,
} from '../../server/src/services/portfolioValue.js'
import { NotFoundError } from '../../server/src/lib/errors.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

const today = new Date().toISOString().slice(0, 10)

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ── computePortfolioSnapshot ──────────────────────────────────────────────────

describe('computePortfolioSnapshot', () => {
  it('returns totalValue and costBasis with isPartial=false when all prices available', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a1 = await createAccount(db, p.id, 'user-1', { name: 'A1' })
      const a2 = await createAccount(db, p.id, 'user-1', { name: 'A2' })
      // AAPL: 10 shares @ $150 cost, price $200 → value $2000, cost $1500
      await createHolding(db, a1.id, 'user-1', {
        ticker: 'SNAP_AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      // MSFT: 5 shares @ $300 cost, price $400 → value $2000, cost $1500
      await createHolding(db, a2.id, 'user-1', {
        ticker: 'SNAP_MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      await savePrices(db, [
        { ticker: 'SNAP_AAPL', date: today, closePrice: '200' },
        { ticker: 'SNAP_MSFT', date: today, closePrice: '400' },
      ])

      const snapshot = await computePortfolioSnapshot(db, p.id, 'user-1')
      // totalValue = 10*200 + 5*400 = 4000, costBasis = 10*150 + 5*300 = 3000
      expect(Number(snapshot.totalValue)).toBeCloseTo(4000)
      expect(Number(snapshot.costBasis)).toBeCloseTo(3000)
      expect(snapshot.isPartial).toBe(false)
    })
  })

  it('returns isPartial=true when some ticker prices are missing', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'A1' })
      await createHolding(db, a.id, 'user-1', {
        ticker: 'PARTIAL_AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      await createHolding(db, a.id, 'user-1', {
        ticker: 'PARTIAL_MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      // Only save price for one ticker
      await savePrices(db, [{ ticker: 'PARTIAL_AAPL', date: today, closePrice: '200' }])

      const snapshot = await computePortfolioSnapshot(db, p.id, 'user-1')
      expect(snapshot.isPartial).toBe(true)
    })
  })

  it('returns totalValue=0 and costBasis=0 for portfolio with no holdings', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'Empty' })

      const snapshot = await computePortfolioSnapshot(db, p.id, 'user-1')
      expect(Number(snapshot.totalValue)).toBe(0)
      expect(Number(snapshot.costBasis)).toBe(0)
      expect(snapshot.isPartial).toBe(false)
    })
  })

  it('throws NotFoundError for portfolio not owned by userId', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await expect(computePortfolioSnapshot(db, p.id, 'user-2')).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })

  it('excludes holdings from disabled accounts', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const active = await createAccount(db, p.id, 'user-1', { name: 'Active' })
      const disabled = await createAccount(db, p.id, 'user-1', { name: 'Disabled' })

      // Active account: 10 shares of SNAP_ACT @ cost $100, price $200 → value $2000
      await createHolding(db, active.id, 'user-1', {
        ticker: 'SNAP_ACT',
        shares: '10',
        avgCostBasis: '100',
        purchaseDate: '2024-01-01',
      })
      // Disabled account: 5 shares of SNAP_DIS @ cost $200, price $300 → value $1500 if included
      await createHolding(db, disabled.id, 'user-1', {
        ticker: 'SNAP_DIS',
        shares: '5',
        avgCostBasis: '200',
        purchaseDate: '2024-01-01',
      })

      await savePrices(db, [
        { ticker: 'SNAP_ACT', date: today, closePrice: '200' },
        { ticker: 'SNAP_DIS', date: today, closePrice: '300' },
      ])

      await disableAccount(db, disabled.id, 'user-1')

      const snapshot = await computePortfolioSnapshot(db, p.id, 'user-1')
      // Only active account: 10 * $200 = $2000
      expect(Number(snapshot.totalValue)).toBeCloseTo(2000)
      expect(Number(snapshot.costBasis)).toBeCloseTo(1000) // 10 * $100
      expect(snapshot.isPartial).toBe(false)
    })
  })
})

// ── savePortfolioValueSnapshot ────────────────────────────────────────────────

describe('savePortfolioValueSnapshot', () => {
  it('inserts a new snapshot row', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await savePortfolioValueSnapshot(db, p.id, today, {
        totalValue: '5000',
        costBasis: '4000',
        isPartial: false,
      })
      const history = await getPortfolioValueHistory(db, p.id, 'user-1', 'all')
      expect(history).toHaveLength(1)
      expect(Number(history[0].totalValue)).toBeCloseTo(5000)
    })
  })

  it('upserts — second call for same portfolio+date overwrites', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await savePortfolioValueSnapshot(db, p.id, today, {
        totalValue: '5000',
        costBasis: '4000',
        isPartial: false,
      })
      await savePortfolioValueSnapshot(db, p.id, today, {
        totalValue: '6000',
        costBasis: '4000',
        isPartial: false,
      })
      const history = await getPortfolioValueHistory(db, p.id, 'user-1', 'all')
      expect(history).toHaveLength(1)
      expect(Number(history[0].totalValue)).toBeCloseTo(6000)
    })
  })
})

// ── getPortfolioValueHistory ──────────────────────────────────────────────────

describe('getPortfolioValueHistory', () => {
  it('returns rows ordered by date ascending', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await savePortfolioValueSnapshot(db, p.id, daysAgo(5), {
        totalValue: '1000',
        costBasis: '900',
        isPartial: false,
      })
      await savePortfolioValueSnapshot(db, p.id, daysAgo(2), {
        totalValue: '1100',
        costBasis: '900',
        isPartial: false,
      })
      await savePortfolioValueSnapshot(db, p.id, today, {
        totalValue: '1200',
        costBasis: '900',
        isPartial: false,
      })

      const history = await getPortfolioValueHistory(db, p.id, 'user-1', 'all')
      expect(history).toHaveLength(3)
      expect(history[0].date).toBe(daysAgo(5))
      expect(history[2].date).toBe(today)
    })
  })

  it('respects date range filter — 1m excludes rows older than 30 days', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await savePortfolioValueSnapshot(db, p.id, daysAgo(45), {
        totalValue: '800',
        costBasis: '700',
        isPartial: false,
      })
      await savePortfolioValueSnapshot(db, p.id, daysAgo(10), {
        totalValue: '1000',
        costBasis: '900',
        isPartial: false,
      })

      const history = await getPortfolioValueHistory(db, p.id, 'user-1', '1m')
      expect(history).toHaveLength(1)
      expect(Number(history[0].totalValue)).toBeCloseTo(1000)
    })
  })

  it('returns all rows when range is "all"', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await savePortfolioValueSnapshot(db, p.id, daysAgo(400), {
        totalValue: '500',
        costBasis: '400',
        isPartial: false,
      })
      await savePortfolioValueSnapshot(db, p.id, today, {
        totalValue: '1000',
        costBasis: '800',
        isPartial: false,
      })

      const history = await getPortfolioValueHistory(db, p.id, 'user-1', 'all')
      expect(history).toHaveLength(2)
    })
  })

  it('verifies portfolio ownership — throws NotFoundError for wrong user', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      await expect(
        getPortfolioValueHistory(db, p.id, 'user-2', 'all'),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
