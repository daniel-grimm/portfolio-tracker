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

vi.mock('../../server/src/services/dividends.js', () => ({
  createDividend: vi.fn(),
  getDividendById: vi.fn(),
  getDividendsForAccount: vi.fn(),
  getDividendsForPortfolio: vi.fn(),
  getAllDividendsForUser: vi.fn(),
  updateDividend: vi.fn(),
  deleteDividend: vi.fn(),
}))
import {
  createDividend,
  getDividendsForAccount,
  getAllDividendsForUser,
  updateDividend,
  deleteDividend,
} from '../../server/src/services/dividends.js'

import dividendsRouter from '../../server/src/routes/dividends.js'

const mockDividend = {
  id: 'div-1',
  accountId: 'acct-1',
  ticker: 'AAPL',
  amountPerShare: '0.50',
  totalAmount: '5.00',
  exDate: '2024-01-10',
  payDate: '2024-01-15',
  recordDate: null,
  status: 'paid' as const,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1', dividendsRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api/v1', dividendsRouter)
  return app
}

// ── 401 without auth ──────────────────────────────────────────────────────────

describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
  })

  it('POST /accounts/:id/dividends returns 401', async () => {
    await request(unauthedApp()).post('/api/v1/accounts/acct-1/dividends').expect(401)
  })

  it('GET /accounts/:id/dividends returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/accounts/acct-1/dividends').expect(401)
  })

  it('GET /dividends returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/dividends').expect(401)
  })

  it('PUT /dividends/:id returns 401', async () => {
    await request(unauthedApp()).put('/api/v1/dividends/div-1').expect(401)
  })

  it('DELETE /dividends/:id returns 401', async () => {
    await request(unauthedApp()).delete('/api/v1/dividends/div-1').expect(401)
  })
})

// ── authenticated routes ──────────────────────────────────────────────────────

describe('POST /api/v1/accounts/:id/dividends', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(createDividend).mockResolvedValue(mockDividend)
  })

  it('returns 201 with created dividend', async () => {
    const res = await request(authedApp())
      .post('/api/v1/accounts/acct-1/dividends')
      .send({
        ticker: 'AAPL',
        amountPerShare: '0.50',
        exDate: '2024-01-10',
        payDate: '2024-01-15',
      })
      .expect(201)
    expect(res.body.data.id).toBe('div-1')
  })

  it('returns 400 on missing ticker', async () => {
    await request(authedApp())
      .post('/api/v1/accounts/acct-1/dividends')
      .send({ amountPerShare: '0.50', exDate: '2024-01-10', payDate: '2024-01-15' })
      .expect(400)
  })

  it('returns 400 on missing amountPerShare', async () => {
    await request(authedApp())
      .post('/api/v1/accounts/acct-1/dividends')
      .send({ ticker: 'AAPL', exDate: '2024-01-10', payDate: '2024-01-15' })
      .expect(400)
  })

  it('returns 400 on missing payDate', async () => {
    await request(authedApp())
      .post('/api/v1/accounts/acct-1/dividends')
      .send({ ticker: 'AAPL', amountPerShare: '0.50', exDate: '2024-01-10' })
      .expect(400)
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(createDividend).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp())
      .post('/api/v1/accounts/missing/dividends')
      .send({ ticker: 'AAPL', amountPerShare: '0.50', exDate: '2024-01-10', payDate: '2024-01-15' })
      .expect(404)
  })
})

describe('GET /api/v1/accounts/:id/dividends', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getDividendsForAccount).mockResolvedValue([mockDividend])
  })

  it('returns 200 with data array', async () => {
    const res = await request(authedApp())
      .get('/api/v1/accounts/acct-1/dividends')
      .expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].ticker).toBe('AAPL')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getDividendsForAccount).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/accounts/missing/dividends').expect(404)
  })
})

describe('GET /api/v1/dividends', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getAllDividendsForUser).mockResolvedValue([mockDividend])
  })

  it('returns 200 with all user dividends', async () => {
    const res = await request(authedApp()).get('/api/v1/dividends').expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe('div-1')
  })
})

describe('PUT /api/v1/dividends/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(updateDividend).mockResolvedValue({ ...mockDividend, status: 'paid' as const })
  })

  it('returns 200 with updated dividend', async () => {
    const res = await request(authedApp())
      .put('/api/v1/dividends/div-1')
      .send({ status: 'paid' })
      .expect(200)
    expect(res.body.data.status).toBe('paid')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(updateDividend).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp())
      .put('/api/v1/dividends/missing')
      .send({ status: 'paid' })
      .expect(404)
  })
})

describe('DELETE /api/v1/dividends/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(deleteDividend).mockResolvedValue(undefined)
  })

  it('returns 200', async () => {
    await request(authedApp()).delete('/api/v1/dividends/div-1').expect(200)
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(deleteDividend).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).delete('/api/v1/dividends/missing').expect(404)
  })
})
