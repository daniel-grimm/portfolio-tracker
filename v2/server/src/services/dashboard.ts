import { eq, and, gte } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { dividends, accounts, portfolios } from '../db/schema.js'
import type { TTMIncomeData, TTMIncomeMonth } from 'shared'

export async function getTTMIncome(db: DbInstance, userId: string): Promise<TTMIncomeData> {
  // Build the 12 month slots: from (currentMonth - 11) through currentMonth
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1–12

  let startMonth = currentMonth - 11
  let startYear = currentYear
  if (startMonth <= 0) {
    startMonth += 12
    startYear--
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    let m = startMonth + i
    let y = startYear
    if (m > 12) { m -= 12; y++ }
    return { year: y, month: m }
  })

  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`

  // Query all paid dividends in the TTM window for this user
  const rows = await db
    .select({
      accountId: accounts.id,
      accountName: accounts.name,
      payDate: dividends.payDate,
      totalAmount: dividends.totalAmount,
    })
    .from(dividends)
    .innerJoin(accounts, eq(dividends.accountId, accounts.id))
    .innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
    .where(
      and(
        eq(portfolios.userId, userId),
        eq(dividends.status, 'paid'),
        gte(dividends.payDate, startDate),
      ),
    )

  // Group by (year, month, accountId) in JS
  const grouped = new Map<string, { accountId: string; accountName: string; year: number; month: number; income: number }>()
  for (const row of rows) {
    const [y, m] = row.payDate.split('-').map(Number)
    const key = `${y}-${m}-${row.accountId}`
    const existing = grouped.get(key)
    const amount = parseFloat(row.totalAmount)
    if (existing) {
      existing.income += amount
    } else {
      grouped.set(key, { accountId: row.accountId, accountName: row.accountName, year: y, month: m, income: amount })
    }
  }

  // Collect distinct accounts that appear in the data
  const accountMap = new Map<string, string>()
  for (const entry of grouped.values()) {
    accountMap.set(entry.accountId, entry.accountName)
  }
  const accountList = Array.from(accountMap.entries()).map(([accountId, accountName]) => ({
    accountId,
    accountName,
  }))

  // Build the 12-slot result, filling zeros for missing account/month combos
  const resultMonths: TTMIncomeMonth[] = months.map(({ year, month }) => {
    const byAccount = accountList.map(({ accountId, accountName }) => {
      const key = `${year}-${month}-${accountId}`
      const entry = grouped.get(key)
      return { accountId, accountName, income: entry?.income ?? 0 }
    })
    const total = byAccount.reduce((s, a) => s + a.income, 0)
    return { year, month, total, byAccount }
  })

  return { months: resultMonths, accounts: accountList }
}
