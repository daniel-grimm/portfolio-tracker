import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProjections } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ProjectionGroupedBarChart } from '@/components/charts/ProjectionGroupedBarChart'
import type { ProjectionsResponse, ProjectionChartMonth, HoldingProjection } from 'shared'

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function fmt(v: number): string {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

function ProjectionStatCards({ data }: { data: ProjectionsResponse }) {
  const { ttmIncome, projectedAnnual, trend, trendPct } = data

  const trendColor =
    trendPct > 1
      ? 'text-gain'
      : trendPct < -1
        ? 'text-loss'
        : 'text-muted-foreground'
  const TrendIcon = trendPct > 1 ? TrendingUp : trendPct < -1 ? TrendingDown : Minus

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">TTM Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(ttmIncome)}</div>
          <p className="text-xs text-muted-foreground mt-1">{fmt(ttmIncome / 12)} / month avg</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Projected Next 12 Mo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(projectedAnnual)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {fmt(projectedAnnual / 12)} / month avg
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold flex items-center gap-2 ${trendColor}`}>
            <TrendIcon className="h-5 w-5" />
            {trend >= 0 ? '+' : ''}
            {fmt(trend)}
          </div>
          <p className={`text-xs mt-1 ${trendColor}`}>{fmtPct(trendPct)} vs last year</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Month Detail Modal ────────────────────────────────────────────────────────

function MonthDetailModal({
  month,
  onClose,
}: {
  month: ProjectionChartMonth
  onClose: () => void
}) {
  const title = `${MONTH_SHORT[month.month - 1]} ${month.year}`
  const total = month.detail.reduce((s, d) => s + d.amount, 0)
  const hasPaid = month.detail.some((d) => d.status === 'paid')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {month.isPast && !hasPaid && month.detail.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No dividends logged for this month.
          </p>
        ) : month.detail.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No projected income for this month.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {month.detail.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{d.accountName}</TableCell>
                  <TableCell className="text-right font-mono">
                    {d.status === 'projected' ? `~${fmt(d.amount)}` : fmt(d.amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        d.status === 'paid'
                          ? 'bg-gain-subtle text-gain'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      {d.status === 'paid' ? 'Paid' : 'Projected'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono">{fmt(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Holding Breakdown Table ───────────────────────────────────────────────────

type SortKey = keyof Pick<
  HoldingProjection,
  'ticker' | 'cadence' | 'nextPayDate' | 'nextPayAmount' | 'projectedAnnual' | 'pctOfTotal'
>

const SORT_LABELS: Record<SortKey, string> = {
  ticker: 'Ticker',
  cadence: 'Cadence',
  nextPayDate: 'Next Pay Date',
  nextPayAmount: 'Next Payout',
  projectedAnnual: 'Projected Annual',
  pctOfTotal: '% of Total',
}

function HoldingBreakdownTable({
  projections,
  excluded,
}: {
  projections: HoldingProjection[]
  excluded: ProjectionsResponse['excluded']
}) {
  const [sortKey, setSortKey] = useState<SortKey>('projectedAnnual')
  const [sortAsc, setSortAsc] = useState(false)
  const [showExcluded, setShowExcluded] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(key === 'ticker' || key === 'nextPayDate')
    }
  }

  const sorted = [...projections].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const cmp =
      typeof av === 'string'
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number)
    return sortAsc ? cmp : -cmp
  })

  function SortBtn({ col, right }: { col: SortKey; right?: boolean }) {
    const active = sortKey === col
    return (
      <button
        onClick={() => handleSort(col)}
        className={`flex items-center gap-1 hover:text-foreground transition-colors ${
          right ? 'justify-end w-full' : ''
        } ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {SORT_LABELS[col]}
        {active ? (
          sortAsc ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    )
  }

  if (projections.length === 0 && excluded.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No projections available — log at least 2 paid dividends per holding to enable
            forecasting.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holding Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortBtn col="ticker" />
                </TableHead>
                <TableHead>Account</TableHead>
                <TableHead>
                  <SortBtn col="cadence" />
                </TableHead>
                <TableHead>
                  <SortBtn col="nextPayDate" />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn col="nextPayAmount" right />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn col="projectedAnnual" right />
                </TableHead>
                <TableHead className="text-right">
                  <SortBtn col="pctOfTotal" right />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.holdingId}>
                  <TableCell className="font-medium">{p.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{p.accountName}</TableCell>
                  <TableCell className="capitalize">{p.cadence}</TableCell>
                  <TableCell>{p.nextPayDate}</TableCell>
                  <TableCell className="text-right font-mono">~{fmt(p.nextPayAmount)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p.projectedAnnual)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.pctOfTotal.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            No projections available — log at least 2 paid dividends per holding to enable
            forecasting.
          </p>
        )}

        {excluded.length > 0 && (
          <Collapsible open={showExcluded} onOpenChange={setShowExcluded} className="border-t">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between rounded-none px-6 py-3 text-xs text-muted-foreground h-auto"
              >
                {excluded.length} holding{excluded.length !== 1 ? 's' : ''} excluded from
                projections
                {showExcluded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-4 space-y-1">
                {excluded.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{e.ticker}</span>
                    {e.accountName ? ` (${e.accountName})` : ''} — {e.reason}
                  </p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Projections() {
  const [selectedMonth, setSelectedMonth] = useState<ProjectionChartMonth | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ['projections'],
    queryFn: getProjections,
  })

  if (isPending) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Projections</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Projections</h1>
        <p className="text-destructive text-sm">Failed to load projection data.</p>
      </div>
    )
  }

  const hasChartData =
    data.holdingProjections.length > 0 || data.chartData.some((m) => (m.actual ?? 0) > 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Projections</h1>

      <ProjectionStatCards data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Income — Last 12 Months vs Next 12 Months</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click any month group to see a per-holding breakdown.
          </p>
        </CardHeader>
        <CardContent>
          {!hasChartData ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No projection data yet. Log at least 2 paid dividends per holding to enable
              forecasting.
            </p>
          ) : (
            <ProjectionGroupedBarChart
              chartData={data.chartData}
              onMonthClick={setSelectedMonth}
            />
          )}
        </CardContent>
      </Card>

      <HoldingBreakdownTable projections={data.holdingProjections} excluded={data.excluded} />

      {selectedMonth !== null && (
        <MonthDetailModal month={selectedMonth} onClose={() => setSelectedMonth(null)} />
      )}
    </div>
  )
}
