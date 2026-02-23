import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio } from '../../server/src/services/portfolios.js'
import { createAccount } from '../../server/src/services/accounts.js'
import { createHolding } from '../../server/src/services/holdings.js'
import {
  getTodaysPriceForTicker,
  getLatestPriceForTicker,
  getLatestPricesForTickers,
  savePrices,
  getTickersNeedingPriceUpdate,
} from '../../server/src/services/prices.js'

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

// ── getTodaysPriceForTicker ───────────────────────────────────────────────────

describe('getTodaysPriceForTicker', () => {
  it('returns the price row when one exists for today', async () => {
    await withTestTransaction(testDb, async (db) => {
      await savePrices(db, [{ ticker: 'AAPL', date: today, closePrice: '200.00' }])
      const result = await getTodaysPriceForTicker(db, 'AAPL')
      expect(result).not.toBeNull()
      expect(result!.ticker).toBe('AAPL')
      expect(Number(result!.closePrice)).toBeCloseTo(200)
    })
  })

  it('returns null when no price exists for today', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getTodaysPriceForTicker(db, 'UNKNOWN_TICKER')
      expect(result).toBeNull()
    })
  })

  it('returns null when price exists for a past date but not today', async () => {
    await withTestTransaction(testDb, async (db) => {
      await savePrices(db, [{ ticker: 'MSFT', date: daysAgo(5), closePrice: '300.00' }])
      const result = await getTodaysPriceForTicker(db, 'MSFT')
      expect(result).toBeNull()
    })
  })
})

// ── getLatestPriceForTicker ───────────────────────────────────────────────────

describe('getLatestPriceForTicker', () => {
  it('returns the most recent price row regardless of date', async () => {
    await withTestTransaction(testDb, async (db) => {
      await savePrices(db, [
        { ticker: 'GOOG', date: daysAgo(10), closePrice: '140.00' },
        { ticker: 'GOOG', date: daysAgo(3), closePrice: '150.00' },
        { ticker: 'GOOG', date: daysAgo(7), closePrice: '145.00' },
      ])
      const result = await getLatestPriceForTicker(db, 'GOOG')
      expect(result).not.toBeNull()
      expect(Number(result!.closePrice)).toBeCloseTo(150)
      expect(result!.date).toBe(daysAgo(3))
    })
  })

  it('returns null for unknown ticker', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getLatestPriceForTicker(db, 'ZZZNOPE')
      expect(result).toBeNull()
    })
  })
})

// ── getLatestPricesForTickers ─────────────────────────────────────────────────

describe('getLatestPricesForTickers', () => {
  it('returns a map with latest price for each known ticker', async () => {
    await withTestTransaction(testDb, async (db) => {
      await savePrices(db, [
        { ticker: 'VTI', date: daysAgo(2), closePrice: '230.00' },
        { ticker: 'BND', date: daysAgo(1), closePrice: '75.00' },
      ])
      const result = await getLatestPricesForTickers(db, ['VTI', 'BND'])
      expect(result.size).toBe(2)
      expect(Number(result.get('VTI')!.closePrice)).toBeCloseTo(230)
      expect(Number(result.get('BND')!.closePrice)).toBeCloseTo(75)
    })
  })

  it('returns null for unknown tickers', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getLatestPricesForTickers(db, ['VTI', 'UNKNOWN'])
      await savePrices(db, [{ ticker: 'VTI', date: today, closePrice: '230.00' }])
      const result2 = await getLatestPricesForTickers(db, ['VTI', 'UNKNOWN'])
      expect(result.get('UNKNOWN')).toBeNull()
      expect(result2.get('UNKNOWN')).toBeNull()
      expect(result2.get('VTI')).not.toBeNull()
    })
  })

  it('returns empty map for empty tickers array', async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getLatestPricesForTickers(db, [])
      expect(result.size).toBe(0)
    })
  })
})

// ── savePrices ────────────────────────────────────────────────────────────────

describe('savePrices', () => {
  it('inserts new price rows correctly', async () => {
    await withTestTransaction(testDb, async (db) => {
      await savePrices(db, [
        { ticker: 'TSLA', date: today, closePrice: '250.00' },
        { ticker: 'NVDA', date: today, closePrice: '800.00' },
      ])
      const tsla = await getLatestPriceForTicker(db, 'TSLA')
      const nvda = await getLatestPriceForTicker(db, 'NVDA')
      expect(Number(tsla!.closePrice)).toBeCloseTo(250)
      expect(Number(nvda!.closePrice)).toBeCloseTo(800)
    })
  })

  it('does not error on duplicate (ticker, date) — upserts instead', async () => {
    await withTestTransaction(testDb, async (db) => {
      await savePrices(db, [{ ticker: 'AMD', date: today, closePrice: '180.00' }])
      // Save again with different price — should overwrite, not error
      await savePrices(db, [{ ticker: 'AMD', date: today, closePrice: '185.00' }])
      const result = await getTodaysPriceForTicker(db, 'AMD')
      expect(Number(result!.closePrice)).toBeCloseTo(185)
    })
  })

  it('is a no-op for empty array', async () => {
    await withTestTransaction(testDb, async (db) => {
      await expect(savePrices(db, [])).resolves.toBeUndefined()
    })
  })
})

// ── getTickersNeedingPriceUpdate ──────────────────────────────────────────────

describe('getTickersNeedingPriceUpdate', () => {
  it('returns tickers from holdings that have no price_history row for today', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', {
        ticker: 'TICKERS_AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      await createHolding(db, a.id, 'user-1', {
        ticker: 'TICKERS_MSFT',
        shares: '5',
        avgCostBasis: '300',
        purchaseDate: '2024-01-01',
      })
      // Save price for one of them
      await savePrices(db, [{ ticker: 'TICKERS_AAPL', date: today, closePrice: '200.00' }])

      const result = await getTickersNeedingPriceUpdate(db)
      expect(result).toContain('TICKERS_MSFT')
      expect(result).not.toContain('TICKERS_AAPL')
    })
  })

  it('returns empty array when all tickers already have today prices', async () => {
    await withTestTransaction(testDb, async (db) => {
      const p = await createPortfolio(db, 'user-1', { name: 'P1' })
      const a = await createAccount(db, p.id, 'user-1', { name: 'Acct' })
      await createHolding(db, a.id, 'user-1', {
        ticker: 'TICKER_PRICED',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-01',
      })
      await savePrices(db, [{ ticker: 'TICKER_PRICED', date: today, closePrice: '200.00' }])

      const result = await getTickersNeedingPriceUpdate(db)
      expect(result).not.toContain('TICKER_PRICED')
    })
  })
})
