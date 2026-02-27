import { Router } from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getAllDividendsForUser } from '../services/dividends.js'
import { getUserPortfolios } from '../services/portfolios.js'
import { getPortfolioValueHistory } from '../services/portfolioValue.js'
import {
  calculateYTDIncome,
  calculateAllTimeIncome,
  calculateAnnualizedIncome,
} from '../services/calculations.js'
import { projectMonthlyIncome, buildDividendCalendar } from '../services/projections.js'
import { getTTMIncome } from '../services/dashboard.js'

const router = Router()

router.get(
  '/dashboard/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as typeof req & { user: { id: string } }).user.id

    const [dividends, portfolios] = await Promise.all([
      getAllDividendsForUser(db, userId),
      getUserPortfolios(db, userId),
    ])

    const ytdIncome = calculateYTDIncome(dividends)
    const allTimeIncome = calculateAllTimeIncome(dividends)
    const projectedAnnual = calculateAnnualizedIncome(dividends)

    const portfolioBreakdown = await Promise.all(
      portfolios.map(async (p) => {
        const history = await getPortfolioValueHistory(db, p.id, userId, '1m')
        const latest = history[history.length - 1]
        const totalValue = latest?.totalValue ?? 0
        const costBasis = latest?.costBasis ?? 0
        return {
          id: p.id,
          name: p.name,
          totalValue,
          costBasis,
          gainLoss: totalValue - costBasis,
        }
      }),
    )

    res.json({ data: { ytdIncome, allTimeIncome, projectedAnnual, portfolioBreakdown } })
  }),
)

router.get(
  '/dashboard/calendar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as typeof req & { user: { id: string } }).user.id
    const now = new Date()
    const year = parseInt(req.query['year'] as string) || now.getFullYear()
    const month = parseInt(req.query['month'] as string) || now.getMonth() + 1

    const dividends = await getAllDividendsForUser(db, userId)
    const calendar = buildDividendCalendar(dividends, year, month)

    res.json({ data: calendar })
  }),
)

router.get(
  '/dashboard/projected-income',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as typeof req & { user: { id: string } }).user.id
    const dividends = await getAllDividendsForUser(db, userId)
    const projections = projectMonthlyIncome(dividends, 12)
    res.json({ data: projections })
  }),
)

router.get(
  '/dashboard/ttm-income',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as typeof req & { user: { id: string } }).user.id
    const data = await getTTMIncome(db, userId)
    res.json({ data })
  }),
)

export default router
