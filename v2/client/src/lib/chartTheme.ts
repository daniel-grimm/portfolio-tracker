/**
 * Central colour palette for D3 charts.
 *
 * All values are chosen to read well in both the light (Warm Porcelain) and
 * dark (Warm Graphite) themes.  Update here when the brand palette changes —
 * no need to touch individual chart components.
 */

/** Multi-series colours — account stacks in IncomeBarChart, etc. */
export const CHART_SERIES_COLORS = [
  '#E8920A', // marigold   (primary accent)
  '#78A86A', // warm green
  '#5A9AAC', // warm teal
  '#D4724A', // terracotta
  '#A06AB8', // warm purple
  '#C8A040', // warm gold
  '#6A8CC8', // slate blue
  '#C86A7A', // dusty rose
] as const

/** Gain / loss semantic colours (match CSS --gain / --loss vars) */
export const CHART_GAIN_COLOR  = '#78A86A'
export const CHART_LOSS_COLOR  = '#C96050'

/** Projection chart */
export const CHART_ACTUAL_COLOR    = '#78A86A'    // gain green — real paid income
export const CHART_PROJECTED_COLOR = '#E8920A99'  // marigold at ~60% opacity
export const CHART_DIVIDER_COLOR   = '#7A7068'    // warm muted

/** Portfolio value chart */
export const CHART_VALUE_LINE_COLOR     = '#E8920A'  // marigold — portfolio value
export const CHART_COST_LINE_COLOR      = '#7A7068'  // warm muted

/** Shared chart chrome (axes, grid, tooltips) */
export const CHART_GRID_COLOR          = '#3D352C33' // warm muted at ~20% — grid lines
export const CHART_AXIS_TEXT_COLOR     = '#8A7A65'   // warm muted — axis labels
export const CHART_TOOLTIP_BG          = 'rgba(30,26,20,0.93)' // near-black warm — tooltip bg
export const CHART_TOOLTIP_TEXT        = '#F0E8DC'   // warm off-white — tooltip text
export const CHART_FALLBACK_COLOR      = '#E8920A'   // marigold — fallback series color — cost basis
