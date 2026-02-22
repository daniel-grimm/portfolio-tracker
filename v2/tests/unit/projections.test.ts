import { describe, it, expect } from 'vitest'
import {
  detectCadence,
  projectMonthlyIncome,
  buildDividendCalendar,
} from '../../server/src/services/projections.js'
import { makeDividend } from '../helpers/factories.js'

// ── detectCadence ─────────────────────────────────────────────────────────────

describe('detectCadence', () => {
  it('< 2 dates → unknown', () => {
    expect(detectCadence([])).toBe('unknown')
    expect(detectCadence(['2024-01-15'])).toBe('unknown')
  })

  it('quarterly dates → quarterly', () => {
    const dates = ['2024-01-15', '2024-04-15', '2024-07-15', '2024-10-15']
    expect(detectCadence(dates)).toBe('quarterly')
  })

  it('monthly dates → monthly', () => {
    const dates = ['2024-01-15', '2024-02-15', '2024-03-15', '2024-04-15']
    expect(detectCadence(dates)).toBe('monthly')
  })

  it('annual dates → annual', () => {
    const dates = ['2022-01-15', '2023-01-15', '2024-01-15']
    expect(detectCadence(dates)).toBe('annual')
  })

  it('irregular gaps → irregular', () => {
    const dates = ['2024-01-15', '2024-03-01', '2024-09-15']
    expect(detectCadence(dates)).toBe('irregular')
  })
})

// ── projectMonthlyIncome ──────────────────────────────────────────────────────

describe('projectMonthlyIncome', () => {
  it('length equals monthsForward', () => {
    const result = projectMonthlyIncome([], 12)
    expect(result).toHaveLength(12)
  })

  it('no history → all $0', () => {
    const result = projectMonthlyIncome([], 6)
    expect(result.every((p) => p.projectedIncome === 0)).toBe(true)
  })

  it('< 2 dividends → all $0', () => {
    const result = projectMonthlyIncome(
      [makeDividend({ status: 'paid', payDate: '2024-01-15' })],
      6,
    )
    expect(result.every((p) => p.projectedIncome === 0)).toBe(true)
  })

  it('quarterly payer projects income into correct months', () => {
    const holdingId = 'holding-1'
    // Last payment was 3 months ago → next one should fall in month index 0 (next month)
    const now = new Date()
    const makeDate = (monthOffset: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 15)
      return d.toISOString().slice(0, 10)
    }
    const dividends = [
      makeDividend({ holdingId, payDate: makeDate(-9), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ holdingId, payDate: makeDate(-6), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ holdingId, payDate: makeDate(-3), totalAmount: '10.000000', status: 'paid' }),
    ]
    const result = projectMonthlyIncome(dividends, 12)
    // Should have at least some non-zero months
    const nonZero = result.filter((p) => p.projectedIncome > 0)
    expect(nonZero.length).toBeGreaterThan(0)
    // Each projected month should have $10
    for (const p of nonZero) {
      expect(p.projectedIncome).toBeCloseTo(10)
    }
  })

  it('no double-counting when scheduled dividend already exists for that month', () => {
    const holdingId = 'holding-2'
    const now = new Date()
    const makeDate = (monthOffset: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 15)
      return d.toISOString().slice(0, 10)
    }
    // Paid history establishing quarterly cadence
    const paid = [
      makeDividend({ holdingId, payDate: makeDate(-6), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ holdingId, payDate: makeDate(-3), totalAmount: '10.000000', status: 'paid' }),
    ]
    // Scheduled dividend 3 months from now (same month the projection would land)
    const scheduled = makeDividend({
      holdingId,
      payDate: makeDate(3),
      totalAmount: '10.000000',
      status: 'scheduled',
    })
    const result = projectMonthlyIncome([...paid, scheduled], 12)
    // The month with the scheduled dividend should not have a projected entry on top
    const scheduledMonth = new Date(scheduled.payDate).getMonth() + 1
    const scheduledYear = new Date(scheduled.payDate).getFullYear()
    const match = result.find(
      (p) => p.month === scheduledMonth && p.year === scheduledYear,
    )
    // projectedIncome should be 0 for that month because a scheduled one exists
    if (match) {
      expect(match.projectedIncome).toBe(0)
    }
  })

  it('monthly payer projects income every month', () => {
    const holdingId = 'holding-3'
    const now = new Date()
    const makeDate = (monthOffset: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 15)
      return d.toISOString().slice(0, 10)
    }
    const dividends = [
      makeDividend({ holdingId, payDate: makeDate(-3), totalAmount: '5.000000', status: 'paid' }),
      makeDividend({ holdingId, payDate: makeDate(-2), totalAmount: '5.000000', status: 'paid' }),
      makeDividend({ holdingId, payDate: makeDate(-1), totalAmount: '5.000000', status: 'paid' }),
    ]
    const result = projectMonthlyIncome(dividends, 6)
    const nonZero = result.filter((p) => p.projectedIncome > 0)
    // All 6 future months should have projected income
    expect(nonZero.length).toBe(6)
    for (const p of nonZero) {
      expect(p.projectedIncome).toBeCloseTo(5)
    }
  })
})

// ── buildDividendCalendar ─────────────────────────────────────────────────────

describe('buildDividendCalendar', () => {
  it('empty → []', () => {
    expect(buildDividendCalendar([], 2024, 1)).toEqual([])
  })

  it('out-of-month dividends excluded', () => {
    const d = makeDividend({ payDate: '2024-02-15' })
    expect(buildDividendCalendar([d], 2024, 1)).toEqual([])
  })

  it('correct day assignment', () => {
    const d = makeDividend({ payDate: '2024-01-15' })
    const result = buildDividendCalendar([d], 2024, 1)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2024-01-15')
  })

  it('same-day grouping', () => {
    const d1 = makeDividend({ payDate: '2024-01-15', ticker: 'VTI' })
    const d2 = makeDividend({ payDate: '2024-01-15', ticker: 'VXUS' })
    const result = buildDividendCalendar([d1, d2], 2024, 1)
    expect(result).toHaveLength(1)
    expect(result[0].dividends).toHaveLength(2)
  })

  it('different days produce separate entries', () => {
    const d1 = makeDividend({ payDate: '2024-01-10' })
    const d2 = makeDividend({ payDate: '2024-01-20' })
    const result = buildDividendCalendar([d1, d2], 2024, 1)
    expect(result).toHaveLength(2)
    const dates = result.map((r) => r.date).sort()
    expect(dates).toEqual(['2024-01-10', '2024-01-20'])
  })
})
