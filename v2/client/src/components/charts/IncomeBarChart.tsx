import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { Dividend } from 'shared'

const MARGIN = { top: 20, right: 20, bottom: 50, left: 70 }
const HEIGHT = 240

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type MonthData = { month: number; actual: number; projected: number }

function buildMonthData(dividends: Dividend[], year: number): MonthData[] {
  return MONTHS.map((_, idx) => {
    const month = idx + 1
    const paid = dividends
      .filter((d) => {
        const [y, m] = d.payDate.split('-').map(Number)
        return y === year && m === month && d.status === 'paid'
      })
      .reduce((s, d) => s + parseFloat(d.totalAmount), 0)
    const proj = dividends
      .filter((d) => {
        const [y, m] = d.payDate.split('-').map(Number)
        return y === year && m === month && (d.status === 'scheduled' || d.status === 'projected')
      })
      .reduce((s, d) => s + parseFloat(d.totalAmount), 0)
    return { month, actual: paid, projected: proj }
  })
}

export function IncomeBarChart({ dividends, year }: { dividends: Dividend[]; year: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const data = buildMonthData(dividends, year)
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
      .domain(MONTHS)
      .range([0, innerWidth])
      .paddingInner(0.25)
      .paddingOuter(0.1)

    const subScale = d3
      .scaleBand()
      .domain(['actual', 'projected'])
      .range([0, xScale.bandwidth()])
      .padding(0.05)

    const yMax = d3.max(data, (d) => Math.max(d.actual, d.projected)) ?? 0
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.15 || 10])
      .nice()
      .range([innerHeight, 0])

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .select('.domain')
      .attr('stroke', 'hsl(var(--border))')

    // Y axis
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `$${d3.format(',.0f')(d as number)}`),
      )
      .select('.domain')
      .attr('stroke', 'hsl(var(--border))')

    const tooltip = d3.select(tooltipRef.current!)

    // Bars
    const groups = g
      .selectAll('.month-group')
      .data(data)
      .join('g')
      .attr('class', 'month-group')
      .attr('transform', (d) => `translate(${xScale(MONTHS[d.month - 1]) ?? 0},0)`)

    groups
      .append('rect')
      .attr('x', subScale('actual') ?? 0)
      .attr('width', subScale.bandwidth())
      .attr('y', (d) => yScale(d.actual))
      .attr('height', (d) => innerHeight - yScale(d.actual))
      .attr('fill', 'hsl(var(--primary))')
      .attr('rx', 2)
      .on('mousemove', (event: MouseEvent, d) => {
        tooltip
          .style('opacity', '1')
          .style('left', `${(event.offsetX ?? 0) + 12}px`)
          .style('top', `${(event.offsetY ?? 0) - 40}px`)
          .html(
            `<div style="font-size:11px;font-weight:600">${MONTHS[d.month - 1]} Paid</div><div style="font-size:11px">$${d.actual.toFixed(2)}</div>`,
          )
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))

    groups
      .append('rect')
      .attr('x', subScale('projected') ?? 0)
      .attr('width', subScale.bandwidth())
      .attr('y', (d) => yScale(d.projected))
      .attr('height', (d) => innerHeight - yScale(d.projected))
      .attr('fill', 'hsl(var(--muted-foreground))')
      .attr('opacity', 0.5)
      .attr('rx', 2)
      .on('mousemove', (event: MouseEvent, d) => {
        tooltip
          .style('opacity', '1')
          .style('left', `${(event.offsetX ?? 0) + 12}px`)
          .style('top', `${(event.offsetY ?? 0) - 40}px`)
          .html(
            `<div style="font-size:11px;font-weight:600">${MONTHS[d.month - 1]} Scheduled</div><div style="font-size:11px">$${d.projected.toFixed(2)}</div>`,
          )
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))
  }, [dividends, year])

  return (
    <div className="relative overflow-hidden">
      <svg ref={svgRef} className="w-full block" />
      <div className="flex gap-4 mt-1 ml-[70px] text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-primary" /> Paid
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-muted-foreground opacity-50" />{' '}
          Scheduled/Projected
        </span>
      </div>
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 bg-popover border rounded-md p-2 shadow-md transition-opacity"
        style={{ minWidth: '120px' }}
      />
    </div>
  )
}
