import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { makeAuthenticatedApp, makeUnauthenticatedApp } from '../helpers/app.js'

vi.mock('../../server/src/db/index.js', () => ({ db: {} }))

vi.mock('../../server/src/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}))
import { requireAuth } from '../../server/src/middleware/auth.js'
const mockedRequireAuth = vi.mocked(requireAuth)

vi.mock('../../server/src/services/prices.js', () => ({
  getLatestPriceForTicker: vi.fn(),
}))
import { getLatestPriceForTicker } from '../../server/src/services/prices.js'

import pricesRouter from '../../server/src/routes/prices.js'

const mockPrice = {
  ticker: 'AAPL',
  date: '2026-02-20',
  closePrice: '200.000000',
  fetchedAt: new Date('2026-02-20'),
}

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1', pricesRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api/v1', pricesRouter)
  return app
}

describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
  })

  it('GET /prices/:ticker returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/prices/AAPL').expect(401)
  })
})

describe('GET /api/v1/prices/:ticker', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getLatestPriceForTicker).mockResolvedValue(mockPrice)
  })

  it('returns 200 with price data for known ticker', async () => {
    const res = await request(authedApp()).get('/api/v1/prices/AAPL').expect(200)
    expect(res.body.data.ticker).toBe('AAPL')
    expect(res.body.data.closePrice).toBe('200.000000')
    expect(res.body.data.date).toBe('2026-02-20')
  })

  it('returns 404 for ticker with no price data', async () => {
    vi.mocked(getLatestPriceForTicker).mockResolvedValue(null)
    await request(authedApp()).get('/api/v1/prices/UNKNOWN').expect(404)
  })

  it('uppercases the ticker before querying', async () => {
    await request(authedApp()).get('/api/v1/prices/aapl').expect(200)
    expect(vi.mocked(getLatestPriceForTicker)).toHaveBeenCalledWith(expect.anything(), 'AAPL')
  })
})
