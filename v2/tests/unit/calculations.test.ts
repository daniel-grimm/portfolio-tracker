import { describe, it, expect } from 'vitest'
import {
  calculateTotalDividend,
  calculateYTDIncome,
  calculateAllTimeIncome,
  calculateAnnualizedIncome,
  calculateUnrealizedGainLoss,
  calculateReturnPercent,
  calculatePortfolioValue,
  calculatePortfolioCostBasis,
} from '../../server/src/services/calculations.js'
import { makeDividend, makeHolding } from '../helpers/factories.js'
import type { HoldingWithPrice } from 'shared/types.js'

const THIS_YEAR = new Date().getFullYear()
const LAST_YEAR = THIS_YEAR - 1

// ── calculateTotalDividend ────────────────────────────────────────────────────

describe('calculateTotalDividend', () => {
  it('whole numbers', () => {
    expect(calculateTotalDividend(2, 10)).toBe(20)
  })

  it('fractional shares', () => {
    expect(calculateTotalDividend(2, 10.5)).toBeCloseTo(21)
  })

  it('fractional amount', () => {
    expect(calculateTotalDividend(0.5, 10)).toBeCloseTo(5)
  })

  it('zero shares → 0', () => {
    expect(calculateTotalDividend(2, 0)).toBe(0)
  })

  it('zero amount → 0', () => {
    expect(calculateTotalDividend(0, 10)).toBe(0)
  })
})

// ── calculateYTDIncome ────────────────────────────────────────────────────────

describe('calculateYTDIncome', () => {
  it('empty → 0', () => {
    expect(calculateYTDIncome([])).toBe(0)
  })

  it('current-year paid is included', () => {
    const d = makeDividend({
      payDate: `${THIS_YEAR}-03-15`,
      totalAmount: '25.000000',
      status: 'paid',
    })
    expect(calculateYTDIncome([d])).toBeCloseTo(25)
  })

  it('excludes scheduled', () => {
    const d = makeDividend({
      payDate: `${THIS_YEAR}-06-15`,
      totalAmount: '25.000000',
      status: 'scheduled',
    })
    expect(calculateYTDIncome([d])).toBe(0)
  })

  it('excludes projected', () => {
    const d = makeDividend({
      payDate: `${THIS_YEAR}-06-15`,
      totalAmount: '25.000000',
      status: 'projected',
    })
    expect(calculateYTDIncome([d])).toBe(0)
  })

  it('excludes prior-year paid', () => {
    const d = makeDividend({
      payDate: `${LAST_YEAR}-12-15`,
      totalAmount: '25.000000',
      status: 'paid',
    })
    expect(calculateYTDIncome([d])).toBe(0)
  })

  it('sums multiple current-year paid dividends', () => {
    const dividends = [
      makeDividend({ payDate: `${THIS_YEAR}-01-15`, totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: `${THIS_YEAR}-04-15`, totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: `${THIS_YEAR}-07-15`, totalAmount: '10.000000', status: 'paid' }),
    ]
    expect(calculateYTDIncome(dividends)).toBeCloseTo(30)
  })
})

// ── calculateAllTimeIncome ────────────────────────────────────────────────────

describe('calculateAllTimeIncome', () => {
  it('empty → 0', () => {
    expect(calculateAllTimeIncome([])).toBe(0)
  })

  it('sums all paid dividends across years', () => {
    const dividends = [
      makeDividend({ payDate: '2022-01-15', totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: '2023-01-15', totalAmount: '20.000000', status: 'paid' }),
      makeDividend({ payDate: `${THIS_YEAR}-01-15`, totalAmount: '30.000000', status: 'paid' }),
    ]
    expect(calculateAllTimeIncome(dividends)).toBeCloseTo(60)
  })

  it('excludes non-paid (scheduled/projected)', () => {
    const dividends = [
      makeDividend({ payDate: '2023-01-15', totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: `${THIS_YEAR}-06-15`, totalAmount: '50.000000', status: 'scheduled' }),
      makeDividend({ payDate: `${THIS_YEAR}-09-15`, totalAmount: '50.000000', status: 'projected' }),
    ]
    expect(calculateAllTimeIncome(dividends)).toBeCloseTo(10)
  })
})

// ── calculateAnnualizedIncome ─────────────────────────────────────────────────

describe('calculateAnnualizedIncome', () => {
  it('empty → 0', () => {
    expect(calculateAnnualizedIncome([])).toBe(0)
  })

  it('quarterly payer — sums last 12 months of paid dividends', () => {
    const now = new Date()
    // Four payments spread over the last 11 months — all within trailing 12m window
    const dates = [-10, -7, -4, -1].map((offsetMonths) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 15)
      return d.toISOString().slice(0, 10)
    })
    const dividends = dates.map((payDate) =>
      makeDividend({ payDate, totalAmount: '10.000000', status: 'paid' }),
    )
    expect(calculateAnnualizedIncome(dividends)).toBeCloseTo(40)
  })
})

// ── calculateUnrealizedGainLoss ───────────────────────────────────────────────

describe('calculateUnrealizedGainLoss', () => {
  it('gain case: (currentPrice - avgCostBasis) × shares', () => {
    expect(calculateUnrealizedGainLoss(10, 100, 110)).toBeCloseTo(100)
  })

  it('loss case', () => {
    expect(calculateUnrealizedGainLoss(10, 100, 90)).toBeCloseTo(-100)
  })

  it('break-even → 0', () => {
    expect(calculateUnrealizedGainLoss(10, 100, 100)).toBe(0)
  })

  it('zero shares → 0', () => {
    expect(calculateUnrealizedGainLoss(0, 100, 110)).toBe(0)
  })
})

// ── calculateReturnPercent ────────────────────────────────────────────────────

describe('calculateReturnPercent', () => {
  it('positive return', () => {
    expect(calculateReturnPercent(10, 100, 110)).toBeCloseTo(10)
  })

  it('negative return', () => {
    expect(calculateReturnPercent(10, 100, 90)).toBeCloseTo(-10)
  })

  it('zero cost basis → 0 (no division by zero)', () => {
    expect(calculateReturnPercent(10, 0, 110)).toBe(0)
  })

  it('zero shares → 0', () => {
    expect(calculateReturnPercent(0, 100, 110)).toBe(0)
  })
})

// ── calculatePortfolioValue ───────────────────────────────────────────────────

describe('calculatePortfolioValue', () => {
  it('empty → 0', () => {
    expect(calculatePortfolioValue([])).toBe(0)
  })

  it('single holding', () => {
    const h: HoldingWithPrice = {
      ...makeHolding({ shares: '10.000000' }),
      currentPrice: '100.000000',
      priceDate: '2025-01-15',
    }
    expect(calculatePortfolioValue([h])).toBeCloseTo(1000)
  })

  it('multiple holdings summed', () => {
    const holdings: HoldingWithPrice[] = [
      { ...makeHolding({ shares: '10.000000' }), currentPrice: '100.000000', priceDate: '2025-01-15' },
      { ...makeHolding({ shares: '5.000000' }), currentPrice: '200.000000', priceDate: '2025-01-15' },
    ]
    expect(calculatePortfolioValue(holdings)).toBeCloseTo(2000)
  })

  it('holding with null currentPrice is excluded', () => {
    const h: HoldingWithPrice = {
      ...makeHolding({ shares: '10.000000' }),
      currentPrice: null,
      priceDate: null,
    }
    expect(calculatePortfolioValue([h])).toBe(0)
  })

  it('holding with zero shares contributes 0', () => {
    const h: HoldingWithPrice = {
      ...makeHolding({ shares: '0.000000' }),
      currentPrice: '100.000000',
      priceDate: '2025-01-15',
    }
    expect(calculatePortfolioValue([h])).toBe(0)
  })
})

// ── calculatePortfolioCostBasis ───────────────────────────────────────────────

describe('calculatePortfolioCostBasis', () => {
  it('empty → 0', () => {
    expect(calculatePortfolioCostBasis([])).toBe(0)
  })

  it('single holding', () => {
    const h = makeHolding({ shares: '10.000000', avgCostBasis: '100.000000' })
    expect(calculatePortfolioCostBasis([h])).toBeCloseTo(1000)
  })

  it('multiple holdings summed', () => {
    const holdings = [
      makeHolding({ shares: '10.000000', avgCostBasis: '100.000000' }),
      makeHolding({ shares: '5.000000', avgCostBasis: '200.000000' }),
    ]
    expect(calculatePortfolioCostBasis(holdings)).toBeCloseTo(2000)
  })
})
