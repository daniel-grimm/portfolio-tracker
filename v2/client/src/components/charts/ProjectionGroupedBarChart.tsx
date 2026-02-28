import { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type { ProjectionChartMonth } from 'shared'
import {
  CHART_ACTUAL_COLOR,
  CHART_PROJECTED_COLOR,
  CHART_DIVIDER_COLOR,
  CHART_GRID_COLOR,
  CHART_AXIS_TEXT_COLOR,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_TEXT,
} from '@/lib/chartTheme'

const MARGIN = { top: 20, right: 20, bottom: 60, left: 70 }
const HEIGHT = 300
const ACTUAL_COLOR = CHART_ACTUAL_COLOR
const PROJECTED_COLOR = CHART_PROJECTED_COLOR
const DIVIDER_COLOR = CHART_DIVIDER_COLOR

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(year: number, month: number): string {
  const abbr = MONTH_SHORT[month - 1]
  return month === 1 ? `${abbr} '${String(year).slice(2)}` : abbr
}

function formatY(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function formatDollar(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

interface Props {
  chartData: ProjectionChartMonth[]
  onMonthClick: (month: ProjectionChartMonth) => void
}

export function ProjectionGroupedBarChart({ chartData, onMonthClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const render = useCallback(() => {
    if (!svgRef.current || !containerRef.current || chartData.length === 0) return

    const containerWidth = containerRef.current.clientWidth
    const width = containerWidth - MARGIN.left - MARGIN.right
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', containerWidth).attr('height', HEIGHT)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // x0: band scale per month group
    const labels = chartData.map((m) => `${m.year}-${m.month}`)
    const x0 = d3.scaleBand().domain(labels).range([0, width]).paddingInner(0.15).paddingOuter(0.05)

    // x1: sub-bands within each group (actual + projected)
    const x1 = d3.scaleBand().domain(['actual', 'projected']).range([0, x0.bandwidth()]).padding(0.05)

    // y: linear scale
    const maxVal = d3.max(chartData, (m) => Math.max(m.actual ?? 0, m.projected)) ?? 0
    const y = d3.scaleLinear().domain([0, maxVal * 1.1 || 1]).range([innerHeight, 0]).nice()

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => ''),
      )
      .call((axis) => axis.select('.domain').remove())
      .call((axis) => axis.selectAll('line').attr('stroke', CHART_GRID_COLOR).attr('stroke-dasharray', '3,3'))

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x0)
          .tickFormat((key) => {
            const [year, month] = (key as string).split('-').map(Number)
            return monthLabel(year, month)
          })
      )
      .call((axis) => axis.select('.domain').remove())
      .call((axis) => axis.selectAll('text')
        .attr('transform', 'rotate(-35)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.4em')
        .attr('dy', '0.6em')
        .style('font-size', '11px')
        .style('fill', CHART_AXIS_TEXT_COLOR),
      )
      .call((axis) => axis.selectAll('line').remove())

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat((v) => formatY(v as number)))
      .call((axis) => axis.select('.domain').remove())
      .call((axis) => axis.selectAll('line').remove())
      .call((axis) => axis.selectAll('text').style('fill', CHART_AXIS_TEXT_COLOR).style('font-size', '12px'))

    // "Today" divider between last past month (index 11) and first future month (index 12)
    const dividerIndex = 12
    if (dividerIndex < chartData.length) {
      const futureKey = `${chartData[dividerIndex].year}-${chartData[dividerIndex].month}`
      const xFuture = x0(futureKey) ?? 0
      const xPast = x0(`${chartData[dividerIndex - 1].year}-${chartData[dividerIndex - 1].month}`) ?? 0
      const xMid = xPast + x0.bandwidth() + (xFuture - xPast - x0.bandwidth()) / 2

      g.append('line')
        .attr('x1', xMid).attr('x2', xMid)
        .attr('y1', -8).attr('y2', innerHeight + 8)
        .attr('stroke', DIVIDER_COLOR)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.6)

      g.append('text')
        .attr('x', xMid)
        .attr('y', -12)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', DIVIDER_COLOR)
        .text('Today')
    }

    // Tooltip
    const tooltip = d3.select('body')
      .selectAll<HTMLDivElement, unknown>('.proj-chart-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'proj-chart-tooltip')
      .style('position', 'fixed')
      .style('background', CHART_TOOLTIP_BG)
      .style('color', CHART_TOOLTIP_TEXT)
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('z-index', '9999')
      .style('max-width', '200px')
      .style('line-height', '1.5')

    // Draw bars and click targets per month group
    const groups = g.selectAll<SVGGElement, ProjectionChartMonth>('.month-group')
      .data(chartData)
      .join('g')
      .attr('class', 'month-group')
      .attr('transform', (m) => `translate(${x0(`${m.year}-${m.month}`) ?? 0},0)`)
      .style('cursor', 'pointer')
      .on('click', (_event, m) => onMonthClick(m))
      .on('mousemove', (event: MouseEvent, m) => {
        const lines = [
          `<strong>${MONTH_SHORT[m.month - 1]} ${m.year}</strong>`,
          `Actual: ${m.actual !== null ? formatDollar(m.actual) : '—'}`,
          `Projected: ~${formatDollar(m.projected)}`,
        ]
        if (m.isPast && m.actual !== null) {
          const delta = m.actual - m.projected
          const sign = delta >= 0 ? '+' : ''
          lines.push(`Delta: ${sign}${formatDollar(delta)}`)
        }
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 10}px`)
          .html(lines.join('<br>'))
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))

    // Actual bar
    groups.append('rect')
      .attr('x', x1('actual') ?? 0)
      .attr('width', x1.bandwidth())
      .attr('y', (m) => y(m.actual ?? 0))
      .attr('height', (m) => Math.max(0, innerHeight - y(m.actual ?? 0)))
      .attr('fill', ACTUAL_COLOR)
      .attr('rx', 2)
      .attr('opacity', (m) => m.isPast ? 1 : 0.25)

    // Projected bar
    groups.append('rect')
      .attr('x', x1('projected') ?? 0)
      .attr('width', x1.bandwidth())
      .attr('y', (m) => y(m.projected))
      .attr('height', (m) => Math.max(0, innerHeight - y(m.projected)))
      .attr('fill', PROJECTED_COLOR)
      .attr('rx', 2)

    // Invisible full-height click area for easier interaction
    groups.append('rect')
      .attr('x', 0)
      .attr('width', x0.bandwidth())
      .attr('y', 0)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
  }, [chartData, onMonthClick])

  useEffect(() => {
    render()
    const observer = new ResizeObserver(render)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [render])

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-gain" />
          Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary/60" />
          Projected
        </span>
      </div>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
