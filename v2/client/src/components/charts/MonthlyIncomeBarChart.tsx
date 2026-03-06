import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { DividendWithAccount } from 'shared'
import { CHART_ACTUAL_COLOR } from '@/lib/chartTheme'

const MARGIN = { top: 20, right: 20, bottom: 50, left: 70 }
const HEIGHT = 240

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatY(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

interface MonthBucket {
  key: string // YYYY-MM
  year: number
  month: number
  total: number
}

export function MonthlyIncomeBarChart({
  dividends,
  ticker,
}: {
  dividends: DividendWithAccount[]
  ticker: string | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const buckets = useMemo<MonthBucket[]>(() => {
    const filtered = dividends.filter(
      (d) => d.status === 'paid' && (ticker === null || d.ticker === ticker),
    )
    const map = new Map<string, MonthBucket>()
    for (const d of filtered) {
      const [y, m] = d.payDate.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      const existing = map.get(key)
      const amount = parseFloat(d.totalAmount ?? '0')
      if (existing) {
        existing.total += amount
      } else {
        map.set(key, { key, year: y, month: m, total: amount })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [dividends, ticker])

  useEffect(() => {
    if (!svgRef.current || buckets.length === 0) return

    const container = svgRef.current.parentElement
    const width = container?.clientWidth ?? 700
    const innerWidth = width - MARGIN.left - MARGIN.right
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', HEIGHT)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const xScale = d3
      .scaleBand()
      .domain(buckets.map((b) => b.key))
      .range([0, innerWidth])
      .paddingInner(0.2)
      .paddingOuter(0.1)

    const yMax = d3.max(buckets, (b) => b.total) ?? 0
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.15 || 10])
      .nice()
      .range([innerHeight, 0])

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((v) => formatY(v as number)))
      .call((axis) => {
        axis.select('.domain').attr('stroke', 'var(--border)')
        axis.selectAll('.tick line').attr('stroke', 'var(--border)').attr('x2', innerWidth).attr('opacity', 0.3)
        axis.selectAll('text').attr('fill', 'var(--muted-foreground)').style('font-size', '11px')
      })

    // X axis — show label only for Jan (with year) or when bucket count is small
    const showAll = buckets.length <= 24
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickSize(0).tickFormat((key) => {
          const b = buckets.find((b) => b.key === key)
          if (!b) return ''
          if (b.month === 1 || showAll) {
            return b.month === 1
              ? `Jan '${String(b.year).slice(2)}`
              : MONTH_SHORT[b.month - 1]
          }
          return ''
        }),
      )
      .call((axis) => {
        axis.select('.domain').attr('stroke', 'var(--border)')
        axis.selectAll('text').attr('fill', 'var(--muted-foreground)').style('font-size', '11px')
      })

    const tooltip = d3.select(tooltipRef.current!)

    // Bars
    g.selectAll('rect')
      .data(buckets)
      .join('rect')
      .attr('x', (b) => xScale(b.key) ?? 0)
      .attr('y', (b) => yScale(b.total))
      .attr('width', xScale.bandwidth())
      .attr('height', (b) => innerHeight - yScale(b.total))
      .attr('fill', CHART_ACTUAL_COLOR)
      .attr('rx', 2)
      .on('mousemove', (event: MouseEvent, b) => {
        const containerRect = svgRef.current!.parentElement!.getBoundingClientRect()
        const relX = event.clientX - containerRect.left
        const relY = event.clientY - containerRect.top
        const label = `${MONTH_SHORT[b.month - 1]} ${b.year}`
        tooltip
          .style('opacity', '1')
          .style('left', `${relX + 12}px`)
          .style('top', `${relY - 20}px`)
          .html(
            `<div style="font-size:12px;font-weight:600;margin-bottom:4px">${label}</div>
             <div style="font-size:11px">$${b.total.toFixed(2)}</div>`,
          )
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))
  }, [buckets])

  if (buckets.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No paid dividends yet.</p>
  }

  return (
    <div className="relative overflow-x-auto">
      <svg ref={svgRef} className="block" style={{ minWidth: `${Math.max(buckets.length * 28 + 90, 300)}px`, width: '100%' }} />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 bg-popover border rounded-md p-2 shadow-md transition-opacity z-10"
        style={{ minWidth: '120px' }}
      />
    </div>
  )
}
