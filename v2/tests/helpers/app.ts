// Express app factory for route tests.
// Phase 3 will wire up the real auth routes and stub out requireAuth properly.

import express, { type Application, type Request, type Response, type NextFunction } from 'express'

export interface TestUser {
  id: string
  email: string
  name: string
}

const defaultUser: TestUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
}

export function makeAuthenticatedApp(user: TestUser = defaultUser): Application {
  const app = express()
  app.use(express.json())

  // Stub requireAuth — attaches user to request
  app.use((req: Request, _res: Response, next: NextFunction) => {
    ;(req as Request & { user: TestUser }).user = user
    next()
  })

  return app
}

export function makeUnauthenticatedApp(): Application {
  const app = express()
  app.use(express.json())
  return app
}
