import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { makeAuthenticatedApp, makeUnauthenticatedApp } from '../helpers/app.js'

vi.mock('../../server/src/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}))
import { requireAuth } from '../../server/src/middleware/auth.js'
const mockedRequireAuth = vi.mocked(requireAuth)

vi.mock('../../server/src/db/index.js', () => ({ db: {} }))

vi.mock('../../server/src/services/dividends.js', () => ({
  getAllDividendsForUser: vi.fn(),
}))
import { getAllDividendsForUser } from '../../server/src/services/dividends.js'

vi.mock('../../server/src/services/portfolios.js', () => ({
  getUserPortfolios: vi.fn(),
}))
import { getUserPortfolios } from '../../server/src/services/portfolios.js'

vi.mock('../../server/src/services/portfolioValue.js', () => ({
  getPortfolioValueHistory: vi.fn(),
}))
import { getPortfolioValueHistory } from '../../server/src/services/portfolioValue.js'

import dashboardRouter from '../../server/src/routes/dashboard.js'

const mockDividends = [
  {
    id: 'd1',
    holdingId: 'h1',
    ticker: 'VTI',
    amountPerShare: '0.5',
    totalAmount: '50.00',
    exDate: '2026-01-10',
    payDate: '2026-01-15',
    recordDate: null,
    status: 'paid' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockPortfolios = [
  { id: 'port-1', userId: 'test-user-id', name: 'Retirement', description: null, createdAt: new Date(), updatedAt: new Date() },
]

const mockHistory = [
  { date: '2026-02-01', totalValue: 10000, costBasis: 8000, isPartial: false },
]

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1', dashboardRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api/v1', dashboardRouter)
  return app
}

// ── 401 without auth ──────────────────────────────────────────────────────────

describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Unauthorized' })
      },
    )
  })

  it('GET /dashboard/summary returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/dashboard/summary').expect(401)
  })

  it('GET /dashboard/calendar returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/dashboard/calendar').expect(401)
  })

  it('GET /dashboard/projected-income returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/dashboard/projected-income').expect(401)
  })
})

// ── authenticated routes ──────────────────────────────────────────────────────

describe('GET /api/v1/dashboard/summary', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(getAllDividendsForUser).mockResolvedValue(mockDividends)
    vi.mocked(getUserPortfolios).mockResolvedValue(mockPortfolios)
    vi.mocked(getPortfolioValueHistory).mockResolvedValue(mockHistory)
  })

  it('returns 200 with summary shape', async () => {
    const res = await request(authedApp()).get('/api/v1/dashboard/summary').expect(200)
    expect(res.body.data).toMatchObject({
      ytdIncome: expect.any(Number),
      allTimeIncome: expect.any(Number),
      projectedAnnual: expect.any(Number),
      portfolioBreakdown: expect.any(Array),
    })
  })

  it('includes portfolio breakdown with gain/loss', async () => {
    const res = await request(authedApp()).get('/api/v1/dashboard/summary').expect(200)
    const breakdown = res.body.data.portfolioBreakdown as Array<{
      id: string; name: string; totalValue: number; costBasis: number; gainLoss: number
    }>
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0]).toMatchObject({
      id: 'port-1',
      name: 'Retirement',
      totalValue: 10000,
      costBasis: 8000,
      gainLoss: 2000,
    })
  })

  it('handles portfolio with no value history', async () => {
    vi.mocked(getPortfolioValueHistory).mockResolvedValue([])
    const res = await request(authedApp()).get('/api/v1/dashboard/summary').expect(200)
    expect(res.body.data.portfolioBreakdown[0]).toMatchObject({
      totalValue: 0,
      costBasis: 0,
      gainLoss: 0,
    })
  })
})

describe('GET /api/v1/dashboard/calendar', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(getAllDividendsForUser).mockResolvedValue(mockDividends)
  })

  it('returns 200 with calendar array', async () => {
    const res = await request(authedApp())
      .get('/api/v1/dashboard/calendar?year=2026&month=1')
      .expect(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data[0]).toMatchObject({ date: '2026-01-15', dividends: expect.any(Array) })
  })

  it('returns empty array when no dividends in month', async () => {
    const res = await request(authedApp())
      .get('/api/v1/dashboard/calendar?year=2025&month=6')
      .expect(200)
    expect(res.body.data).toEqual([])
  })
})

describe('GET /api/v1/dashboard/projected-income', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(getAllDividendsForUser).mockResolvedValue(mockDividends)
  })

  it('returns 200 with 12 MonthlyProjection entries', async () => {
    const res = await request(authedApp())
      .get('/api/v1/dashboard/projected-income')
      .expect(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(12)
    expect(res.body.data[0]).toMatchObject({
      year: expect.any(Number),
      month: expect.any(Number),
      projectedIncome: expect.any(Number),
    })
  })
})
