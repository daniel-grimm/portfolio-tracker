import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getProjections, getDashboardCalendar } from '@/lib/api'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ProjectionGroupedBarChart } from '@/components/charts/ProjectionGroupedBarChart'
import type { ProjectionsResponse, ProjectionChartMonth, HoldingProjection, DividendWithAccount } from 'shared'

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

// ── Stat Cards ────────────────────────────────────────────────────────────────

function ProjectionStatCards({ data }: { data: ProjectionsResponse }) {
  const { t } = useTranslation()
  const { projectedAnnual } = data

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('projections.projectedAnnual')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(projectedAnnual)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('dividend.monthlyAvg')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(projectedAnnual / 12)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Calendar: DayCell ─────────────────────────────────────────────────────────

function DayCell({
  day,
  dividends,
  monthName,
}: {
  day: number | null
  dividends: DividendWithAccount[]
  monthName: string
}) {
  const { t } = useTranslation()
  const hasDivs = dividends.length > 0
  const allProjected = hasDivs && dividends.every((d) => d.status === 'projected')

  if (!day) return <div className="min-h-[72px] rounded-md" />

  const cellBg = !hasDivs
    ? ''
    : allProjected
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-primary/30 bg-primary/5'

  const total = dividends.reduce((sum, d) => {
    const amt =
      d.status === 'projected' && d.projectedPayout
        ? parseFloat(d.projectedPayout)
        : parseFloat(d.totalAmount ?? '0')
    return sum + amt
  }, 0)
  const chipLabel = allProjected ? `~$${total.toFixed(2)}` : `$${total.toFixed(2)}`
  const chipColor = allProjected ? 'bg-primary' : 'bg-gain'

  const content = (
    <div className={`min-h-[72px] rounded-md border p-1.5 text-sm flex flex-col gap-1 ${cellBg}`}>
      <span className="text-xs font-medium text-muted-foreground">{day}</span>
      {hasDivs && (
        <div
          className={`flex items-center justify-center rounded px-1 py-0.5 text-[10px] text-white font-medium ${chipColor}`}
        >
          {chipLabel}
        </div>
      )}
    </div>
  )

  if (!hasDivs) return content

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            {monthName} {day}
          </p>
          <div className="space-y-1">
            {dividends.map((d) => {
              const isProjected = d.status === 'projected'
              const amount =
                isProjected && d.projectedPayout
                  ? t('dividend.projectedAmount', { amount: `$${parseFloat(d.projectedPayout).toFixed(2)}` })
                  : `$${parseFloat(d.totalAmount ?? '0').toFixed(2)}`
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{d.ticker}</span>
                    <span className="text-xs text-muted-foreground">{d.accountName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isProjected
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-gain-subtle text-gain'
                      }`}
                    >
                      {isProjected ? t('dividend.statusProjected') : t('dividend.statusPaid')}
                    </span>
                    <span className="font-medium tabular-nums">{amount}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Calendar Section ──────────────────────────────────────────────────────────

function DividendCalendar() {
  const { t } = useTranslation()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedAccount, setSelectedAccount] = useState('')

  const MONTH_NAMES = t('calendar.months', { returnObjects: true }) as string[]
  const DAY_LABELS = t('calendar.days', { returnObjects: true }) as string[]

  const { data: calendarDays, isPending: calendarPending } = useQuery({
    queryKey: ['dashboardCalendar', year, month],
    queryFn: () => getDashboardCalendar(year, month),
  })

  useEffect(() => {
    setSelectedAccount('')
  }, [year, month])

  function navigateMonth(delta: number) {
    let y = year
    let m = month + delta
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setYear(y)
    setMonth(m)
  }

  const monthName = MONTH_NAMES[month - 1]
  const hasEvents = (calendarDays?.length ?? 0) > 0

  const accountOptions = useMemo(() => {
    if (!calendarDays) return []
    const names = new Set<string>()
    for (const entry of calendarDays) {
      for (const d of entry.dividends) names.add(d.accountName)
    }
    return Array.from(names).sort()
  }, [calendarDays])

  const dividendsByDay = new Map<number, DividendWithAccount[]>()
  for (const entry of calendarDays ?? []) {
    const day = parseInt(entry.date.split('-')[2])
    const filtered =
      selectedAccount ? entry.dividends.filter((d) => d.accountName === selectedAccount) : entry.dividends
    if (filtered.length > 0) dividendsByDay.set(day, filtered)
  }
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: Array<number | null> = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('calendar.dividendCalendar')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              {t('calendar.prev')}
            </Button>
            <span className="text-sm font-medium w-36 text-center">
              {monthName} {year}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              {t('calendar.next')}
            </Button>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gain inline-block" /> {t('calendar.paid')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> {t('calendar.projected')}
            </span>
          </div>
        </div>

        {hasEvents && (
          <div className="flex items-center gap-2">
            <Select value={selectedAccount || 'all'} onValueChange={(v) => setSelectedAccount(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-52 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('calendar.allAccounts')}</SelectItem>
                {accountOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((label) => (
            <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
              {label}
            </div>
          ))}
        </div>

        {calendarPending ? (
          <Skeleton className="rounded-xl" style={{ height: 400 }} />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => (
              <DayCell
                key={idx}
                day={day}
                dividends={day ? (dividendsByDay.get(day) ?? []) : []}
                monthName={monthName ?? ''}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
  const { t } = useTranslation()
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
            {t('projections.noDividendsThisMonth')}
          </p>
        ) : month.detail.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t('projections.noProjectedIncome')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('projections.ticker')}</TableHead>
                <TableHead>{t('projections.account')}</TableHead>
                <TableHead className="text-right">{t('projections.amount')}</TableHead>
                <TableHead>{t('projections.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {month.detail.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{d.accountName}</TableCell>
                  <TableCell className="text-right font-mono">
                    {d.status === 'projected'
                      ? t('projections.projectedAmount', { amount: fmt(d.amount) })
                      : fmt(d.amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        d.status === 'paid'
                          ? 'bg-gain-subtle text-gain'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      {d.status === 'paid'
                        ? t('projections.statusPaid')
                        : t('projections.statusProjected')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell colSpan={2}>{t('projections.total')}</TableCell>
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

function HoldingBreakdownTable({
  projections,
  excluded,
}: {
  projections: HoldingProjection[]
  excluded: ProjectionsResponse['excluded']
}) {
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<SortKey>('projectedAnnual')
  const [sortAsc, setSortAsc] = useState(false)
  const [showExcluded, setShowExcluded] = useState(false)

  const SORT_LABELS: Record<SortKey, string> = {
    ticker: t('projections.ticker'),
    cadence: t('projections.cadence'),
    nextPayDate: t('projections.nextPayDate'),
    nextPayAmount: t('projections.nextPayout'),
    projectedAnnual: t('projections.projectedAnnual'),
    pctOfTotal: t('projections.pctOfTotal'),
  }

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
            {t('projections.noProjections')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projections.holdingBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortBtn col="ticker" />
                </TableHead>
                <TableHead>{t('projections.account')}</TableHead>
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
            {t('projections.noProjections')}
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
                {t('projections.excludedHoldings', { count: excluded.length })}
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
  const { t } = useTranslation()
  const [selectedMonth, setSelectedMonth] = useState<ProjectionChartMonth | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ['projections'],
    queryFn: getProjections,
  })

  if (isPending) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('projections.projections')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">{t('projections.projections')}</h1>
        <p className="text-destructive text-sm">{t('projections.failedToLoad')}</p>
      </div>
    )
  }

  const hasChartData =
    data.holdingProjections.length > 0 || data.chartData.some((m) => (m.actual ?? 0) > 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('projections.projections')}</h1>

      <ProjectionStatCards data={data} />

      <Card>
        <CardHeader>
          <CardTitle>{t('projections.incomeChartTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('projections.incomeChartSubtitle')}
          </p>
        </CardHeader>
        <CardContent>
          {!hasChartData ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('projections.noProjectionData')}
            </p>
          ) : (
            <ProjectionGroupedBarChart
              chartData={data.chartData}
              onMonthClick={setSelectedMonth}
            />
          )}
        </CardContent>
      </Card>

      <DividendCalendar />

      <HoldingBreakdownTable projections={data.holdingProjections} excluded={data.excluded} />

      {selectedMonth !== null && (
        <MonthDetailModal month={selectedMonth} onClose={() => setSelectedMonth(null)} />
      )}
    </div>
  )
}
