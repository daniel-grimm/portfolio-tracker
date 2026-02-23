import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Holding, Dividend, DividendStatus } from 'shared'
import {
  getAccount,
  getHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  getLatestPrice,
  getDividendsForAccount,
  createDividend,
  updateDividend,
  deleteDividend,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type HoldingFormValues = {
  ticker: string
  shares: string
  avgCostBasis: string
  purchaseDate: string
}

function HoldingForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  defaultValues?: HoldingFormValues
  onSubmit: (values: HoldingFormValues) => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HoldingFormValues>({
    defaultValues: defaultValues ?? { ticker: '', shares: '', avgCostBasis: '', purchaseDate: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>Ticker</Label>
          <Input
            placeholder="e.g. AAPL"
            {...register('ticker', { required: 'Required' })}
          />
          {errors.ticker && <p className="text-sm text-destructive">{errors.ticker.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Shares</Label>
          <Input
            type="number"
            step="any"
            placeholder="10"
            {...register('shares', { required: 'Required' })}
          />
          {errors.shares && <p className="text-sm text-destructive">{errors.shares.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Avg Cost Basis</Label>
          <Input
            type="number"
            step="any"
            placeholder="150.00"
            {...register('avgCostBasis', { required: 'Required' })}
          />
          {errors.avgCostBasis && (
            <p className="text-sm text-destructive">{errors.avgCostBasis.message}</p>
          )}
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Purchase Date</Label>
          <Input type="date" {...register('purchaseDate', { required: 'Required' })} />
          {errors.purchaseDate && (
            <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

type DividendFormValues = {
  holdingId: string
  amountPerShare: string
  exDate: string
  payDate: string
  recordDate: string
  status: DividendStatus
}

function DividendForm({
  holdings,
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  holdings: Holding[]
  defaultValues?: DividendFormValues
  onSubmit: (values: DividendFormValues) => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DividendFormValues>({
    defaultValues: defaultValues ?? {
      holdingId: holdings[0]?.id ?? '',
      amountPerShare: '',
      exDate: '',
      payDate: '',
      recordDate: '',
      status: 'scheduled',
    },
  })

  const statusValue = watch('status')
  const holdingIdValue = watch('holdingId')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {!defaultValues && (
          <div className="space-y-1 col-span-2">
            <Label>Holding</Label>
            <Select
              value={holdingIdValue}
              onValueChange={(v) => setValue('holdingId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select holding" />
              </SelectTrigger>
              <SelectContent>
                {holdings.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.ticker} ({Number(h.shares).toLocaleString()} shares)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label>Amount / Share</Label>
          <Input
            type="number"
            step="any"
            placeholder="0.50"
            {...register('amountPerShare', { required: 'Required' })}
          />
          {errors.amountPerShare && (
            <p className="text-sm text-destructive">{errors.amountPerShare.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => setValue('status', v as DividendStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Ex-Dividend Date</Label>
          <Input type="date" {...register('exDate', { required: 'Required' })} />
          {errors.exDate && <p className="text-sm text-destructive">{errors.exDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Pay Date</Label>
          <Input type="date" {...register('payDate', { required: 'Required' })} />
          {errors.payDate && <p className="text-sm text-destructive">{errors.payDate.message}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Record Date (optional)</Label>
          <Input type="date" {...register('recordDate')} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

type SortKey = 'ticker' | 'shares' | 'avgCostBasis' | 'purchaseDate'

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: account, isPending: accountPending, isError } = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => getAccount(id!),
    enabled: Boolean(id),
  })

  const { data: holdings, isPending: holdingsPending } = useQuery({
    queryKey: ['holdings', id],
    queryFn: () => getHoldings(id!),
    enabled: Boolean(id),
  })

  const { data: dividends, isPending: dividendsPending } = useQuery({
    queryKey: ['dividends', 'account', id],
    queryFn: () => getDividendsForAccount(id!),
    enabled: Boolean(id),
  })

  // Fetch latest price for each unique ticker
  const tickers = useMemo(
    () => [...new Set(holdings?.map((h) => h.ticker) ?? [])],
    [holdings],
  )
  const priceQueries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ['prices', ticker],
      queryFn: () => getLatestPrice(ticker),
      enabled: tickers.length > 0,
    })),
  })
  const priceByTicker = useMemo(() => {
    const map = new Map<string, { closePrice: string; date: string } | null>()
    tickers.forEach((ticker, i) => {
      const data = priceQueries[i]?.data
      map.set(ticker, data ? { closePrice: data.closePrice, date: data.date } : null)
    })
    return map
  }, [tickers, priceQueries])

  const today = new Date().toISOString().slice(0, 10)

  const [sortKey, setSortKey] = useState<SortKey>('ticker')
  const [sortAsc, setSortAsc] = useState(true)

  const sortedHoldings = useMemo(() => {
    if (!holdings) return []
    return [...holdings].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp =
        sortKey === 'shares' || sortKey === 'avgCostBasis'
          ? Number(aVal) - Number(bVal)
          : String(aVal).localeCompare(String(bVal))
      return sortAsc ? cmp : -cmp
    })
  }, [holdings, sortKey, sortAsc])

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Holding | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Holding | null>(null)

  const createMutation = useMutation({
    mutationFn: (values: HoldingFormValues) => createHolding(id!, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holdings', id] })
      void qc.invalidateQueries({ queryKey: ['allHoldings'] })
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ hId, input }: { hId: string; input: HoldingFormValues }) =>
      updateHolding(hId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holdings', id] })
      void qc.invalidateQueries({ queryKey: ['allHoldings'] })
      setEditTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holdings', id] })
      void qc.invalidateQueries({ queryKey: ['allHoldings'] })
      setDeleteTarget(null)
    },
  })

  // Dividend state
  const [createDivOpen, setCreateDivOpen] = useState(false)
  const [editDivTarget, setEditDivTarget] = useState<Dividend | null>(null)
  const [deleteDivTarget, setDeleteDivTarget] = useState<Dividend | null>(null)

  const createDivMutation = useMutation({
    mutationFn: (values: DividendFormValues) =>
      createDividend(values.holdingId, {
        amountPerShare: values.amountPerShare,
        exDate: values.exDate,
        payDate: values.payDate,
        recordDate: values.recordDate || null,
        status: values.status,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dividends', 'account', id] })
      void qc.invalidateQueries({ queryKey: ['dividends', 'all'] })
      setCreateDivOpen(false)
    },
  })

  const updateDivMutation = useMutation({
    mutationFn: ({ dId, input }: { dId: string; input: DividendFormValues }) =>
      updateDividend(dId, {
        amountPerShare: input.amountPerShare,
        exDate: input.exDate,
        payDate: input.payDate,
        recordDate: input.recordDate || null,
        status: input.status,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dividends', 'account', id] })
      void qc.invalidateQueries({ queryKey: ['dividends', 'all'] })
      setEditDivTarget(null)
    },
  })

  const deleteDivMutation = useMutation({
    mutationFn: deleteDividend,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dividends', 'account', id] })
      void qc.invalidateQueries({ queryKey: ['dividends', 'all'] })
      setDeleteDivTarget(null)
    },
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortHeader({ col, label }: { col: SortKey; label: string }) {
    return (
      <TableHead
        className="cursor-pointer select-none"
        onClick={() => toggleSort(col)}
      >
        {label} {sortKey === col ? (sortAsc ? '↑' : '↓') : ''}
      </TableHead>
    )
  }

  const statusBadgeClass = (status: DividendStatus) => {
    if (status === 'paid') return 'text-green-600 dark:text-green-400'
    if (status === 'scheduled') return 'text-blue-600 dark:text-blue-400'
    return 'text-muted-foreground'
  }

  if (accountPending) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (isError || !account) {
    return (
      <div className="p-6">
        <p className="text-destructive">Account not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{account.name}</h1>
        {account.description && (
          <p className="text-muted-foreground mt-1">{account.description}</p>
        )}
      </div>

      {/* Holdings section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Holdings</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Add Holding
          </Button>
        </div>

        {holdingsPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : sortedHoldings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No holdings yet. Add one to start tracking.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader col="ticker" label="Ticker" />
                  <SortHeader col="shares" label="Shares" />
                  <SortHeader col="avgCostBasis" label="Avg Cost" />
                  <SortHeader col="purchaseDate" label="Purchase Date" />
                  <TableHead>Current Price</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Gain/Loss</TableHead>
                  <TableHead>Return %</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.ticker}</TableCell>
                    <TableCell>{Number(h.shares).toLocaleString()}</TableCell>
                    <TableCell>${Number(h.avgCostBasis).toFixed(2)}</TableCell>
                    <TableCell>{h.purchaseDate}</TableCell>
                    {(() => {
                      const priceData = priceByTicker.get(h.ticker)
                      if (!priceData) {
                        return (
                          <>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                          </>
                        )
                      }
                      const shares = Number(h.shares)
                      const price = Number(priceData.closePrice)
                      const cost = Number(h.avgCostBasis)
                      const value = shares * price
                      const gainLoss = (price - cost) * shares
                      const returnPct = cost > 0 ? ((price - cost) / cost) * 100 : 0
                      const isStale = priceData.date !== today
                      return (
                        <>
                          <TableCell>
                            <span className={isStale ? 'text-muted-foreground' : ''}>
                              ${price.toFixed(2)}
                              {isStale && (
                                <span className="ml-1 text-xs text-yellow-500" title={`As of ${priceData.date}`}>
                                  ●
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className={gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {gainLoss >= 0 ? '+' : ''}${Math.abs(gainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={returnPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                          </TableCell>
                        </>
                      )
                    })()}
                    <TableCell>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(h)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(h)}>
                          Delete
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

      {/* Dividends section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dividends</h2>
          <Button
            size="sm"
            onClick={() => setCreateDivOpen(true)}
            disabled={!holdings || holdings.length === 0}
          >
            Log Dividend
          </Button>
        </div>

        {dividendsPending ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !dividends || dividends.length === 0 ? (
          <p className="text-muted-foreground text-sm">No dividends logged yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Amount/Share</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ex-Date</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.ticker}</TableCell>
                    <TableCell>${Number(d.amountPerShare).toFixed(4)}</TableCell>
                    <TableCell>${Number(d.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>{d.exDate}</TableCell>
                    <TableCell>{d.payDate}</TableCell>
                    <TableCell>
                      <span className={`capitalize text-sm font-medium ${statusBadgeClass(d.status)}`}>
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditDivTarget(d)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteDivTarget(d)}>
                          Delete
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

      {/* Holding dialogs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
          </DialogHeader>
          <HoldingForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holding</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <HoldingForm
              defaultValues={{
                ticker: editTarget.ticker,
                shares: editTarget.shares,
                avgCostBasis: editTarget.avgCostBasis,
                purchaseDate: editTarget.purchaseDate,
              }}
              onSubmit={(values) => updateMutation.mutate({ hId: editTarget.id, input: values })}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holding</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.ticker}</strong>? All associated
              dividends will also be deleted. This action cannot be undone.
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

      {/* Dividend dialogs */}
      <Dialog open={createDivOpen} onOpenChange={setCreateDivOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Dividend</DialogTitle>
          </DialogHeader>
          {holdings && holdings.length > 0 && (
            <DividendForm
              holdings={holdings}
              onSubmit={(values) => createDivMutation.mutate(values)}
              isSubmitting={createDivMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDivTarget !== null} onOpenChange={(open) => !open && setEditDivTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dividend</DialogTitle>
          </DialogHeader>
          {editDivTarget && holdings && (
            <DividendForm
              holdings={holdings}
              defaultValues={{
                holdingId: editDivTarget.holdingId,
                amountPerShare: editDivTarget.amountPerShare,
                exDate: editDivTarget.exDate,
                payDate: editDivTarget.payDate,
                recordDate: editDivTarget.recordDate ?? '',
                status: editDivTarget.status,
              }}
              onSubmit={(values) =>
                updateDivMutation.mutate({ dId: editDivTarget.id, input: values })
              }
              isSubmitting={updateDivMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDivTarget !== null}
        onOpenChange={(open) => !open && setDeleteDivTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dividend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{' '}
              <strong>{deleteDivTarget?.ticker}</strong> dividend (pay date:{' '}
              {deleteDivTarget?.payDate})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDivMutation.isPending}
              onClick={() => deleteDivTarget && deleteDivMutation.mutate(deleteDivTarget.id)}
            >
              {deleteDivMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
