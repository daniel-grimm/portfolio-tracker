import { useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Holding, Dividend, DividendStatus } from 'shared'
import {
  getAccount,
  getHoldings,
  createHolding,
  getLatestPrice,
  getDividendsForAccount,
  createDividend,
  updateDividend,
  deleteDividend,
} from '@/lib/api'
import { CsvImportModal } from '@/components/CsvImportModal'
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
  ticker: string
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
  const uniqueTickers = useMemo(() => {
    const map = new Map<string, number>()
    for (const h of holdings) {
      map.set(h.ticker, (map.get(h.ticker) ?? 0) + Number(h.shares))
    }
    return Array.from(map.entries())
  }, [holdings])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DividendFormValues>({
    defaultValues: defaultValues ?? {
      ticker: holdings[0]?.ticker ?? '',
      amountPerShare: '',
      exDate: '',
      payDate: '',
      recordDate: '',
      status: 'scheduled',
    },
  })

  const statusValue = watch('status')
  const tickerValue = watch('ticker')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {!defaultValues && (
          <div className="space-y-1 col-span-2">
            <Label>Ticker</Label>
            <Select
              value={tickerValue}
              onValueChange={(v) => setValue('ticker', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ticker" />
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

type AggregatedRow = {
  ticker: string
  totalShares: number
  weightedAvgCostBasis: number
}

type SortKey =
  | 'ticker'
  | 'totalShares'
  | 'weightedAvgCostBasis'
  | 'currentPrice'
  | 'value'
  | 'gainLoss'
  | 'returnPct'

type EnrichedRow = AggregatedRow & {
  currentPrice: number | null
  value: number | null
  gainLoss: number | null
  returnPct: number | null
}

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

  const aggregatedHoldings = useMemo<AggregatedRow[]>(() => {
    if (!holdings) return []
    const map = new Map<string, { totalShares: number; weightedSum: number }>()
    for (const h of holdings) {
      const shares = Number(h.shares)
      const cost = Number(h.avgCostBasis)
      const existing = map.get(h.ticker) ?? { totalShares: 0, weightedSum: 0 }
      map.set(h.ticker, {
        totalShares: existing.totalShares + shares,
        weightedSum: existing.weightedSum + shares * cost,
      })
    }
    return Array.from(map.entries()).map(([ticker, { totalShares, weightedSum }]) => ({
      ticker,
      totalShares,
      weightedAvgCostBasis: totalShares > 0 ? weightedSum / totalShares : 0,
    }))
  }, [holdings])

  const enrichedHoldings = useMemo<EnrichedRow[]>(() => {
    return aggregatedHoldings.map((row) => {
      const priceData = priceByTicker.get(row.ticker)
      if (!priceData) return { ...row, currentPrice: null, value: null, gainLoss: null, returnPct: null }
      const price = Number(priceData.closePrice)
      const value = row.totalShares * price
      const gainLoss = (price - row.weightedAvgCostBasis) * row.totalShares
      const returnPct = row.weightedAvgCostBasis > 0
        ? ((price - row.weightedAvgCostBasis) / row.weightedAvgCostBasis) * 100
        : null
      return { ...row, currentPrice: price, value, gainLoss, returnPct }
    })
  }, [aggregatedHoldings, priceByTicker])

  const sortedHoldings = useMemo(() => {
    return [...enrichedHoldings].sort((a, b) => {
      let cmp: number
      if (sortKey === 'ticker') {
        cmp = a.ticker.localeCompare(b.ticker)
      } else {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av === null && bv === null) cmp = 0
        else if (av === null) return 1
        else if (bv === null) return -1
        else cmp = av - bv
      }
      return sortAsc ? cmp : -cmp
    })
  }, [enrichedHoldings, sortKey, sortAsc])

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const handleImported = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['holdings', id] })
    void qc.invalidateQueries({ queryKey: ['allHoldings'] })
  }, [qc, id])

  const createMutation = useMutation({
    mutationFn: (values: HoldingFormValues) => createHolding(id!, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holdings', id] })
      void qc.invalidateQueries({ queryKey: ['allHoldings'] })
      setCreateOpen(false)
    },
  })

  // Dividend state
  const [createDivOpen, setCreateDivOpen] = useState(false)
  const [editDivTarget, setEditDivTarget] = useState<Dividend | null>(null)
  const [deleteDivTarget, setDeleteDivTarget] = useState<Dividend | null>(null)

  const createDivMutation = useMutation({
    mutationFn: (values: DividendFormValues) =>
      createDividend(id!, {
        ticker: values.ticker,
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              Import from CSV
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Add Holding
            </Button>
          </div>
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
                  <SortHeader col="totalShares" label="Shares" />
                  <SortHeader col="weightedAvgCostBasis" label="Avg Cost" />
                  <SortHeader col="currentPrice" label="Current Price" />
                  <SortHeader col="value" label="Value" />
                  <SortHeader col="gainLoss" label="Gain/Loss" />
                  <SortHeader col="returnPct" label="Return %" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((row) => (
                  <TableRow key={row.ticker}>
                    <TableCell className="font-medium">{row.ticker}</TableCell>
                    <TableCell>{row.totalShares.toLocaleString()}</TableCell>
                    <TableCell>${row.weightedAvgCostBasis.toFixed(2)}</TableCell>
                    {row.currentPrice === null ? (
                      <>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                      </>
                    ) : (() => {
                      const priceData = priceByTicker.get(row.ticker)
                      const isStale = priceData?.date !== today
                      return (
                        <>
                          <TableCell>
                            <span className={isStale ? 'text-muted-foreground' : ''}>
                              ${row.currentPrice.toFixed(2)}
                              {isStale && (
                                <span className="ml-1 text-xs text-yellow-500" title={`As of ${priceData?.date}`}>
                                  ●
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>${row.value!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className={row.gainLoss! >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {row.gainLoss! >= 0 ? '+' : ''}${Math.abs(row.gainLoss!).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={(row.returnPct ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {(row.returnPct ?? 0) >= 0 ? '+' : ''}{(row.returnPct ?? 0).toFixed(2)}%
                          </TableCell>
                        </>
                      )
                    })()}
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
                ticker: editDivTarget.ticker,
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

      {id && (
        <CsvImportModal
          accountId={id}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={handleImported}
        />
      )}

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
