import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getDashboardCalendar } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Dividend } from 'shared'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function statusColor(status: Dividend['status']) {
  if (status === 'paid') return 'bg-green-500'
  if (status === 'scheduled') return 'bg-primary'
  return 'bg-muted-foreground'
}

function DayCell({
  day,
  dividends,
}: {
  day: number | null
  dividends: Dividend[]
}) {
  const hasDivs = dividends.length > 0

  if (!day) {
    return <div className="min-h-[72px] rounded-md" />
  }

  const content = (
    <div
      className={`min-h-[72px] rounded-md border p-1.5 text-sm flex flex-col gap-1 ${hasDivs ? 'border-primary/30 bg-primary/5' : ''}`}
    >
      <span className="text-xs font-medium text-muted-foreground">{day}</span>
      {dividends.slice(0, 3).map((d) => (
        <div
          key={d.id}
          className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-white font-medium ${statusColor(d.status)}`}
        >
          <span className="truncate">{d.ticker}</span>
          <span className="ml-auto shrink-0">${parseFloat(d.totalAmount).toFixed(2)}</span>
        </div>
      ))}
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
            {MONTH_NAMES[dividends[0].payDate.split('-')[1] ? parseInt(dividends[0].payDate.split('-')[1]) - 1 : 0]}{' '}
            {day} — {dividends.length} dividend{dividends.length > 1 ? 's' : ''}
          </p>
          {dividends.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <div>
                <span className="font-medium">{d.ticker}</span>
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full text-white ${statusColor(d.status)}`}
                >
                  {d.status}
                </span>
              </div>
              <div className="text-right">
                <p className="font-medium">${parseFloat(d.totalAmount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  ${parseFloat(d.amountPerShare).toFixed(4)}/sh
                </p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function Calendar() {
  const [params, setParams] = useSearchParams()
  const now = new Date()

  const year = parseInt(params.get('year') ?? '') || now.getFullYear()
  const month = parseInt(params.get('month') ?? '') || now.getMonth() + 1

  const { data: calendarDays, isPending } = useQuery({
    queryKey: ['dashboardCalendar', year, month],
    queryFn: () => getDashboardCalendar(year, month),
  })

  function navigate(delta: number) {
    let y = year
    let m = month + delta
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setParams({ year: String(y), month: String(m) })
  }

  // Build dividend map keyed by day-of-month
  const dividendsByDay = new Map<number, Dividend[]>()
  for (const entry of calendarDays ?? []) {
    const day = parseInt(entry.date.split('-')[2])
    dividendsByDay.set(day, entry.dividends)
  }

  // Calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()

  // Pad start
  const cells: Array<number | null> = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dividend Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            ‹ Prev
          </Button>
          <span className="text-sm font-medium w-36 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            Next ›
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Paid
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Scheduled
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> Projected
        </span>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isPending ? (
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
    </div>
  )
}
