import { useQuery } from '@tanstack/react-query'
import { getProjectedIncome } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectedIncomeChart } from '@/components/charts/ProjectedIncomeChart'

export function Projections() {
  const { data: projections, isPending } = useQuery({
    queryKey: ['projectedIncome'],
    queryFn: getProjectedIncome,
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Projections</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Projected Income — Next 12 Months</h2>
        {isPending ? (
          <Skeleton className="rounded-xl" style={{ height: 200 }} />
        ) : !projections || projections.every((p) => p.projectedIncome === 0) ? (
          <p className="text-muted-foreground text-sm">
            No projection data yet. At least 2 paid dividends per holding are needed.
          </p>
        ) : (
          <ProjectedIncomeChart projections={projections} />
        )}
      </section>
    </div>
  )
}
