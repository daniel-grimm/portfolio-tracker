import { useQuery } from '@tanstack/react-query'
import { getAllDividends, getDashboardSummary, getProjectedIncome } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IncomeBarChart } from '@/components/charts/IncomeBarChart'
import { ProjectedIncomeChart } from '@/components/charts/ProjectedIncomeChart'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function Dashboard() {
  const currentYear = new Date().getFullYear()

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  })

  const { data: projections, isPending: projectionsPending } = useQuery({
    queryKey: ['projectedIncome'],
    queryFn: getProjectedIncome,
  })

  const { data: allDividends, isPending: dividendsPending } = useQuery({
    queryKey: ['allDividends'],
    queryFn: getAllDividends,
  })

  const topPayers = allDividends
    ? [...allDividends]
        .filter((d) => d.status === 'paid')
        .reduce(
          (acc, d) => {
            const prev = acc.get(d.ticker) ?? 0
            acc.set(d.ticker, prev + parseFloat(d.totalAmount))
            return acc
          },
          new Map<string, number>(),
        )
    : new Map<string, number>()

  const topPayersList = [...topPayers.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <section>
        {summaryPending ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="YTD Income" value={fmt(summary?.ytdIncome ?? 0)} sub={`${currentYear}`} />
            <StatCard label="All-Time Income" value={fmt(summary?.allTimeIncome ?? 0)} />
            <StatCard
              label="Projected Annual"
              value={fmt(summary?.projectedAnnual ?? 0)}
              sub="Last 12 months paid"
            />
          </div>
        )}
      </section>

      {/* Portfolio breakdown */}
      {!summaryPending && summary?.portfolioBreakdown && summary.portfolioBreakdown.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Portfolio Breakdown</h2>
          <div className="rounded-md border divide-y">
            {summary.portfolioBreakdown.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{p.name}</span>
                <div className="flex gap-6 text-sm text-right">
                  <div>
                    <p className="text-muted-foreground text-xs">Value</p>
                    <p>{fmt(p.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cost</p>
                    <p>{fmt(p.costBasis)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Gain/Loss</p>
                    <p className={p.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {p.gainLoss >= 0 ? '+' : ''}
                      {fmt(p.gainLoss)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Income bar chart */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Income — {currentYear}</h2>
        {dividendsPending ? (
          <Skeleton className="rounded-xl" style={{ height: 240 }} />
        ) : !allDividends || allDividends.length === 0 ? (
          <p className="text-muted-foreground text-sm">No dividend data yet.</p>
        ) : (
          <IncomeBarChart dividends={allDividends} year={currentYear} />
        )}
      </section>

      {/* Projected income chart */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Projected Income — Next 12 Months</h2>
        {projectionsPending ? (
          <Skeleton className="rounded-xl" style={{ height: 200 }} />
        ) : !projections || projections.every((p) => p.projectedIncome === 0) ? (
          <p className="text-muted-foreground text-sm">
            No projection data yet. At least 2 paid dividends per holding are needed.
          </p>
        ) : (
          <ProjectedIncomeChart projections={projections} />
        )}
      </section>

      {/* Top dividend payers */}
      {topPayersList.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top Dividend Payers</h2>
          <div className="rounded-md border divide-y">
            {topPayersList.map(([ticker, total]) => (
              <div key={ticker} className="flex items-center justify-between px-4 py-2">
                <span className="font-medium">{ticker}</span>
                <span className="text-sm">{fmt(total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
