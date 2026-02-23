import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { useQuery } from '@tanstack/react-query'
import { getValueHistory } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import type { ValueHistoryRange } from 'shared'

const MARGIN = { top: 20, right: 20, bottom: 40, left: 75 }
const HEIGHT = 280
const RANGES: ValueHistoryRange[] = ['1m', '3m', '6m', '1y', 'all']

export function PortfolioValueChart({ portfolioId }: { portfolioId: string }) {
  const [range, setRange] = useState<ValueHistoryRange>('1m')
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const { data, isPending } = useQuery({
    queryKey: ['valueHistory', portfolioId, range],
    queryFn: () => getValueHistory(portfolioId, range),
  })

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return

    const container = svgRef.current.parentElement
    const width = container?.clientWidth ?? 800
    const innerWidth = width - MARGIN.left - MARGIN.right
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', HEIGHT)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d')
    const parsed = data.map((d) => ({ ...d, parsedDate: parseDate(d.date)! }))

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(parsed, (d) => d.parsedDate) as [Date, Date])
      .range([0, innerWidth])

    const yMin = Math.min(
      d3.min(parsed, (d) => d.costBasis) ?? 0,
      d3.min(parsed, (d) => d.totalValue) ?? 0,
    )
    const yMax = d3.max(parsed, (d) => d.totalValue) ?? 0
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin * 0.97), yMax * 1.03])
      .nice()
      .range([innerHeight, 0])

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat(d3.timeFormat('%b %d') as (d: Date | d3.NumberValue) => string),
      )
      .select('.domain')
      .attr('stroke', 'hsl(var(--border))')

    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `$${d3.format(',.0f')(d as number)}`),
      )
      .select('.domain')
      .attr('stroke', 'hsl(var(--border))')

    // Cost basis line (dashed, muted)
    const costLine = d3
      .line<(typeof parsed)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScale(d.costBasis))

    g.append('path')
      .datum(parsed)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--muted-foreground))')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4')
      .attr('d', costLine)

    // Total value line — solid segments; partial segments get dashed
    const valueLine = d3
      .line<(typeof parsed)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScale(d.totalValue))

    // Draw solid line for full data
    const solidData = parsed.filter((d) => !d.isPartial)
    if (solidData.length > 1) {
      g.append('path')
        .datum(parsed) // draw the full path as base
        .attr('fill', 'none')
        .attr('stroke', 'hsl(var(--primary))')
        .attr('stroke-width', 2)
        .attr('d', valueLine)
    } else {
      g.append('path')
        .datum(parsed)
        .attr('fill', 'none')
        .attr('stroke', 'hsl(var(--primary))')
        .attr('stroke-width', 2)
        .attr('d', valueLine)
    }

    // Overlay dashed segments for partial data
    parsed.forEach((d, i) => {
      if (d.isPartial && i > 0) {
        g.append('circle')
          .attr('cx', xScale(d.parsedDate))
          .attr('cy', yScale(d.totalValue))
          .attr('r', 3)
          .attr('fill', 'none')
          .attr('stroke', 'hsl(var(--muted-foreground))')
          .attr('stroke-dasharray', '2,2')
      }
    })

    // Tooltip
    const tooltip = d3.select(tooltipRef.current!)
    const bisect = d3.bisector<(typeof parsed)[0], Date>((d) => d.parsedDate).left

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', (event: MouseEvent) => {
        const [mouseX] = d3.pointer(event)
        const x0 = xScale.invert(mouseX)
        const idx = bisect(parsed, x0, 1)
        const d0 = parsed[idx - 1]
        const d1 = parsed[idx]
        const d =
          d1 && x0.getTime() - d0.parsedDate.getTime() > d1.parsedDate.getTime() - x0.getTime()
            ? d1
            : d0

        const gainLoss = d.totalValue - d.costBasis
        const sign = gainLoss >= 0 ? '+' : ''
        const color = gainLoss >= 0 ? '#22c55e' : '#ef4444'
        const cx = MARGIN.left + xScale(d.parsedDate)
        const cy = MARGIN.top + yScale(d.totalValue)

        tooltip
          .style('opacity', '1')
          .style('left', `${Math.min(cx + 12, width - 160)}px`)
          .style('top', `${Math.max(cy - 60, 4)}px`).html(`
            <div style="font-size:11px;font-weight:600;margin-bottom:2px">${d.date}</div>
            <div style="font-size:11px">Value: $${d.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size:11px">Cost: $${d.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size:11px;color:${color}">${sign}$${Math.abs(gainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            ${d.isPartial ? '<div style="font-size:10px;opacity:0.6;margin-top:2px">Partial data</div>' : ''}
          `)
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0')
      })
  }, [data])

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              range === r
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      {isPending ? (
        <Skeleton className="rounded-xl" style={{ height: HEIGHT }} />
      ) : !data || data.length === 0 ? (
        <div
          className="flex items-center justify-center text-muted-foreground text-sm rounded-xl border"
          style={{ height: HEIGHT }}
        >
          No portfolio value history yet. Data appears after the server runs its startup sequence.
        </div>
      ) : (
        <div className="relative overflow-hidden">
          <svg ref={svgRef} className="w-full block" />
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none opacity-0 bg-popover border rounded-md p-2 shadow-md transition-opacity"
            style={{ minWidth: '145px' }}
          />
        </div>
      )}
    </div>
  )
}
