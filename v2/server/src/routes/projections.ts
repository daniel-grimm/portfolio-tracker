import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getActiveDividendsForUser } from '../services/dividends.js'
import {
  buildChartData,
  buildHoldingProjections,
  buildExcluded,
} from '../services/projections.js'

const router = Router()

router.get(
  '/projections',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as typeof req & { user: { id: string } }).user.id
    const dividends = await getActiveDividendsForUser(db, userId)
    const today = new Date()

    const chartData = buildChartData(dividends, today)
    const holdingProjections = buildHoldingProjections(dividends, today)
    const excluded = buildExcluded(dividends)

    // TTM income: sum of actual paid dividends across the 12 past chart months
    const ttmIncome = chartData
      .filter((m) => m.isPast && m.actual !== null)
      .reduce((sum, m) => sum + (m.actual ?? 0), 0)

    const projectedAnnual = holdingProjections.reduce((sum, h) => sum + h.projectedAnnual, 0)
    const trend = projectedAnnual - ttmIncome
    const trendPct = ttmIncome > 0 ? (trend / ttmIncome) * 100 : 0

    res.json({
      data: {
        ttmIncome,
        projectedAnnual,
        trend,
        trendPct,
        chartData,
        holdingProjections,
        excluded,
      },
    })
  }),
)

export default router
