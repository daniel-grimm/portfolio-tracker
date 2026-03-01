import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { makeAuthenticatedApp, makeUnauthenticatedApp } from '../helpers/app.js'
import { makeDividend } from '../helpers/factories.js'

vi.mock('../../server/src/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}))
import { requireAuth } from '../../server/src/middleware/auth.js'
const mockedRequireAuth = vi.mocked(requireAuth)

vi.mock('../../server/src/db/index.js', () => ({ db: {} }))

vi.mock('../../server/src/services/dividends.js', () => ({
  getActiveDividendsForUser: vi.fn(),
}))
import { getActiveDividendsForUser } from '../../server/src/services/dividends.js'
const mockedGetAll = vi.mocked(getActiveDividendsForUser)

import projectionsRouter from '../../server/src/routes/projections.js'

const now = new Date()
const makeDate = (monthOffset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 15)
  return d.toISOString().slice(0, 10)
}

// Two quarterly paid dividends for a holding — enough for projection
const quarterlyDividends = [
  makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: makeDate(-6), totalAmount: '100.000000', status: 'paid', accountName: 'Roth IRA' }),
  makeDividend({ accountId: 'acc1', ticker: 'VTI', payDate: makeDate(-3), totalAmount: '100.000000', status: 'paid', accountName: 'Roth IRA' }),
]

// Single paid dividend — insufficient for projection
const singleDividend = [
  makeDividend({ accountId: 'acc2', ticker: 'SCHD', payDate: makeDate(-2), totalAmount: '50.000000', status: 'paid', accountName: 'Taxable' }),
]

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireAuth.mockImplementation((req: Request, _res: Response, next: NextFunction) => {
    ;(req as Request & { user: { id: string } }).user = { id: 'test-user-id' }
    next()
  })
})

describe('GET /projections — unauthenticated', () => {
  it('returns 401 when not authenticated', async () => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
    const app = makeUnauthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    expect(res.status).toBe(401)
  })
})

describe('GET /projections — authenticated', () => {
  it('returns 200 with correct response shape', async () => {
    mockedGetAll.mockResolvedValue([])
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      ttmIncome: expect.any(Number),
      projectedAnnual: expect.any(Number),
      trend: expect.any(Number),
      trendPct: expect.any(Number),
      chartData: expect.any(Array),
      holdingProjections: expect.any(Array),
      excluded: expect.any(Array),
    })
  })

  it('chartData has exactly 24 entries', async () => {
    mockedGetAll.mockResolvedValue([])
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    expect(res.body.data.chartData).toHaveLength(24)
  })

  it('holdingProjections excludes holdings with < 2 paid dividends', async () => {
    mockedGetAll.mockResolvedValue(singleDividend)
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    expect(res.body.data.holdingProjections).toHaveLength(0)
  })

  it('excluded contains the holding with < 2 paid dividends', async () => {
    mockedGetAll.mockResolvedValue(singleDividend)
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    expect(res.body.data.excluded).toHaveLength(1)
    expect(res.body.data.excluded[0].ticker).toBe('SCHD')
  })

  it('ttmIncome sums paid dividends in past 12 months', async () => {
    mockedGetAll.mockResolvedValue(quarterlyDividends)
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    // Both quarterly dividends are within the last 12 months
    expect(res.body.data.ttmIncome).toBeCloseTo(200)
  })

  it('trend equals projectedAnnual minus ttmIncome', async () => {
    mockedGetAll.mockResolvedValue(quarterlyDividends)
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    const { trend, projectedAnnual, ttmIncome } = res.body.data
    expect(trend).toBeCloseTo(projectedAnnual - ttmIncome, 2)
  })

  it('holdings with sufficient data appear in holdingProjections', async () => {
    mockedGetAll.mockResolvedValue(quarterlyDividends)
    const app = makeAuthenticatedApp()
    app.use('/api/v1', projectionsRouter)
    const res = await request(app).get('/api/v1/projections')
    expect(res.body.data.holdingProjections).toHaveLength(1)
    expect(res.body.data.holdingProjections[0].ticker).toBe('VTI')
  })
})
