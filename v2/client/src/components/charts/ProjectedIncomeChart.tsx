import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { MonthlyProjection } from 'shared'

const MARGIN = { top: 20, right: 20, bottom: 50, left: 70 }
const HEIGHT = 200
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ProjectedIncomeChart({ projections }: { projections: MonthlyProjection[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || projections.length === 0) return

    const container = svgRef.current.parentElement
    const width = container?.clientWidth ?? 700
    const innerWidth = width - MARGIN.left - MARGIN.right
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', HEIGHT)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const labels = projections.map((p) => `${MONTH_LABELS[p.month - 1]} ${p.year}`)

    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([0, innerWidth])
      .paddingInner(0.25)
      .paddingOuter(0.1)

    const yMax = d3.max(projections, (p) => p.projectedIncome) ?? 0
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.2 || 10])
      .nice()
      .range([innerHeight, 0])

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')

    g.select<SVGGElement>('.domain').attr('stroke', 'hsl(var(--border))')

    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(4)
          .tickFormat((d) => `$${d3.format(',.0f')(d as number)}`),
      )
      .select('.domain')
      .attr('stroke', 'hsl(var(--border))')

    const tooltip = d3.select(tooltipRef.current!)

    g.selectAll('.proj-bar')
      .data(projections)
      .join('rect')
      .attr('class', 'proj-bar')
      .attr('x', (_d, i) => xScale(labels[i]) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('y', (d) => yScale(d.projectedIncome))
      .attr('height', (d) => innerHeight - yScale(d.projectedIncome))
      .attr('fill', 'hsl(var(--primary))')
      .attr('opacity', 0.75)
      .attr('rx', 2)
      .on('mousemove', (event: MouseEvent, d) => {
        const label = `${MONTH_LABELS[d.month - 1]} ${d.year}`
        tooltip
          .style('opacity', '1')
          .style('left', `${(event.offsetX ?? 0) + 12}px`)
          .style('top', `${(event.offsetY ?? 0) - 40}px`)
          .html(
            `<div style="font-size:11px;font-weight:600">${label}</div><div style="font-size:11px">$${d.projectedIncome.toFixed(2)}</div>`,
          )
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'))
  }, [projections])

  return (
    <div className="relative overflow-hidden">
      <svg ref={svgRef} className="w-full block" />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 bg-popover border rounded-md p-2 shadow-md transition-opacity"
        style={{ minWidth: '120px' }}
      />
    </div>
  )
}
