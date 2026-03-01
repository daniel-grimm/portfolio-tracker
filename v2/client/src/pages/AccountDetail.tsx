import { useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DividendStatus } from 'shared'
import {
  getAccount,
  getHoldings,
  createHolding,
  getLatestPrice,
  getDividendsForAccount,
  disableAccount,
} from '@/lib/api'
import { CsvImportModal } from '@/components/CsvImportModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const { t } = useTranslation()
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
          <Label>{t('holding.ticker')}</Label>
          <Input
            placeholder={t('holding.tickerPlaceholder')}
            {...register('ticker', { required: t('common.required') })}
          />
          {errors.ticker && <p className="text-sm text-destructive">{errors.ticker.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('holding.shares')}</Label>
          <Input
            type="number"
            step="any"
            placeholder={t('holding.sharesPlaceholder')}
            {...register('shares', { required: t('common.required') })}
          />
          {errors.shares && <p className="text-sm text-destructive">{errors.shares.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>{t('holding.avgCostBasis')}</Label>
          <Input
            type="number"
            step="any"
            placeholder={t('holding.costBasisPlaceholder')}
            {...register('avgCostBasis', { required: t('common.required') })}
          />
          {errors.avgCostBasis && (
            <p className="text-sm text-destructive">{errors.avgCostBasis.message}</p>
          )}
        </div>
        <div className="space-y-1 col-span-2">
          <Label>{t('holding.purchaseDate')}</Label>
          <Input type="date" {...register('purchaseDate', { required: t('common.required') })} />
          {errors.purchaseDate && (
            <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.save')}
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
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()

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
  const [disableOpen, setDisableOpen] = useState(false)

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

  const disableMutation = useMutation({
    mutationFn: () => disableAccount(id!),
    onSuccess: (disabled) => {
      void qc.invalidateQueries({ queryKey: ['accounts', id] })
      void qc.invalidateQueries({ queryKey: ['accounts'] })
      void navigate(`/portfolios/${disabled.portfolioId}`)
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
    if (status === 'paid') return 'text-gain'
    if (status === 'scheduled') return 'text-blue-600 dark:text-blue-400'
    return 'text-amber-500'
  }

  const statusLabel = (status: DividendStatus): string => {
    if (status === 'paid') return t('dividend.statusPaid')
    if (status === 'scheduled') return t('dividend.statusScheduled')
    return t('dividend.statusProjected')
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
        <p className="text-destructive">{t('account.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{account.name}</h1>
            {account.disabledAt && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {t('account.disabled')}
              </span>
            )}
          </div>
          {account.description && (
            <p className="text-muted-foreground mt-1">{account.description}</p>
          )}
        </div>
        {!account.disabledAt && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDisableOpen(true)}
            disabled={disableMutation.isPending}
          >
            {disableMutation.isPending ? t('account.disabling') : t('account.disableAccount')}
          </Button>
        )}
      </div>

      {/* Holdings section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('holding.holdings')}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              {t('holding.importCsv')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('holding.addHolding')}
            </Button>
          </div>
        </div>

        {holdingsPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : sortedHoldings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('holding.noHoldings')}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader col="ticker" label={t('holding.ticker')} />
                  <SortHeader col="totalShares" label={t('holding.shares')} />
                  <SortHeader col="weightedAvgCostBasis" label={t('holding.avgCost')} />
                  <SortHeader col="currentPrice" label={t('holding.currentPrice')} />
                  <SortHeader col="value" label={t('holding.currentValue')} />
                  <SortHeader col="gainLoss" label={t('holding.unrealizedGainLoss')} />
                  <SortHeader col="returnPct" label={t('holding.returnPct')} />
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
                                <span className="ml-1 text-xs text-yellow-500" title={t('common.staleAsOf', { date: priceData?.date })}>
                                  ●
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>${row.value!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className={row.gainLoss! >= 0 ? 'text-gain' : 'text-loss'}>
                            {row.gainLoss! >= 0 ? '+' : ''}${Math.abs(row.gainLoss!).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={(row.returnPct ?? 0) >= 0 ? 'text-gain' : 'text-loss'}>
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
          <h2 className="text-lg font-semibold">{t('dividend.dividends')}</h2>
          <Link
            to="/dividends"
            className="text-sm text-primary hover:underline"
          >
            {t('dividend.manageDividends')}
          </Link>
        </div>

        {dividendsPending ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !dividends || dividends.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('dividend.noDividends')}{' '}
            <Link to="/dividends" className="text-primary hover:underline">
              {t('dividend.logOnDividendsPage')}
            </Link>
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dividend.ticker')}</TableHead>
                  <TableHead>{t('dividend.amountPerShareShort')}</TableHead>
                  <TableHead>{t('dividend.total')}</TableHead>
                  <TableHead>{t('dividend.payDate')}</TableHead>
                  <TableHead>{t('dividend.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.ticker}</TableCell>
                    <TableCell>${Number(d.amountPerShare).toFixed(4)}</TableCell>
                    <TableCell>${Number(d.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>{d.payDate}</TableCell>
                    <TableCell>
                      <span className={`capitalize text-sm font-medium ${statusBadgeClass(d.status)}`}>
                        {statusLabel(d.status)}
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
            <DialogTitle>{t('holding.addHolding')}</DialogTitle>
          </DialogHeader>
          <HoldingForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
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

      <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.disableAccount')}</AlertDialogTitle>
            <AlertDialogDescription
              dangerouslySetInnerHTML={{
                __html: t('account.disableConfirm', { name: account.name }),
              }}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => disableMutation.mutate()}
            >
              {t('account.disableAccount')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
