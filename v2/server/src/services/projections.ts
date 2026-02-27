// Pure projection functions — no DB, no async, no Express imports.
import type { Dividend, DividendWithAccount, MonthlyProjection, CalendarDay } from 'shared'

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
