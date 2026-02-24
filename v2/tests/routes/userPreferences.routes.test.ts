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

vi.mock('../../server/src/services/userPreferences.js', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))
import {
  getPreferences,
  updatePreferences,
} from '../../server/src/services/userPreferences.js'

import userPreferencesRouter from '../../server/src/routes/userPreferences.js'

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api', userPreferencesRouter)
  return app
}

function unauthedApp() {
  const app = makeUnauthenticatedApp()
  app.use('/api', userPreferencesRouter)
  return app
}

describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response, _next: NextFunction) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
  })

  it('GET /api/user/preferences returns 401', async () => {
    await request(unauthedApp()).get('/api/user/preferences').expect(401)
  })

  it('PATCH /api/user/preferences returns 401', async () => {
    await request(unauthedApp()).patch('/api/user/preferences').expect(401)
  })
})

describe('GET /api/user/preferences', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(getPreferences).mockResolvedValue({ theme: 'light' })
  })

  it('returns 200 with default preferences', async () => {
    const res = await request(authedApp()).get('/api/user/preferences').expect(200)
    expect(res.body.data).toEqual({ theme: 'light' })
  })
})

describe('PATCH /api/user/preferences', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    vi.mocked(updatePreferences).mockResolvedValue({ theme: 'dark' })
  })

  it('returns 200 with updated preferences', async () => {
    const res = await request(authedApp())
      .patch('/api/user/preferences')
      .send({ theme: 'dark' })
      .expect(200)
    expect(res.body.data).toEqual({ theme: 'dark' })
  })

  it('returns 400 for invalid theme value', async () => {
    await request(authedApp())
      .patch('/api/user/preferences')
      .send({ theme: 'blue' })
      .expect(400)
  })

  it('returns 400 for missing theme field', async () => {
    await request(authedApp())
      .patch('/api/user/preferences')
      .send({})
      .expect(400)
  })
})
