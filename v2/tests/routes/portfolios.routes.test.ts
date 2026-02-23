import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { makeAuthenticatedApp, makeUnauthenticatedApp } from '../helpers/app.js'

// Mock requireAuth so we can control auth behaviour per test group.
// Factory prevents the real module (and its env/db import chain) from loading.
vi.mock('../../server/src/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}))
import { requireAuth } from '../../server/src/middleware/auth.js'
const mockedRequireAuth = vi.mocked(requireAuth)

// Mock the db so the router doesn't trigger env.ts → process.exit on import.
vi.mock('../../server/src/db/index.js', () => ({ db: {} }))

// Mock the service so route tests don't need a real DB.
// Factory prevents the real module (and its db/index import chain) from loading.
vi.mock('../../server/src/services/portfolios.js', () => ({
  getUserPortfolios: vi.fn(),
  getPortfolioById: vi.fn(),
  createPortfolio: vi.fn(),
  updatePortfolio: vi.fn(),
  deletePortfolio: vi.fn(),
}))
import {
  getUserPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from '../../server/src/services/portfolios.js'

vi.mock('../../server/src/services/portfolioValue.js', () => ({
  getPortfolioValueHistory: vi.fn(),
}))
import { getPortfolioValueHistory } from '../../server/src/services/portfolioValue.js'

import portfoliosRouter from '../../server/src/routes/portfolios.js'

const mockPortfolio = {
  id: 'port-1',
  userId: 'test-user-id',
  name: 'Test Portfolio',
  description: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

// Helpers to build apps with router mounted
function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1/portfolios', portfoliosRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api/v1/portfolios', portfoliosRouter)
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

  it('GET /portfolios returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/portfolios').expect(401)
  })

  it('POST /portfolios returns 401', async () => {
    await request(unauthedApp()).post('/api/v1/portfolios').expect(401)
  })

  it('GET /portfolios/:id returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/portfolios/port-1').expect(401)
  })

  it('GET /portfolios/:id/value-history returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/portfolios/port-1/value-history').expect(401)
  })

  it('PUT /portfolios/:id returns 401', async () => {
    await request(unauthedApp()).put('/api/v1/portfolios/port-1').expect(401)
  })

  it('DELETE /portfolios/:id returns 401', async () => {
    await request(unauthedApp()).delete('/api/v1/portfolios/port-1').expect(401)
  })
})

// ── authenticated routes ──────────────────────────────────────────────────────

describe('GET /api/v1/portfolios', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(getUserPortfolios).mockResolvedValue([mockPortfolio])
  })

  it('returns 200 with data array', async () => {
    const res = await request(authedApp()).get('/api/v1/portfolios').expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe('port-1')
  })
})

describe('POST /api/v1/portfolios', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(createPortfolio).mockResolvedValue(mockPortfolio)
  })

  it('returns 201 with created portfolio', async () => {
    const res = await request(authedApp())
      .post('/api/v1/portfolios')
      .send({ name: 'New Portfolio' })
      .expect(201)
    expect(res.body.data.id).toBe('port-1')
  })

  it('returns 400 on missing name', async () => {
    await request(authedApp()).post('/api/v1/portfolios').send({}).expect(400)
  })
})

describe('GET /api/v1/portfolios/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(getPortfolioById).mockResolvedValue(mockPortfolio)
  })

  it('returns 200 with portfolio', async () => {
    const res = await request(authedApp())
      .get('/api/v1/portfolios/port-1')
      .expect(200)
    expect(res.body.data.id).toBe('port-1')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getPortfolioById).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/portfolios/missing').expect(404)
  })
})

describe('PUT /api/v1/portfolios/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(updatePortfolio).mockResolvedValue({ ...mockPortfolio, name: 'Updated' })
  })

  it('returns 200 with updated portfolio', async () => {
    const res = await request(authedApp())
      .put('/api/v1/portfolios/port-1')
      .send({ name: 'Updated' })
      .expect(200)
    expect(res.body.data.name).toBe('Updated')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(updatePortfolio).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp())
      .put('/api/v1/portfolios/missing')
      .send({ name: 'x' })
      .expect(404)
  })
})

describe('DELETE /api/v1/portfolios/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(deletePortfolio).mockResolvedValue(undefined)
  })

  it('returns 200', async () => {
    await request(authedApp()).delete('/api/v1/portfolios/port-1').expect(200)
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(deletePortfolio).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).delete('/api/v1/portfolios/missing').expect(404)
  })
})

describe('GET /api/v1/portfolios/:id/value-history', () => {
  const mockHistory = [
    { date: '2026-01-01', totalValue: 5000, costBasis: 4000, isPartial: false },
    { date: '2026-02-01', totalValue: 5500, costBasis: 4000, isPartial: false },
  ]

  beforeEach(() => {
    mockedRequireAuth.mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next(),
    )
    vi.mocked(getPortfolioValueHistory).mockResolvedValue(mockHistory)
  })

  it('returns 200 with array of PortfolioValuePoint', async () => {
    const res = await request(authedApp())
      .get('/api/v1/portfolios/port-1/value-history')
      .expect(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].date).toBe('2026-01-01')
  })

  it('passes range query param to service', async () => {
    await request(authedApp())
      .get('/api/v1/portfolios/port-1/value-history?range=1m')
      .expect(200)
    expect(vi.mocked(getPortfolioValueHistory)).toHaveBeenCalledWith(
      expect.anything(),
      'port-1',
      expect.any(String),
      '1m',
    )
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getPortfolioValueHistory).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/portfolios/missing/value-history').expect(404)
  })
})
