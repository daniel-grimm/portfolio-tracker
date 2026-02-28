import { describe, it, expect } from 'vitest'
import {
  detectCadence,
  projectMonthlyIncome,
  buildDividendCalendar,
  blendedProjectionAmount,
  buildChartData,
  buildHoldingProjections,
  buildExcluded,
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

// ── blendedProjectionAmount ───────────────────────────────────────────────────

describe('blendedProjectionAmount', () => {
  const now = new Date()
  const makeDate = (monthOffset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 15)
    return d.toISOString().slice(0, 10)
  }

  it('empty dividends → 0', () => {
    expect(blendedProjectionAmount([])).toBe(0)
  })

  it('single paid payment → returns that amount', () => {
    const result = blendedProjectionAmount([
      makeDividend({ payDate: makeDate(-1), totalAmount: '10.000000', status: 'paid' }),
    ])
    expect(result).toBeCloseTo(10)
  })

  it('2 old payments (both > 12 months ago) → falls back to last paid amount', () => {
    const result = blendedProjectionAmount([
      makeDividend({ payDate: makeDate(-18), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-15), totalAmount: '11.000000', status: 'paid' }),
    ])
    // < 2 in last 12 months → fallback to last paid
    expect(result).toBeCloseTo(11)
  })

  it('4+ quarterly payments with YoY growth → uses blended formula', () => {
    const dividends = [
      makeDividend({ payDate: makeDate(-15), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-12), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-9), totalAmount: '10.500000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-6), totalAmount: '11.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-3), totalAmount: '11.500000', status: 'paid' }),
    ]
    const result = blendedProjectionAmount(dividends)
    // recentAvg of last 4 = (10 + 10.5 + 11 + 11.5) / 4 = 10.75
    // mostRecent = makeDate(-3): $11.5
    // yearAgo ≈ makeDate(-15): $10
    // rawGrowth = (11.5 - 10) / 10 = 0.15
    // cappedGrowth = 0.15
    // blended = 10.75 * (1 + 0.15 * 0.5) ≈ 11.556
    expect(result).toBeGreaterThan(10.75) // above plain average
    expect(result).toBeCloseTo(10.75 * (1 + 0.15 * 0.5), 1)
  })

  it('YoY growth exceeding +30% is capped at 30%', () => {
    const dividends = [
      makeDividend({ payDate: makeDate(-15), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-12), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-9), totalAmount: '14.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-6), totalAmount: '14.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-3), totalAmount: '14.000000', status: 'paid' }),
    ]
    const result = blendedProjectionAmount(dividends)
    // recentAvg of last 4 = (10 + 14 + 14 + 14) / 4 = 13
    // mostRecent = $14, yearAgo = $10, rawGrowth = 0.4 → capped at 0.3
    // blended = 13 * (1 + 0.3 * 0.5) = 13 * 1.15 = 14.95
    expect(result).toBeCloseTo(13 * 1.15, 1)
  })

  it('YoY decline exceeding -30% is capped at -30%', () => {
    const dividends = [
      makeDividend({ payDate: makeDate(-15), totalAmount: '20.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-12), totalAmount: '20.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-9), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-6), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-3), totalAmount: '10.000000', status: 'paid' }),
    ]
    const result = blendedProjectionAmount(dividends)
    // recentAvg of last 4 = (20 + 10 + 10 + 10) / 4 = 12.5
    // mostRecent = $10, yearAgo = $20, rawGrowth = -0.5 → capped at -0.3
    // blended = 12.5 * (1 + (-0.3) * 0.5) = 12.5 * 0.85 = 10.625
    expect(result).toBeCloseTo(12.5 * 0.85, 1)
  })

  it('monthly payers with no YoY data → returns recent average', () => {
    const dividends = [
      makeDividend({ payDate: makeDate(-4), totalAmount: '8.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-3), totalAmount: '9.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-2), totalAmount: '10.000000', status: 'paid' }),
      makeDividend({ payDate: makeDate(-1), totalAmount: '11.000000', status: 'paid' }),
    ]
    const result = blendedProjectionAmount(dividends)
    // All within last 12 months (4 → use blend)
    // recentAvg = (8+9+10+11)/4 = 9.5
    // mostRecent = -1 month, yearAgo = -13 months → no candidates within ±60 days
    // → returns recentAvg = 9.5
    expect(result).toBeCloseTo(9.5)
  })

  it('non-paid dividends are ignored', () => {
    const result = blendedProjectionAmount([
      makeDividend({ payDate: makeDate(-1), totalAmount: '10.000000', status: 'projected' }),
      makeDividend({ payDate: makeDate(-2), totalAmount: '10.000000', status: 'scheduled' }),
    ])
    expect(result).toBe(0)
  })
})

// ── buildChartData ────────────────────────────────────────────────────────────

describe('buildChartData', () => {
  const today = new Date(2025, 5, 15) // June 15, 2025

  it('returns exactly 24 entries', () => {
    const result = buildChartData([], today)
    expect(result).toHaveLength(24)
  })

  it('first 12 entries have isPast: true (months -11 through current)', () => {
    const result = buildChartData([], today)
    expect(result.slice(0, 12).every((m) => m.isPast)).toBe(true)
  })

  it('last 12 entries have isPast: false (next 12 months)', () => {
    const result = buildChartData([], today)
    expect(result.slice(12).every((m) => !m.isPast)).toBe(false || result.slice(12).every((m) => !m.isPast))
    expect(result.slice(12).every((m) => m.isPast === false)).toBe(true)
  })

  it('future entries have actual: null', () => {
    const result = buildChartData([], today)
    expect(result.slice(12).every((m) => m.actual === null)).toBe(true)
  })

  it('past entries have actual as a number (default 0)', () => {
    const result = buildChartData([], today)
    expect(result.slice(0, 12).every((m) => typeof m.actual === 'number')).toBe(true)
  })

  it('paid dividend in a past month appears in actual sum', () => {
    const d = makeDividend({ payDate: '2025-05-15', totalAmount: '100.000000', status: 'paid' })
    const result = buildChartData([d], today)
    const maySlot = result.find((m) => m.year === 2025 && m.month === 5)
    expect(maySlot).toBeDefined()
    expect(maySlot!.actual).toBeCloseTo(100)
  })

  it('paid dividend in past month appears in detail with status paid', () => {
    const d = makeDividend({ payDate: '2025-05-15', totalAmount: '100.000000', status: 'paid', ticker: 'VTI' })
    const result = buildChartData([d], today)
    const maySlot = result.find((m) => m.year === 2025 && m.month === 5)
    expect(maySlot!.detail.some((x) => x.status === 'paid' && x.ticker === 'VTI')).toBe(true)
  })

  it('future dividends (paid in future month) do not appear as actual', () => {
    const d = makeDividend({ payDate: '2025-08-15', totalAmount: '100.000000', status: 'paid' })
    const result = buildChartData([d], today)
    const augSlot = result.find((m) => m.year === 2025 && m.month === 8)
    expect(augSlot!.actual).toBeNull()
  })

  it('each entry has a detail array', () => {
    const result = buildChartData([], today)
    expect(result.every((m) => Array.isArray(m.detail))).toBe(true)
  })
})

// ── buildHoldingProjections ───────────────────────────────────────────────────

describe('buildHoldingProjections', () => {
  const today = new Date(2025, 5, 15) // June 15, 2025

  it('returns empty array for no dividends', () => {
    expect(buildHoldingProjections([], today)).toHaveLength(0)
  })

  it('excludes holding with only 1 paid dividend', () => {
    const result = buildHoldingProjections(
      [makeDividend({ payDate: '2025-05-15', totalAmount: '10.000000', status: 'paid' })],
      today,
    )
    expect(result).toHaveLength(0)
  })

  it('includes holding with 2 quarterly paid dividends', () => {
    const dividends = [
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2024-12-15', totalAmount: '50.000000', status: 'paid', accountName: 'Roth IRA' }),
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2025-03-15', totalAmount: '50.000000', status: 'paid', accountName: 'Roth IRA' }),
    ]
    const result = buildHoldingProjections(dividends, today)
    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe('VTI')
    expect(result[0].cadence).toBe('quarterly')
  })

  it('nextPayDate is after today', () => {
    const dividends = [
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2024-12-15', totalAmount: '50.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2025-03-15', totalAmount: '50.000000', status: 'paid', accountName: 'Roth' }),
    ]
    const result = buildHoldingProjections(dividends, today)
    expect(result.length).toBeGreaterThan(0)
    expect(new Date(result[0].nextPayDate) > today).toBe(true)
  })

  it('pctOfTotal sums to ~100 for multiple holdings', () => {
    const dividends = [
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2024-12-15', totalAmount: '100.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2025-03-15', totalAmount: '100.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'SCHD', payDate: '2024-12-15', totalAmount: '40.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'SCHD', payDate: '2025-03-15', totalAmount: '40.000000', status: 'paid', accountName: 'Roth' }),
    ]
    const result = buildHoldingProjections(dividends, today)
    expect(result).toHaveLength(2)
    const totalPct = result.reduce((sum, r) => sum + r.pctOfTotal, 0)
    expect(totalPct).toBeCloseTo(100)
  })

  it('sorted by projectedAnnual descending', () => {
    const dividends = [
      makeDividend({ accountId: 'acc1', ticker: 'SCHD', payDate: '2024-12-15', totalAmount: '40.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'SCHD', payDate: '2025-03-15', totalAmount: '40.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2024-12-15', totalAmount: '100.000000', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2025-03-15', totalAmount: '100.000000', status: 'paid', accountName: 'Roth' }),
    ]
    const result = buildHoldingProjections(dividends, today)
    expect(result[0].projectedAnnual).toBeGreaterThanOrEqual(result[1].projectedAnnual)
  })
})

// ── buildExcluded ─────────────────────────────────────────────────────────────

describe('buildExcluded', () => {
  it('holding with 1 paid dividend → included with count in reason', () => {
    const result = buildExcluded([
      makeDividend({ payDate: '2025-01-15', totalAmount: '10.000000', status: 'paid' }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].reason).toMatch(/1/)
  })

  it('holding with 0 paid dividends (only scheduled) → included with no-paid reason', () => {
    const result = buildExcluded([
      makeDividend({ payDate: '2025-07-15', totalAmount: '10.000000', status: 'scheduled' }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].reason.toLowerCase()).toMatch(/no paid/)
  })

  it('holding with 2+ paid dividends → not in excluded', () => {
    const result = buildExcluded([
      makeDividend({ payDate: '2024-10-15', status: 'paid' }),
      makeDividend({ payDate: '2025-01-15', status: 'paid' }),
    ])
    expect(result).toHaveLength(0)
  })

  it('two distinct holdings one excluded one not', () => {
    const dividends = [
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2024-12-15', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: '2025-03-15', status: 'paid', accountName: 'Roth' }),
      makeDividend({ accountId: 'acc1', ticker: 'SCHD', payDate: '2025-03-15', status: 'paid', accountName: 'Roth' }),
    ]
    const result = buildExcluded(dividends)
    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe('SCHD')
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
