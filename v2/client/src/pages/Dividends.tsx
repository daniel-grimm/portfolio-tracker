import { useQuery } from '@tanstack/react-query'
import { getAllDividends } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DividendStatus } from 'shared'

function statusBadgeClass(status: DividendStatus) {
  if (status === 'paid') return 'text-green-600 dark:text-green-400'
  if (status === 'scheduled') return 'text-blue-600 dark:text-blue-400'
  return 'text-muted-foreground'
}

export function Dividends() {
  const { data: dividends, isPending } = useQuery({
    queryKey: ['dividends', 'all'],
    queryFn: getAllDividends,
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">All Dividends</h1>

      {isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !dividends || dividends.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No dividends logged yet. Add dividends from your account pages.
        </p>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
