import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DividendWithAccount, DividendStatus } from 'shared'
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  getAllDividends,
  getAllAccounts,
  getHoldings,
  createDividend,
  updateDividend,
  deleteDividend,
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
import { MonthlyIncomeBarChart } from '@/components/charts/MonthlyIncomeBarChart'
import { AnnualIncomeBarChart } from '@/components/charts/AnnualIncomeBarChart'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusBadgeClass(status: DividendStatus) {
  if (status === 'paid') return 'text-gain'
  if (status === 'scheduled') return 'text-blue-600 dark:text-blue-400'
  return 'text-amber-500'
}

function statusLabel(status: DividendStatus, t: (k: string) => string): string {
  if (status === 'paid') return t('dividend.statusPaid')
  if (status === 'scheduled') return t('dividend.statusScheduled')
  return t('dividend.statusProjected')
}

// ── Stat cards ────────────────────────────────────────────────────────────────

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

// ── Sort icon ─────────────────────────────────────────────────────────────────

type SortCol = 'ticker' | 'payDate'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronsUpDown className="inline ml-1 h-3 w-3 text-muted-foreground/50" />
  return dir === 'asc'
    ? <ChevronUp className="inline ml-1 h-3 w-3" />
    : <ChevronDown className="inline ml-1 h-3 w-3" />
}

// ── Inline dividend table with infinite scroll ────────────────────────────────

const PAGE_SIZE = 20

function DividendTable({
  dividends,
  ticker,
  onEdit,
  onDelete,
}: {
  dividends: DividendWithAccount[]
  ticker: string | null
  onEdit: (d: DividendWithAccount) => void
  onDelete: (d: DividendWithAccount) => void
}) {
  const { t } = useTranslation()
  const [sortCol, setSortCol] = useState<SortCol>('payDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  function toggleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setVisibleCount(PAGE_SIZE)
  }

  const filtered = useMemo(() => {
    const base = ticker ? dividends.filter((d) => d.ticker === ticker) : dividends
    return [...base].sort((a, b) => {
      const cmp =
        sortCol === 'ticker'
          ? a.ticker.localeCompare(b.ticker)
          : a.payDate.localeCompare(b.payDate)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [dividends, ticker, sortCol, sortDir])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length))
  }, [filtered.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  if (!filtered.length) {
    return <p className="text-muted-foreground text-sm py-6">{t('dividend.noDividends')}</p>
  }

  return (
    <div>
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
          {visible.map((d) => (
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
                  `$${Number(d.totalAmount ?? '0').toFixed(2)}`
                )}
              </TableCell>
              <TableCell>
                <span className={`capitalize text-sm font-medium ${statusBadgeClass(d.status)}`}>
                  {statusLabel(d.status, t)}
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
      {hasMore && <div ref={sentinelRef} className="h-8" />}
    </div>
  )
}

// ── Log Dividend form ─────────────────────────────────────────────────────────

type CreateFormValues = {
  accountId: string
  ticker: string
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

  const accountId = watch('accountId')
  const status = watch('status')
  const isProjected = status === 'projected'

  const { data: allAccounts } = useQuery({
    queryKey: ['accounts', 'all'],
    queryFn: getAllAccounts,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>{t('account.account')}</Label>
          <Select
            value={accountId}
            onValueChange={(v) => { setValue('accountId', v); setValue('ticker', '') }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('dividend.selectAccount')} />
            </SelectTrigger>
            <SelectContent>
              {allAccounts?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.portfolioName})
                </SelectItem>
              ))}
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
          <Input type="number" step="any" placeholder={t('dividend.amountPerSharePlaceholder')} {...register('amountPerShare', { required: !isProjected && t('common.required') })} />
          {errors.amountPerShare && <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.totalPayout')}</Label>
          <Input type="number" step="any" placeholder={t('dividend.totalPayoutPlaceholder')} {...register('totalAmount', { required: !isProjected && t('common.required') })} />
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

// ── Edit form ─────────────────────────────────────────────────────────────────

type EditFormValues = {
  status: DividendStatus
  payDate: string
  amountPerShare: string
  totalAmount: string
  projectedPerShare: string
  projectedPayout: string
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
          <Input type="number" step="any" {...register('amountPerShare', { required: !isProjected && t('common.required') })} />
          {errors.amountPerShare && <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('dividend.totalPayout')}</Label>
          <Input type="number" step="any" {...register('totalAmount', { required: !isProjected && t('common.required') })} />
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function Dividends() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const currentYear = new Date().getFullYear()

  const [tickerFilter, setTickerFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DividendWithAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DividendWithAccount | null>(null)

  const { data: dividends, isPending: dividendsPending } = useQuery({
    queryKey: ['dividends', 'all'],
    queryFn: getAllDividends,
  })

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  })

  const tickers = useMemo(
    () => [...new Set((dividends ?? []).map((d) => d.ticker))].sort(),
    [dividends],
  )

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: ['dividends', 'all'] })
    void qc.invalidateQueries({ queryKey: ['dividends', 'account'] })
    void qc.invalidateQueries({ queryKey: ['dashboardSummary'] })
  }

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) => {
      const isProjected = values.status === 'projected'
      return createDividend(values.accountId, {
        ticker: values.ticker,
        amountPerShare: isProjected ? null : values.amountPerShare || null,
        totalAmount: isProjected ? null : values.totalAmount || null,
        payDate: values.payDate,
        projectedPerShare: values.projectedPerShare || null,
        projectedPayout: values.projectedPayout || null,
        status: values.status,
      })
    },
    onSuccess: () => { invalidateAll(); setCreateOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EditFormValues }) => {
      const isProjected = values.status === 'projected'
      return updateDividend(id, {
        amountPerShare: isProjected ? null : values.amountPerShare || undefined,
        totalAmount: isProjected ? null : values.totalAmount || undefined,
        payDate: values.payDate,
        projectedPerShare: values.projectedPerShare || null,
        projectedPayout: values.projectedPayout || null,
        status: values.status,
      })
    },
    onSuccess: () => { invalidateAll(); setEditTarget(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDividend,
    onSuccess: () => { invalidateAll(); setDeleteTarget(null) },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{t('dividend.dividends')}</h1>
        <div className="flex items-center gap-2">
          <Select
            value={tickerFilter ?? 'all'}
            onValueChange={(v) => setTickerFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dividend.allTickers')}</SelectItem>
              {tickers.map((ticker) => (
                <SelectItem key={ticker} value={ticker}>{ticker}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t('dividend.logDividend')}
          </Button>
        </div>
      </div>

      {/* ── Monthly income chart ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('dividend.monthlyIncome')}
        </h2>
        {dividendsPending ? (
          <Skeleton className="h-60 rounded-xl" />
        ) : (
          <MonthlyIncomeBarChart dividends={dividends ?? []} ticker={tickerFilter} />
        )}
      </section>

      {/* ── Annual income chart ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('dividend.annualIncome')}
        </h2>
        {dividendsPending ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <AnnualIncomeBarChart dividends={dividends ?? []} ticker={tickerFilter} />
        )}
      </section>

      {/* ── Stat cards ── */}
      {summaryPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label={t('dividend.ytdIncome')} value={fmt(summary?.ytdIncome ?? 0)} sub={`${currentYear}`} />
          <StatCard label={t('dividend.allTimeIncome')} value={fmt(summary?.allTimeIncome ?? 0)} />
        </div>
      )}

      {/* ── Dividend log table ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('dividend.dividendHistory')}
        </h2>
        {dividendsPending ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <DividendTable
            dividends={dividends ?? []}
            ticker={tickerFilter}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </section>

      {/* ── Log Dividend dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('dividend.logDividend')}</DialogTitle></DialogHeader>
          <CreateDividendForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
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
                amountPerShare: editTarget.amountPerShare ?? '',
                totalAmount: editTarget.totalAmount ?? '',
                projectedPerShare: editTarget.projectedPerShare ?? '',
                projectedPayout: editTarget.projectedPayout ?? '',
              }}
              onSubmit={(values) => updateMutation.mutate({ id: editTarget.id, values })}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
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
