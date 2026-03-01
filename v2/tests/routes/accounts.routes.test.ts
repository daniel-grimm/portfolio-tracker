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

vi.mock('../../server/src/services/accounts.js', () => ({
  getAccountsForPortfolio: vi.fn(),
  getAccountById: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  disableAccount: vi.fn(),
}))
import {
  getAccountsForPortfolio,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  disableAccount,
} from '../../server/src/services/accounts.js'

import accountsRouter from '../../server/src/routes/accounts.js'

const mockAccount = {
  id: 'acct-1',
  portfolioId: 'port-1',
  name: 'Roth IRA',
  description: null,
  disabledAt: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1', accountsRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api/v1', accountsRouter)
  return app
}

// ── 401 without auth ──────────────────────────────────────────────────────────

describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
  })

  it('GET /portfolios/:id/accounts returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/portfolios/port-1/accounts').expect(401)
  })

  it('POST /portfolios/:id/accounts returns 401', async () => {
    await request(unauthedApp()).post('/api/v1/portfolios/port-1/accounts').expect(401)
  })

  it('GET /accounts/:id returns 401', async () => {
    await request(unauthedApp()).get('/api/v1/accounts/acct-1').expect(401)
  })

  it('PUT /accounts/:id returns 401', async () => {
    await request(unauthedApp()).put('/api/v1/accounts/acct-1').expect(401)
  })

  it('DELETE /accounts/:id returns 401', async () => {
    await request(unauthedApp()).delete('/api/v1/accounts/acct-1').expect(401)
  })

  it('POST /accounts/:id/disable returns 401', async () => {
    await request(unauthedApp()).post('/api/v1/accounts/acct-1/disable').expect(401)
  })
})

// ── authenticated routes ──────────────────────────────────────────────────────

describe('GET /api/v1/portfolios/:id/accounts', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getAccountsForPortfolio).mockResolvedValue([mockAccount])
  })

  it('returns 200 with data array', async () => {
    const res = await request(authedApp())
      .get('/api/v1/portfolios/port-1/accounts')
      .expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe('acct-1')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getAccountsForPortfolio).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/portfolios/missing/accounts').expect(404)
  })
})

describe('POST /api/v1/portfolios/:id/accounts', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(createAccount).mockResolvedValue(mockAccount)
  })

  it('returns 201 with created account', async () => {
    const res = await request(authedApp())
      .post('/api/v1/portfolios/port-1/accounts')
      .send({ name: 'Roth IRA' })
      .expect(201)
    expect(res.body.data.id).toBe('acct-1')
  })

  it('returns 400 on missing name', async () => {
    await request(authedApp())
      .post('/api/v1/portfolios/port-1/accounts')
      .send({})
      .expect(400)
  })
})

describe('GET /api/v1/accounts/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getAccountById).mockResolvedValue(mockAccount)
  })

  it('returns 200 with account', async () => {
    const res = await request(authedApp()).get('/api/v1/accounts/acct-1').expect(200)
    expect(res.body.data.id).toBe('acct-1')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(getAccountById).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).get('/api/v1/accounts/missing').expect(404)
  })
})

describe('PUT /api/v1/accounts/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(updateAccount).mockResolvedValue({ ...mockAccount, name: 'Updated' })
  })

  it('returns 200 with updated account', async () => {
    const res = await request(authedApp())
      .put('/api/v1/accounts/acct-1')
      .send({ name: 'Updated' })
      .expect(200)
    expect(res.body.data.name).toBe('Updated')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(updateAccount).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).put('/api/v1/accounts/missing').send({ name: 'x' }).expect(404)
  })
})

describe('DELETE /api/v1/accounts/:id', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(deleteAccount).mockResolvedValue(undefined)
  })

  it('returns 200', async () => {
    await request(authedApp()).delete('/api/v1/accounts/acct-1').expect(200)
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(deleteAccount).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).delete('/api/v1/accounts/missing').expect(404)
  })
})

describe('POST /api/v1/accounts/:id/disable', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(disableAccount).mockResolvedValue({ ...mockAccount, disabledAt: new Date() })
  })

  it('returns 200 with disabled account', async () => {
    const res = await request(authedApp()).post('/api/v1/accounts/acct-1/disable').expect(200)
    expect(res.body.data.id).toBe('acct-1')
  })

  it('returns 404 on NotFoundError', async () => {
    const { NotFoundError } = await import('../../server/src/lib/errors.js')
    vi.mocked(disableAccount).mockRejectedValue(new NotFoundError('not found'))
    await request(authedApp()).post('/api/v1/accounts/missing/disable').expect(404)
  })
})
