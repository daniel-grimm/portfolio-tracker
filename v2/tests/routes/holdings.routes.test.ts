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

vi.mock('../../server/src/services/holdings.js', () => ({
  getHoldingsForAccount: vi.fn(),
  getHoldingById: vi.fn(),
  getAllHoldingsForUser: vi.fn(),
  createHolding: vi.fn(),
  updateHolding: vi.fn(),
  deleteHolding: vi.fn(),
}))
import {
  getHoldingsForAccount,
  getHoldingById,
  getAllHoldingsForUser,
  createHolding,
  updateHolding,
  deleteHolding,
} from '../../server/src/services/holdings.js'

import holdingsRouter from '../../server/src/routes/holdings.js'

const mockHolding = {
  id: 'hold-1',
  accountId: 'acct-1',
  ticker: 'AAPL',
  shares: '10',
  avgCostBasis: '150',
  purchaseDate: '2024-01-15',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

const mockAggregated = [
  {
    ticker: 'AAPL',
    totalShares: '10',
    weightedAvgCostBasis: '150',
    holdings: [mockHolding],
  },
]

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1', holdingsRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api/v1', holdingsRouter)
  return app
}

// ── 401 without auth ──────────────────────────────────────────────────────────

describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
  })

  it('GET /accounts/:id/holdings returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/accounts/acct-1/holdings').expect(401)
  })

  it('POST /accounts/:id/holdings returns 401', async () => {
    await request(unauthedApp()).post('/api/v1/accounts/acct-1/holdings').expect(401)
  })

  it('GET /holdings returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/holdings').expect(401)
  })

  it('GET /holdings/:id returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/holdings/hold-1').expect(401)
  })

  it('PUT /holdings/:id returns 401', async () => {
    await request(unauthedApp()).put('/api/v1/holdings/hold-1').expect(401)
  })

  it('DELETE /holdings/:id returns 401', async () => {
    await request(unauthedApp()).delete('/api/v1/holdings/hold-1').expect(401)
  })
})

// ── authenticated routes ──────────────────────────────────────────────────────

describe('GET /api/v1/accounts/:id/holdings', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getHoldingsForAccount).mockResolvedValue([mockHolding])
  })

  it('returns 200 with data array', async () => {
    const res = await request(authedApp())
      .get('/api/v1/accounts/acct-1/holdings')
      .expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe('hold-1')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getHoldingsForAccount).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/accounts/missing/holdings').expect(404)
  })
})

describe('POST /api/v1/accounts/:id/holdings', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(createHolding).mockResolvedValue(mockHolding)
  })

  it('returns 201 with created holding', async () => {
    const res = await request(authedApp())
      .post('/api/v1/accounts/acct-1/holdings')
      .send({
        ticker: 'AAPL',
        shares: '10',
        avgCostBasis: '150',
        purchaseDate: '2024-01-15',
      })
      .expect(201)
    expect(res.body.data.id).toBe('hold-1')
  })

  it('returns 400 on missing ticker', async () => {
    await request(authedApp())
      .post('/api/v1/accounts/acct-1/holdings')
      .send({ shares: '10', avgCostBasis: '150', purchaseDate: '2024-01-15' })
      .expect(400)
  })

  it('returns 400 on missing purchaseDate', async () => {
    await request(authedApp())
      .post('/api/v1/accounts/acct-1/holdings')
      .send({ ticker: 'AAPL', shares: '10', avgCostBasis: '150' })
      .expect(400)
  })
})

describe('GET /api/v1/holdings', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getAllHoldingsForUser).mockResolvedValue(mockAggregated)
  })

  it('returns 200 with aggregated holdings', async () => {
    const res = await request(authedApp()).get('/api/v1/holdings').expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].ticker).toBe('AAPL')
  })
})

describe('GET /api/v1/holdings/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getHoldingById).mockResolvedValue(mockHolding)
  })

  it('returns 200 with holding', async () => {
    const res = await request(authedApp()).get('/api/v1/holdings/hold-1').expect(200)
    expect(res.body.data.id).toBe('hold-1')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getHoldingById).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/holdings/missing').expect(404)
  })
})

describe('PUT /api/v1/holdings/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(updateHolding).mockResolvedValue({ ...mockHolding, shares: '20' })
  })

  it('returns 200 with updated holding', async () => {
    const res = await request(authedApp())
      .put('/api/v1/holdings/hold-1')
      .send({ shares: '20' })
      .expect(200)
    expect(res.body.data.shares).toBe('20')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(updateHolding).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).put('/api/v1/holdings/missing').send({ shares: '5' }).expect(404)
  })
})

describe('DELETE /api/v1/holdings/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(deleteHolding).mockResolvedValue(undefined)
  })

  it('returns 200', async () => {
    await request(authedApp()).delete('/api/v1/holdings/hold-1').expect(200)
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(deleteHolding).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).delete('/api/v1/holdings/missing').expect(404)
  })
})
