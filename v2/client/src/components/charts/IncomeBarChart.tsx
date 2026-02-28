import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as d3 from 'd3'
import type { TTMIncomeData } from 'shared'
import { CHART_SERIES_COLORS, CHART_FALLBACK_COLOR } from '@/lib/chartTheme'

const MARGIN = { top: 20, right: 20, bottom: 50, left: 70 }
const HEIGHT = 260

const ACCOUNT_COLORS = CHART_SERIES_COLORS

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(year: number, month: number): string {
  return `${MONTH_SHORT[month - 1]} '${String(year).slice(2)}`
}

function formatY(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export function IncomeBarChart({ data }: { data: TTMIncomeData }) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const hasData = data.months.some((m) => m.total > 0)

  useEffect(() => {
    if (!svgRef.current || !hasData) return

    const container = svgRef.current.parentElement
    const width = container?.clientWidth ?? 700
    const innerWidth = width - MARGIN.left - MARGIN.right
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', HEIGHT)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const labels = data.months.map((m) => monthLabel(m.year, m.month))

    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([0, innerWidth])
      .paddingInner(0.25)
      .paddingOuter(0.1)

    const yMax = d3.max(data.months, (m) => m.total) ?? 0
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.15 || 10])
      .nice()
      .range([innerHeight, 0])

    const colorMap = new Map(
      data.accounts.map((a, i) => [a.accountId, ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]])
    )

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call((axis) => {
        axis.select('.domain').attr('stroke', 'var(--border)')
        axis.selectAll('text').attr('fill', 'var(--muted-foreground)').style('font-size', '11px')
      })

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((v) => formatY(v as number)))
      .call((axis) => {
        axis.select('.domain').attr('stroke', 'var(--border)')
        axis.selectAll('.tick line').attr('stroke', 'var(--border)').attr('x2', innerWidth).attr('opacity', 0.3)
        axis.selectAll('text').attr('fill', 'var(--muted-foreground)').style('font-size', '11px')
      })

    const tooltip = d3.select(tooltipRef.current!)

    // Stacked bars — one group per month
    data.months.forEach((month, mi) => {
      const label = labels[mi]
      const x = xScale(label) ?? 0
      const bw = xScale.bandwidth()

      let y0 = innerHeight // start from bottom

      month.byAccount.forEach(({ accountId, income }) => {
        if (income === 0) return
        const barHeight = innerHeight - yScale(income)
        const y1 = y0 - barHeight

        g.append('rect')
          .attr('x', x)
          .attr('y', y1)
          .attr('width', bw)
          .attr('height', barHeight)
          .attr('fill', colorMap.get(accountId) ?? CHART_FALLBACK_COLOR)
          .attr('rx', 0)
          .on('mousemove', (event: MouseEvent) => {
            const containerRect = svgRef.current!.parentElement!.getBoundingClientRect()
            const relX = event.clientX - containerRect.left
            const relY = event.clientY - containerRect.top

            const rows = month.byAccount
              .filter((a) => a.income > 0)
              .map(
                (a) =>
                  `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px">
                    <span style="display:flex;align-items:center;gap:4px">
                      <span style="width:8px;height:8px;border-radius:2px;background:${colorMap.get(a.accountId) ?? CHART_FALLBACK_COLOR};display:inline-block;flex-shrink:0"></span>
                      ${a.accountName}
                    </span>
                    <span>$${a.income.toFixed(2)}</span>
                  </div>`,
              )
              .join('')

            tooltip
              .style('opacity', '1')
              .style('left', `${relX + 12}px`)
              .style('top', `${relY - 20}px`)
              .html(
                `<div style="font-size:12px;font-weight:600;margin-bottom:6px">${label}</div>
                 ${rows}
                 <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;font-weight:600;margin-top:6px;border-top:1px solid var(--border);padding-top:4px">
                   <span>Total</span><span>$${month.total.toFixed(2)}</span>
                 </div>`,
              )
          })
          .on('mouseleave', () => tooltip.style('opacity', '0'))

        y0 = y1
      })
    })
  }, [data, hasData])

  if (!hasData) {
    return <p className="text-muted-foreground text-sm">{t('dashboard.noDividendData')}</p>
  }

  return (
    <div className="relative overflow-visible">
      <svg ref={svgRef} className="w-full block" />
      {/* Legend */}
      {data.accounts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-[70px] text-xs text-muted-foreground">
          {data.accounts.map((a, i) => (
            <span key={a.accountId} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-sm inline-block flex-shrink-0"
                style={{ background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}
              />
              {a.accountName}
            </span>
          ))}
        </div>
      )}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 bg-popover border rounded-md p-2 shadow-md transition-opacity z-10"
        style={{ minWidth: '160px' }}
      />
    </div>
  )
}
