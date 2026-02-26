import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import type { Dividend, DividendWithAccount, DividendStatus } from 'shared'
import { Pencil, Trash2 } from 'lucide-react'
import {
  getAllDividends,
  getPortfolios,
  getAccounts,
  getHoldings,
  createDividend,
  updateDividend,
  deleteDividend,
  getDashboardCalendar,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

// ── Calendar constants ────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Shared helpers ────────────────────────────────────────────────────────────

function statusColor(status: DividendStatus) {
  if (status === 'paid') return 'bg-green-500'
  if (status === 'scheduled') return 'bg-primary'
  return 'bg-amber-500'
}

function statusBadgeClass(status: DividendStatus) {
  if (status === 'paid') return 'text-green-600 dark:text-green-400'
  if (status === 'scheduled') return 'text-blue-600 dark:text-blue-400'
  return 'text-amber-500'
}

// ── Calendar components ───────────────────────────────────────────────────────

function DayCell({ day, dividends }: { day: number | null; dividends: Dividend[] }) {
  const hasDivs = dividends.length > 0
  const allProjected = hasDivs && dividends.every((d) => d.status === 'projected')

  if (!day) return <div className="min-h-[72px] rounded-md" />

  const cellBg = !hasDivs
    ? ''
    : allProjected
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-primary/30 bg-primary/5'

  const content = (
    <div className={`min-h-[72px] rounded-md border p-1.5 text-sm flex flex-col gap-1 ${cellBg}`}>
      <span className="text-xs font-medium text-muted-foreground">{day}</span>
      {dividends.slice(0, 3).map((d) => {
        const displayAmount =
          d.status === 'projected' && d.projectedPayout
            ? `~$${parseFloat(d.projectedPayout).toFixed(2)}`
            : `$${parseFloat(d.totalAmount).toFixed(2)}`
        return (
          <div
            key={d.id}
            className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-white font-medium ${statusColor(d.status)}`}
          >
            <span className="truncate">{d.ticker}</span>
            <span className="ml-auto shrink-0">{displayAmount}</span>
          </div>
        )
      })}
      {dividends.length > 3 && (
        <span className="text-[10px] text-muted-foreground">+{dividends.length - 3} more</span>
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
      <PopoverContent className="w-72" side="top">
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            {MONTH_NAMES[parseInt(dividends[0].payDate.split('-')[1]) - 1]}{' '}
            {day} — {dividends.length} dividend{dividends.length > 1 ? 's' : ''}
          </p>
          {dividends.map((d) => {
            const isProjected = d.status === 'projected'
            const totalDisplay = isProjected && d.projectedPayout
              ? `~$${parseFloat(d.projectedPayout).toFixed(2)}`
              : `$${parseFloat(d.totalAmount).toFixed(2)}`
            const perShareDisplay = isProjected && d.projectedPerShare
              ? `~$${parseFloat(d.projectedPerShare).toFixed(4)}/sh`
              : `$${parseFloat(d.amountPerShare).toFixed(4)}/sh`
            return (
              <div key={d.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                <div>
                  <span className="font-medium">{d.ticker}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full text-white ${statusColor(d.status)}`}>
                    {d.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{totalDisplay}</p>
                  <p className="text-xs text-muted-foreground">{perShareDisplay}</p>
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
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
          <Label>Portfolio</Label>
          <Select
            value={portfolioId}
            onValueChange={(v) => { setValue('portfolioId', v); setValue('accountId', ''); setValue('ticker', '') }}
          >
            <SelectTrigger><SelectValue placeholder="Select portfolio" /></SelectTrigger>
            <SelectContent>
              {portfolios?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 col-span-2">
          <Label>Account</Label>
          <Select
            value={accountId}
            disabled={!portfolioId}
            onValueChange={(v) => { setValue('accountId', v); setValue('ticker', '') }}
          >
            <SelectTrigger>
              <SelectValue placeholder={portfolioId ? 'Select account' : 'Select a portfolio first'} />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 col-span-2">
          <Label>Ticker</Label>
          <Select
            value={watch('ticker')}
            disabled={!accountId}
            onValueChange={(v) => setValue('ticker', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={accountId ? 'Select ticker' : 'Select an account first'} />
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
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as DividendStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Pay Date</Label>
          <Input type="date" {...register('payDate', { required: 'Required' })} />
          {errors.payDate && <p className="text-sm text-destructive">{errors.payDate.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Amount / Share</Label>
          <Input type="number" step="any" placeholder="0.50" {...register('amountPerShare', { required: 'Required' })} />
          {errors.amountPerShare && <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Total Payout</Label>
          <Input type="number" step="any" placeholder="5.00" {...register('totalAmount', { required: 'Required' })} />
          {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
        </div>

        {isProjected && (
          <>
            <div className="space-y-1">
              <Label>Projected / Share</Label>
              <Input type="number" step="any" placeholder="0.55" {...register('projectedPerShare')} />
            </div>
            <div className="space-y-1">
              <Label>Projected Payout</Label>
              <Input type="number" step="any" placeholder="8.25" {...register('projectedPayout')} />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || !accountId || !watch('ticker')}>
          {isSubmitting ? 'Saving…' : 'Save'}
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
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<EditFormValues>({ defaultValues })

  const status = watch('status')
  const isProjected = status === 'projected'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as DividendStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Pay Date</Label>
          <Input type="date" {...register('payDate', { required: 'Required' })} />
          {errors.payDate && <p className="text-sm text-destructive">{errors.payDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Amount / Share</Label>
          <Input type="number" step="any" {...register('amountPerShare', { required: 'Required' })} />
          {errors.amountPerShare && <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Total Payout</Label>
          <Input type="number" step="any" {...register('totalAmount', { required: 'Required' })} />
          {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
        </div>
        {isProjected && (
          <>
            <div className="space-y-1">
              <Label>Projected / Share</Label>
              <Input type="number" step="any" {...register('projectedPerShare')} />
            </div>
            <div className="space-y-1">
              <Label>Projected Payout</Label>
              <Input type="number" step="any" {...register('projectedPayout')} />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Dividends() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const now = new Date()

  const year = parseInt(params.get('year') ?? '') || now.getFullYear()
  const month = parseInt(params.get('month') ?? '') || now.getMonth() + 1

  const { data: calendarDays, isPending: calendarPending } = useQuery({
    queryKey: ['dashboardCalendar', year, month],
    queryFn: () => getDashboardCalendar(year, month),
  })

  const { data: dividends, isPending: dividendsPending } = useQuery({
    queryKey: ['dividends', 'all'],
    queryFn: getAllDividends,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DividendWithAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DividendWithAccount | null>(null)

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
  const dividendsByDay = new Map<number, Dividend[]>()
  for (const entry of calendarDays ?? []) {
    const day = parseInt(entry.date.split('-')[2])
    dividendsByDay.set(day, entry.dividends)
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
        <h1 className="text-2xl font-bold">Dividends</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Log Dividend
        </Button>
      </div>

      {/* ── Calendar ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              ‹ Prev
            </Button>
            <span className="text-sm font-medium w-36 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              Next ›
            </Button>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Paid
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Scheduled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Projected
            </span>
          </div>
        </div>

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
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Dividend Log ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dividend Log</h2>

        {dividendsPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : !dividends || dividends.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No dividends logged yet. Click "Log Dividend" to add one.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount/Share</TableHead>
                  <TableHead>Total Payout</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.ticker}</TableCell>
                    <TableCell className="text-muted-foreground">{d.accountName}</TableCell>
                    <TableCell>${Number(d.amountPerShare).toFixed(4)}</TableCell>
                    <TableCell>
                      {d.status === 'projected' && d.projectedPayout ? (
                        <span className="text-amber-500 italic">
                          ~${Number(d.projectedPayout).toFixed(2)}
                        </span>
                      ) : (
                        `$${Number(d.totalAmount).toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>{d.payDate}</TableCell>
                    <TableCell>
                      <span className={`capitalize text-sm font-medium ${statusBadgeClass(d.status)}`}>
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setEditTarget(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── Modals ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Dividend</DialogTitle></DialogHeader>
          <CreateDividendForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Dividend — {editTarget?.ticker}</DialogTitle>
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
            <AlertDialogTitle>Delete Dividend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{' '}
              <strong>{deleteTarget?.ticker}</strong> dividend (pay date:{' '}
              {deleteTarget?.payDate})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
