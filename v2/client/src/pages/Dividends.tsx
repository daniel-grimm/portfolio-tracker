import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DividendWithAccount, DividendStatus } from 'shared'
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  getAllDividends,
  getPortfolios,
  getAccounts,
  getHoldings,
  createDividend,
  updateDividend,
  deleteDividend,
  getDashboardCalendar,
  getDashboardSummary,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// ── Shared helpers ────────────────────────────────────────────────────────────

function statusBadgeClass(status: DividendStatus) {
  if (status === 'paid') return 'text-gain'
  if (status === 'scheduled') return 'text-blue-600 dark:text-blue-400'
  return 'text-amber-500'
}

// ── Calendar components ───────────────────────────────────────────────────────

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

  // Sum the day's total: use projectedPayout for projected items, totalAmount otherwise
  const total = dividends.reduce((sum, d) => {
    const amt =
      d.status === 'projected' && d.projectedPayout
        ? parseFloat(d.projectedPayout)
        : parseFloat(d.totalAmount)
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
                  : `$${parseFloat(d.totalAmount).toFixed(2)}`
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

// ── Dividend History Modal ────────────────────────────────────────────────────

type SortCol = 'ticker' | 'payDate'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronsUpDown className="inline ml-1 h-3 w-3 text-muted-foreground/50" />
  return dir === 'asc'
    ? <ChevronUp className="inline ml-1 h-3 w-3" />
    : <ChevronDown className="inline ml-1 h-3 w-3" />
}

function DividendHistoryModal({
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (d: DividendWithAccount) => void
  onDelete: (d: DividendWithAccount) => void
}) {
  const { t } = useTranslation()
  const [sortCol, setSortCol] = useState<SortCol>('payDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data: dividends, isPending } = useQuery({
    queryKey: ['dividends', 'all'],
    queryFn: getAllDividends,
    enabled: open,
  })

  function toggleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!dividends) return []
    return [...dividends].sort((a, b) => {
      const cmp =
        sortCol === 'ticker'
          ? a.ticker.localeCompare(b.ticker)
          : a.payDate.localeCompare(b.payDate)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [dividends, sortCol, sortDir])

  function statusLabel(status: DividendStatus): string {
    if (status === 'paid') return t('dividend.statusPaid')
    if (status === 'scheduled') return t('dividend.statusScheduled')
    return t('dividend.statusProjected')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('dividend.dividendHistory')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0">
          {isPending ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !sorted.length ? (
            <p className="text-muted-foreground text-sm py-4">{t('dividend.noDividends')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground transition-colors"
                      onClick={() => toggleSort('ticker')}
                    >
                      {t('dividend.ticker')}
                      <SortIcon col="ticker" active={sortCol} dir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>{t('dividend.account')}</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground transition-colors"
                      onClick={() => toggleSort('payDate')}
                    >
                      {t('dividend.payDate')}
                      <SortIcon col="payDate" active={sortCol} dir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>{t('dividend.amount')}</TableHead>
                  <TableHead>{t('dividend.status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.ticker}</TableCell>
                    <TableCell className="text-muted-foreground">{d.accountName}</TableCell>
                    <TableCell>{d.payDate}</TableCell>
                    <TableCell>
                      {d.status === 'projected' && d.projectedPayout ? (
                        <span className="text-amber-500 italic">
                          {t('dividend.projectedAmount', { amount: `$${Number(d.projectedPayout).toFixed(2)}` })}
                        </span>
                      ) : (
                        `$${Number(d.totalAmount).toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`capitalize text-sm font-medium ${statusBadgeClass(d.status)}`}>
                        {statusLabel(d.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Dividend forms ────────────────────────────────────────────────────────────

type CreateFormValues = {
  portfolioId: string
  accountId: string
  ticker: string
  status: DividendStatus
  payDate: string
  amountPerShare: string
  totalAmount: string
  projectedPerShare: string
  projectedPayout: string
}

type EditFormValues = {
  status: DividendStatus
  payDate: string
  amountPerShare: string
  totalAmount: string
  projectedPerShare: string
  projectedPayout: string
}

function CreateDividendForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: CreateFormValues) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<CreateFormValues>({
      defaultValues: {
        portfolioId: '',
        accountId: '',
        ticker: '',
        status: 'paid',
        payDate: '',
        amountPerShare: '',
        totalAmount: '',
        projectedPerShare: '',
        projectedPayout: '',
      },
    })

  const portfolioId = watch('portfolioId')
  const accountId = watch('accountId')
  const status = watch('status')

  const { data: portfolios } = useQuery({ queryKey: ['portfolios'], queryFn: getPortfolios })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', 'portfolio', portfolioId],
    queryFn: () => getAccounts(portfolioId),
    enabled: Boolean(portfolioId),
  })

  const { data: holdings } = useQuery({
    queryKey: ['holdings', accountId],
    queryFn: () => getHoldings(accountId),
    enabled: Boolean(accountId),
  })

  const uniqueTickers = useMemo(() => {
    if (!holdings) return []
    const map = new Map<string, number>()
    for (const h of holdings) map.set(h.ticker, (map.get(h.ticker) ?? 0) + Number(h.shares))
    return Array.from(map.entries())
  }, [holdings])

  const isProjected = status === 'projected'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>{t('portfolio.portfolio')}</Label>
          <Select
            value={portfolioId}
            onValueChange={(v) => { setValue('portfolioId', v); setValue('accountId', ''); setValue('ticker', '') }}
          >
            <SelectTrigger><SelectValue placeholder={t('dividend.selectPortfolio')} /></SelectTrigger>
            <SelectContent>
              {portfolios?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 col-span-2">
          <Label>{t('account.account')}</Label>
          <Select
            value={accountId}
            disabled={!portfolioId}
            onValueChange={(v) => { setValue('accountId', v); setValue('ticker', '') }}
          >
            <SelectTrigger>
              <SelectValue placeholder={portfolioId ? t('dividend.selectAccount') : t('dividend.selectAccountFirst')} />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 col-span-2">
          <Label>{t('dividend.ticker')}</Label>
          <Select
            value={watch('ticker')}
            disabled={!accountId}
            onValueChange={(v) => setValue('ticker', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={accountId ? t('dividend.selectTicker') : t('dividend.selectTickerFirst')} />
            </SelectTrigger>
            <SelectContent>
              {uniqueTickers.map(([ticker, totalShares]) => (
                <SelectItem key={ticker} value={ticker}>
                  {ticker} ({totalShares.toLocaleString()} shares)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t('dividend.status')}</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as DividendStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">{t('dividend.statusPaid')}</SelectItem>
              <SelectItem value="scheduled">{t('dividend.statusScheduled')}</SelectItem>
              <SelectItem value="projected">{t('dividend.statusProjected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.payDate')}</Label>
          <Input type="date" {...register('payDate', { required: t('common.required') })} />
          {errors.payDate && <p className="text-sm text-destructive">{errors.payDate.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>{t('dividend.amountPerShare')}</Label>
          <Input type="number" step="any" placeholder={t('dividend.amountPerSharePlaceholder')} {...register('amountPerShare', { required: t('common.required') })} />
          {errors.amountPerShare && <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.totalPayout')}</Label>
          <Input type="number" step="any" placeholder={t('dividend.totalPayoutPlaceholder')} {...register('totalAmount', { required: t('common.required') })} />
          {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
        </div>

        {isProjected && (
          <>
            <div className="space-y-1">
              <Label>{t('dividend.projectedPerShare')}</Label>
              <Input type="number" step="any" placeholder={t('dividend.projectedPerSharePlaceholder')} {...register('projectedPerShare')} />
            </div>
            <div className="space-y-1">
              <Label>{t('dividend.projectedPayout')}</Label>
              <Input type="number" step="any" placeholder={t('dividend.projectedPayoutPlaceholder')} {...register('projectedPayout')} />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || !accountId || !watch('ticker')}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditDividendForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  defaultValues: EditFormValues
  onSubmit: (values: EditFormValues) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<EditFormValues>({ defaultValues })

  const status = watch('status')
  const isProjected = status === 'projected'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t('dividend.status')}</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as DividendStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">{t('dividend.statusPaid')}</SelectItem>
              <SelectItem value="scheduled">{t('dividend.statusScheduled')}</SelectItem>
              <SelectItem value="projected">{t('dividend.statusProjected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.payDate')}</Label>
          <Input type="date" {...register('payDate', { required: t('common.required') })} />
          {errors.payDate && <p className="text-sm text-destructive">{errors.payDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.amountPerShare')}</Label>
          <Input type="number" step="any" {...register('amountPerShare', { required: t('common.required') })} />
          {errors.amountPerShare && <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.totalPayout')}</Label>
          <Input type="number" step="any" {...register('totalAmount', { required: t('common.required') })} />
          {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
        </div>
        {isProjected && (
          <>
            <div className="space-y-1">
              <Label>{t('dividend.projectedPerShare')}</Label>
              <Input type="number" step="any" {...register('projectedPerShare')} />
            </div>
            <div className="space-y-1">
              <Label>{t('dividend.projectedPayout')}</Label>
              <Input type="number" step="any" {...register('projectedPayout')} />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Stat cards ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

// ── Main page ─────────────────────────────────────────────────────────────────

export function Dividends() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const now = new Date()

  const year = parseInt(params.get('year') ?? '') || now.getFullYear()
  const month = parseInt(params.get('month') ?? '') || now.getMonth() + 1

  const currentYear = new Date().getFullYear()

  const MONTH_NAMES = t('calendar.months', { returnObjects: true }) as string[]
  const DAY_LABELS = t('calendar.days', { returnObjects: true }) as string[]

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  })

  const { data: calendarDays, isPending: calendarPending } = useQuery({
    queryKey: ['dashboardCalendar', year, month],
    queryFn: () => getDashboardCalendar(year, month),
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DividendWithAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DividendWithAccount | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string>('')

  // Reset account filter on month navigation
  useEffect(() => {
    setSelectedAccount('')
  }, [year, month])

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: ['dividends', 'all'] })
    void qc.invalidateQueries({ queryKey: ['dividends', 'account'] })
    void qc.invalidateQueries({ queryKey: ['dashboardCalendar', year, month] })
  }

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) =>
      createDividend(values.accountId, {
        ticker: values.ticker,
        amountPerShare: values.amountPerShare,
        totalAmount: values.totalAmount,
        payDate: values.payDate,
        projectedPerShare: values.projectedPerShare || null,
        projectedPayout: values.projectedPayout || null,
        status: values.status,
      }),
    onSuccess: () => { invalidateAll(); setCreateOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EditFormValues }) =>
      updateDividend(id, {
        amountPerShare: values.amountPerShare,
        totalAmount: values.totalAmount,
        payDate: values.payDate,
        projectedPerShare: values.projectedPerShare || null,
        projectedPayout: values.projectedPayout || null,
        status: values.status,
      }),
    onSuccess: () => { invalidateAll(); setEditTarget(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDividend,
    onSuccess: () => { invalidateAll(); setDeleteTarget(null) },
  })

  function navigateMonth(delta: number) {
    let y = year
    let m = month + delta
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setParams({ year: String(y), month: String(m) })
  }

  // Calendar grid
  const monthName = MONTH_NAMES[month - 1]
  const hasEvents = (calendarDays?.length ?? 0) > 0

  // Distinct account names from current month events
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dividend.dividends')}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {t('dividend.logDividend')}
        </Button>
      </div>

      {/* ── Stat cards ── */}
      {summaryPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('dividend.ytdIncome')} value={fmt(summary?.ytdIncome ?? 0)} sub={`${currentYear}`} />
          <StatCard label={t('dividend.allTimeIncome')} value={fmt(summary?.allTimeIncome ?? 0)} />
          <StatCard label={t('dividend.projectedAnnual')} value={fmt(summary?.projectedAnnual ?? 0)} sub={t('dividend.last12MonthsPaid')} />
        </div>
      )}

      {/* ── Calendar ── */}
      <section className="space-y-3">
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
      </section>

      {/* ── Full History ── */}
      <div>
        <Button variant="outline" onClick={() => setHistoryOpen(true)}>
          {t('calendar.fullHistory')}
        </Button>
      </div>

      {/* ── Modals ── */}
      <DividendHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onEdit={(d) => { setHistoryOpen(false); setEditTarget(d) }}
        onDelete={(d) => { setHistoryOpen(false); setDeleteTarget(d) }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('dividend.logDividend')}</DialogTitle></DialogHeader>
          <CreateDividendForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dividend.editDividend', { ticker: editTarget?.ticker })}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <EditDividendForm
              defaultValues={{
                status: editTarget.status,
                payDate: editTarget.payDate,
                amountPerShare: editTarget.amountPerShare,
                totalAmount: editTarget.totalAmount,
                projectedPerShare: editTarget.projectedPerShare ?? '',
                projectedPayout: editTarget.projectedPayout ?? '',
              }}
              onSubmit={(values) => updateMutation.mutate({ id: editTarget.id, values })}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dividend.deleteDividend')}</AlertDialogTitle>
            <AlertDialogDescription>
              <span
                dangerouslySetInnerHTML={{
                  __html: t('dividend.deleteConfirm', {
                    ticker: deleteTarget?.ticker ?? '',
                    payDate: deleteTarget?.payDate ?? '',
                  }),
                }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
