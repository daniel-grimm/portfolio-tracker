// Pure projection functions — no DB, no async, no Express imports.
import type {
  Dividend,
  DividendWithAccount,
  MonthlyProjection,
  CalendarDay,
  ProjectionChartMonth,
  ProjectionMonthDetail,
  HoldingProjection,
  ExcludedHolding,
} from 'shared'

export type Cadence = 'monthly' | 'quarterly' | 'annual' | 'irregular' | 'unknown'

export function detectCadence(payDates: string[]): Cadence {
  if (payDates.length < 2) return 'unknown'

  const sorted = [...payDates].sort()
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const days = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    gaps.push(days)
  }

  const near = (val: number, target: number, tol: number) =>
    Math.abs(val - target) <= tol

  if (gaps.every((g) => near(g, 30, 5))) return 'monthly'
  if (gaps.every((g) => near(g, 91, 15))) return 'quarterly'
  if (gaps.every((g) => near(g, 365, 30))) return 'annual'
  return 'irregular'
}

// Parse a YYYY-MM-DD string and return { year, month (1-based) }
function parseYearMonth(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split('-').map(Number)
  return { year, month }
}

export function projectMonthlyIncome(
  dividends: Dividend[],
  monthsForward: number,
): MonthlyProjection[] {
  const now = new Date()

  // Build future month slots starting from next month
  const slots: MonthlyProjection[] = Array.from({ length: monthsForward }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1, projectedIncome: 0 }
  })

  if (dividends.length < 2) return slots

  // Group by accountId + ticker
  const byHolding = new Map<string, Dividend[]>()
  for (const d of dividends) {
    const key = `${d.accountId}:${d.ticker}`
    const group = byHolding.get(key) ?? []
    group.push(d)
    byHolding.set(key, group)
  }

  for (const [, group] of byHolding) {
    const paid = group
      .filter((d) => d.status === 'paid')
      .sort((a, b) => a.payDate.localeCompare(b.payDate))

    if (paid.length < 2) continue

    const cadence = detectCadence(paid.map((d) => d.payDate))
    if (cadence === 'unknown' || cadence === 'irregular') continue

    const cadenceMonths = cadence === 'monthly' ? 1 : cadence === 'quarterly' ? 3 : 12

    const lastPaid = paid[paid.length - 1]
    const lastAmount = parseFloat(lastPaid.totalAmount)
    const { year: lastYear, month: lastMonth } = parseYearMonth(lastPaid.payDate)
    const lastAbsMonth = lastYear * 12 + (lastMonth - 1)

    // Build a set of months that already have scheduled/projected dividends for this holding
    const existingMonths = new Set<string>()
    for (const d of group) {
      if (d.status === 'scheduled' || d.status === 'projected') {
        const { year, month } = parseYearMonth(d.payDate)
        existingMonths.add(`${year}-${month}`)
      }
    }

    for (const slot of slots) {
      if (existingMonths.has(`${slot.year}-${slot.month}`)) continue

      const slotAbsMonth = slot.year * 12 + (slot.month - 1)
      const diff = slotAbsMonth - lastAbsMonth
      if (diff > 0 && diff % cadenceMonths === 0) {
        slot.projectedIncome += lastAmount
      }
    }
  }

  return slots
}

// ── blendedProjectionAmount ───────────────────────────────────────────────────

/**
 * Estimate the next payout amount for a holding using a blend of recent average
 * and YoY growth trend.  Input should be all dividends for a single holding
 * (accountId + ticker).  Only paid dividends are used in the calculation.
 */
export function blendedProjectionAmount(dividends: Dividend[]): number {
  const paid = dividends
    .filter((d) => d.status === 'paid')
    .sort((a, b) => a.payDate.localeCompare(b.payDate))

  if (paid.length === 0) return 0
  if (paid.length === 1) return parseFloat(paid[0].totalAmount)

  // Fallback: if fewer than 2 payouts in the last 12 months, use last paid amount
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const recentCount = paid.filter((d) => new Date(d.payDate) >= twelveMonthsAgo).length
  if (recentCount < 2) {
    return parseFloat(paid[paid.length - 1].totalAmount)
  }

  // Recent average: last 3–4 paid dividends
  const lastFour = paid.slice(-4)
  const recentAvg =
    lastFour.reduce((sum, d) => sum + parseFloat(d.totalAmount), 0) / lastFour.length

  // YoY growth: compare most recent payment to payment ~1 year ago (±60 days)
  const mostRecent = paid[paid.length - 1]
  const yearAgoTarget = new Date(mostRecent.payDate)
  yearAgoTarget.setFullYear(yearAgoTarget.getFullYear() - 1)
  const yearAgoMs = yearAgoTarget.getTime()
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000

  const candidates = paid.filter(
    (d) => Math.abs(new Date(d.payDate).getTime() - yearAgoMs) <= sixtyDaysMs,
  )
  if (candidates.length === 0) return recentAvg

  const yearAgoPmt = candidates.reduce((best, d) =>
    Math.abs(new Date(d.payDate).getTime() - yearAgoMs) <
    Math.abs(new Date(best.payDate).getTime() - yearAgoMs)
      ? d
      : best,
  )

  const yearAgoAmount = parseFloat(yearAgoPmt.totalAmount)
  if (yearAgoAmount === 0) return recentAvg

  const rawGrowth = (parseFloat(mostRecent.totalAmount) - yearAgoAmount) / yearAgoAmount
  const cappedGrowth = Math.max(-0.3, Math.min(0.3, rawGrowth))

  return recentAvg * (1 + cappedGrowth * 0.5)
}

// ── buildChartData ────────────────────────────────────────────────────────────

/**
 * Build 24 ProjectionChartMonth entries: 12 past months (isPast: true) then
 * 12 future months (isPast: false).  The current month is treated as "past".
 *
 * - actual:    sum of paid dividends for that month (null for future months)
 * - projected: for future months, blended projection; for past months, what
 *              the simple last-paid + cadence model would have predicted
 * - detail:    per-holding breakdown (paid entries for past, projected for future)
 */
export function buildChartData(dividends: DividendWithAccount[], today: Date): ProjectionChartMonth[] {
  // Build 24 slots: months -11 through +12 relative to today's month
  const slots: ProjectionChartMonth[] = []
  for (let i = -11; i <= 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const isPast = i <= 0
    slots.push({ year, month, actual: isPast ? 0 : null, projected: 0, isPast, detail: [] })
  }

  // Group dividends by accountId + ticker
  const byHolding = new Map<string, DividendWithAccount[]>()
  for (const d of dividends) {
    const key = `${d.accountId}:${d.ticker}`
    const arr = byHolding.get(key) ?? []
    arr.push(d)
    byHolding.set(key, arr)
  }

  // Fill actuals for past months from paid dividends
  for (const d of dividends) {
    if (d.status !== 'paid') continue
    const { year: y, month: m } = parseYearMonth(d.payDate)
    const slot = slots.find((s) => s.year === y && s.month === m && s.isPast)
    if (slot) {
      slot.actual = (slot.actual ?? 0) + parseFloat(d.totalAmount)
      slot.detail.push({
        ticker: d.ticker,
        accountName: d.accountName,
        amount: parseFloat(d.totalAmount),
        status: 'paid',
      })
    }
  }

  // Compute projected values for each slot per holding
  for (const [, group] of byHolding) {
    const ticker = group[0].ticker
    const accountName = group[0].accountName
    const paid = group
      .filter((d) => d.status === 'paid')
      .sort((a, b) => a.payDate.localeCompare(b.payDate))

    if (paid.length < 2) continue

    const cadenceAll = detectCadence(paid.map((d) => d.payDate))
    if (cadenceAll === 'unknown' || cadenceAll === 'irregular') continue

    const cadenceMonths = cadenceAll === 'monthly' ? 1 : cadenceAll === 'quarterly' ? 3 : 12
    const lastPaid = paid[paid.length - 1]
    const { year: ly, month: lm } = parseYearMonth(lastPaid.payDate)
    const lastAbsMonth = ly * 12 + (lm - 1)
    const blendedAmt = blendedProjectionAmount(group)

    // Existing scheduled/projected months for this holding (avoid double-counting)
    const existingScheduled = new Map<string, number>()
    for (const d of group) {
      if (d.status === 'scheduled' || d.status === 'projected') {
        const { year: dy, month: dm } = parseYearMonth(d.payDate)
        const k = `${dy}-${dm}`
        existingScheduled.set(k, (existingScheduled.get(k) ?? 0) + parseFloat(d.totalAmount))
      }
    }

    for (const slot of slots) {
      const slotAbsMonth = slot.year * 12 + (slot.month - 1)

      if (!slot.isPast) {
        // Future: use blended projection
        const slotKey = `${slot.year}-${slot.month}`
        if (existingScheduled.has(slotKey)) {
          const amt = existingScheduled.get(slotKey)!
          slot.projected += amt
          slot.detail.push({ ticker, accountName, amount: amt, status: 'projected' })
        } else {
          const diff = slotAbsMonth - lastAbsMonth
          if (diff > 0 && diff % cadenceMonths === 0) {
            slot.projected += blendedAmt
            slot.detail.push({ ticker, accountName, amount: blendedAmt, status: 'projected' })
          }
        }
      } else {
        // Past: what would the simple model have predicted for this slot?
        const slotDate = new Date(slot.year, slot.month - 1, 1)
        const paidBefore = paid
          .filter((d) => new Date(d.payDate) < slotDate)
          .sort((a, b) => a.payDate.localeCompare(b.payDate))

        if (paidBefore.length < 2) continue

        const cadenceBefore = detectCadence(paidBefore.map((d) => d.payDate))
        if (cadenceBefore === 'unknown' || cadenceBefore === 'irregular') continue

        const cadenceMonthsBefore =
          cadenceBefore === 'monthly' ? 1 : cadenceBefore === 'quarterly' ? 3 : 12
        const lastBefore = paidBefore[paidBefore.length - 1]
        const { year: bly, month: blm } = parseYearMonth(lastBefore.payDate)
        const lastBeforeAbsMonth = bly * 12 + (blm - 1)
        const diff = slotAbsMonth - lastBeforeAbsMonth

        if (diff > 0 && diff % cadenceMonthsBefore === 0) {
          slot.projected += parseFloat(lastBefore.totalAmount)
          // Past projected detail: mark as 'projected' for model accuracy display
          const existing = slot.detail.find(
            (d) => d.ticker === ticker && d.accountName === accountName && d.status === 'paid',
          )
          if (!existing) {
            slot.detail.push({
              ticker,
              accountName,
              amount: parseFloat(lastBefore.totalAmount),
              status: 'projected',
            })
          }
        }
      }
    }
  }

  return slots
}

// ── buildHoldingProjections ───────────────────────────────────────────────────

/**
 * For each holding with >= 2 paid dividends and a detectable cadence, compute
 * projected annual income over the next 12 months.  Returns results sorted by
 * projectedAnnual descending with pctOfTotal filled in.
 */
export function buildHoldingProjections(
  dividends: DividendWithAccount[],
  today: Date,
): HoldingProjection[] {
  const byHolding = new Map<string, DividendWithAccount[]>()
  for (const d of dividends) {
    const key = `${d.accountId}:${d.ticker}`
    const arr = byHolding.get(key) ?? []
    arr.push(d)
    byHolding.set(key, arr)
  }

  const results: HoldingProjection[] = []

  for (const [holdingId, group] of byHolding) {
    const ticker = group[0].ticker
    const accountName = group[0].accountName
    const paid = group
      .filter((d) => d.status === 'paid')
      .sort((a, b) => a.payDate.localeCompare(b.payDate))

    if (paid.length < 2) continue

    const cadence = detectCadence(paid.map((d) => d.payDate))
    if (cadence === 'unknown' || cadence === 'irregular') continue

    const cadenceMonths = cadence === 'monthly' ? 1 : cadence === 'quarterly' ? 3 : 12
    const lastPaid = paid[paid.length - 1]
    const { year: ly, month: lm } = parseYearMonth(lastPaid.payDate)
    const lastAbsMonth = ly * 12 + (lm - 1)
    const blendedAmt = blendedProjectionAmount(group)

    // Map of already-scheduled/projected months → amount
    const existingScheduled = new Map<string, number>()
    for (const d of group) {
      if (d.status === 'scheduled' || d.status === 'projected') {
        const { year: dy, month: dm } = parseYearMonth(d.payDate)
        const k = `${dy}-${dm}`
        existingScheduled.set(k, (existingScheduled.get(k) ?? 0) + parseFloat(d.totalAmount))
      }
    }

    let projectedAnnual = 0
    let nextPayDate: string | null = null
    let nextPayAmount = 0

    for (let i = 1; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const slotYear = d.getFullYear()
      const slotMonth = d.getMonth() + 1
      const slotKey = `${slotYear}-${slotMonth}`
      const slotAbsMonth = slotYear * 12 + (slotMonth - 1)
      const diff = slotAbsMonth - lastAbsMonth

      let amount = 0
      if (existingScheduled.has(slotKey)) {
        amount = existingScheduled.get(slotKey)!
      } else if (diff > 0 && diff % cadenceMonths === 0) {
        amount = blendedAmt
      }

      if (amount > 0) {
        projectedAnnual += amount
        if (nextPayDate === null) {
          // Estimate the pay day: use last paid's day, clamped to end of month
          const lastDay = parseInt(lastPaid.payDate.split('-')[2])
          const daysInMonth = new Date(slotYear, slotMonth, 0).getDate()
          const day = Math.min(lastDay, daysInMonth)
          nextPayDate = `${slotYear}-${String(slotMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          nextPayAmount = amount
        }
      }
    }

    if (projectedAnnual === 0 || nextPayDate === null) continue

    results.push({
      holdingId,
      ticker,
      accountName,
      cadence,
      nextPayDate,
      nextPayAmount,
      projectedAnnual,
      pctOfTotal: 0, // computed below
    })
  }

  // Sort by projectedAnnual descending
  results.sort((a, b) => b.projectedAnnual - a.projectedAnnual)

  // Compute pctOfTotal
  const totalAnnual = results.reduce((sum, r) => sum + r.projectedAnnual, 0)
  for (const r of results) {
    r.pctOfTotal = totalAnnual > 0 ? (r.projectedAnnual / totalAnnual) * 100 : 0
  }

  return results
}

// ── buildExcluded ─────────────────────────────────────────────────────────────

/**
 * Return holdings that appear in the dividend data but have fewer than 2 paid
 * dividends, making cadence detection impossible.
 */
export function buildExcluded(dividends: DividendWithAccount[]): ExcludedHolding[] {
  const byHolding = new Map<string, DividendWithAccount[]>()
  for (const d of dividends) {
    const key = `${d.accountId}:${d.ticker}`
    const arr = byHolding.get(key) ?? []
    arr.push(d)
    byHolding.set(key, arr)
  }

  const excluded: ExcludedHolding[] = []

  for (const [, group] of byHolding) {
    const paidCount = group.filter((d) => d.status === 'paid').length
    if (paidCount < 2) {
      excluded.push({
        ticker: group[0].ticker,
        accountName: group[0].accountName,
        reason:
          paidCount === 0
            ? 'No paid dividends logged'
            : `Insufficient history (${paidCount} dividend logged)`,
      })
    }
  }

  return excluded
}

// ── buildDividendCalendar ─────────────────────────────────────────────────────

export function buildDividendCalendar(
  dividends: DividendWithAccount[],
  year: number,
  month: number,
): CalendarDay[] {
  const inMonth = dividends.filter((d) => {
    const { year: y, month: m } = parseYearMonth(d.payDate)
    return y === year && m === month
  })

  if (inMonth.length === 0) return []

  const byDate = new Map<string, DividendWithAccount[]>()
  for (const d of inMonth) {
    const group = byDate.get(d.payDate) ?? []
    group.push(d)
    byDate.set(d.payDate, group)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, divs]) => ({ date, dividends: divs }))
}
