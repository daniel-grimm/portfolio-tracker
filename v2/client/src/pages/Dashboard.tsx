import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getAllDividends, getDashboardSummary, getTTMIncome, createPortfolio } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { IncomeBarChart } from '@/components/charts/IncomeBarChart'

type PortfolioFormValues = { name: string; description: string }

function PortfolioForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: PortfolioFormValues) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PortfolioFormValues>({ defaultValues: { name: '', description: '' } })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">{t('common.name')}</Label>
        <Input
          id="name"
          placeholder={t('portfolio.namePlaceholder')}
          {...register('name', { required: t('common.nameRequired') })}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">{t('common.description')}</Label>
        <Input id="description" placeholder={t('common.optional')} {...register('description')} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}


function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function Dashboard() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  })

  const { data: allDividends } = useQuery({
    queryKey: ['allDividends'],
    queryFn: getAllDividends,
  })

  const { data: ttmIncome, isPending: ttmPending } = useQuery({
    queryKey: ['ttm-income'],
    queryFn: getTTMIncome,
  })

  const createMutation = useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dashboardSummary'] })
      setCreateOpen(false)
    },
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
      <h1 className="text-2xl font-bold">{t('dashboard.dashboard')}</h1>

      {/* Portfolio breakdown */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('dashboard.portfolioBreakdown')}</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t('portfolio.newPortfolio')}
          </Button>
        </div>
        {summaryPending ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !summary?.portfolioBreakdown || summary.portfolioBreakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('portfolio.noPortfolios')}</p>
        ) : (
          <div className="rounded-md border divide-y">
            {summary.portfolioBreakdown.map((p) => (
              <Link
                key={p.id}
                to={`/portfolios/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <span className="font-medium">{p.name}</span>
                <div className="flex gap-6 text-sm text-right">
                  <div>
                    <p className="text-muted-foreground text-xs">{t('portfolio.value')}</p>
                    <p>{fmt(p.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('portfolio.cost')}</p>
                    <p>{fmt(p.costBasis)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('portfolio.gainLoss')}</p>
                    <p className={p.gainLoss >= 0 ? 'text-gain' : 'text-loss'}>
                      {p.gainLoss >= 0 ? '+' : ''}
                      {fmt(p.gainLoss)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Income bar chart */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('dashboard.incomeTrailing12')}</h2>
        {ttmPending ? (
          <Skeleton className="rounded-xl" style={{ height: 260 }} />
        ) : ttmIncome ? (
          <IncomeBarChart data={ttmIncome} />
        ) : null}
      </section>

      {/* Top dividend payers */}
      {topPayersList.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('dashboard.topDividendPayers')}</h2>
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

      {/* Create portfolio dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portfolio.newPortfolio')}</DialogTitle>
          </DialogHeader>
          <PortfolioForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
