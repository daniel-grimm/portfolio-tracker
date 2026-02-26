# Testing Guide

Tests use Vitest. TDD applies to calculations, projections, services, and routes. UI, DB schema, and price API clients (Finnhub, Alpha Vantage) are not tested.

---

## Test Layers

| Layer | Location | Tools | DB? | Mocking? |
|-------|----------|-------|-----|---------|
| Unit (calculations/projections) | `tests/unit/` | Vitest | No | No |
| Service | `tests/services/` | Vitest + PGLite | Yes (real schema) | No |
| Route | `tests/routes/` | Vitest + Supertest | No (service mocked) | Yes |

---

## Running Tests

```bash
npm run test            # run all tests once
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

---

## Unit Tests (Calculations & Projections)

No setup needed. Import and call the functions directly.

```typescript
// tests/unit/calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calculateYTDIncome } from '../../server/src/services/calculations.js'

describe('calculateYTDIncome', () => {
  it('sums only paid dividends from the current year', () => {
    const currentYear = new Date().getFullYear()
    const dividends = [
      { status: 'paid', payDate: `${currentYear}-06-01`, totalAmount: '100.00' },
      { status: 'paid', payDate: `${currentYear - 1}-06-01`, totalAmount: '50.00' }, // prior year
      { status: 'scheduled', payDate: `${currentYear}-07-01`, totalAmount: '25.00' }, // not paid
    ]
    expect(calculateYTDIncome(dividends as Dividend[])).toBe(100)
  })
})
```

---

## Service Tests

Use `createTestDb()` + `withTestTransaction()` from `tests/helpers/db.ts`.

`createTestDb()` is async — call in `beforeAll`. `withTestTransaction()` wraps each test in a `BEGIN`/`ROLLBACK` for isolation.

```typescript
// tests/services/portfolios.service.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import { createPortfolio, getUserPortfolios } from '../../server/src/services/portfolios.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

describe('getUserPortfolios', () => {
  it("returns only the requesting user's portfolios", async () => {
    await withTestTransaction(testDb, async (db) => {
      await createPortfolio(db, 'user-1', { name: 'Port A' })
      await createPortfolio(db, 'user-2', { name: 'Port B' })

      const result = await getUserPortfolios(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Port A')
    })
  })
})
```

**Key points:**
- `createTestDb()` uses PGLite (Postgres compiled to WASM) — all migrations are applied to it
- Each `withTestTransaction` call rolls back, so tests are isolated from each other
- `testDb` is created once per file in `beforeAll` (cheaper than per-test)
- The `db` passed into the callback is the same type as the production `DbInstance`

---

## Route Tests

Route tests mock services and the db module, then use Supertest to make HTTP requests.

```typescript
// tests/routes/portfolios.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { makeAuthenticatedApp, makeUnauthenticatedApp } from '../helpers/app.js'

// 1. Mock requireAuth to control auth behavior
vi.mock('../../server/src/middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}))
import { requireAuth } from '../../server/src/middleware/auth.js'
const mockedRequireAuth = vi.mocked(requireAuth)

// 2. Mock db to prevent env.ts from running (it calls process.exit on missing env vars)
vi.mock('../../server/src/db/index.js', () => ({ db: {} }))

// 3. Mock the service — use factory function to prevent import chain from loading
vi.mock('../../server/src/services/portfolios.js', () => ({
  getUserPortfolios: vi.fn(),
  createPortfolio: vi.fn(),
}))
import { getUserPortfolios } from '../../server/src/services/portfolios.js'

import portfoliosRouter from '../../server/src/routes/portfolios.js'

function authedApp() {
  const app = makeAuthenticatedApp()
  app.use('/api/v1/portfolios', portfoliosRouter)
  return app
}

// Always test the 401 case
describe('without authentication', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, res: Response) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
  })

  it('GET / returns 401', async () => {
    const app = makeUnauthenticatedApp()
    app.use('/api/v1/portfolios', portfoliosRouter)
    await request(app).get('/api/v1/portfolios').expect(401)
  })
})

describe('GET /', () => {
  beforeEach(() => {
    mockedRequireAuth.mockImplementation((_req: Request, _res: Response, next: NextFunction) => {
      next()
    })
  })

  it('returns portfolios', async () => {
    vi.mocked(getUserPortfolios).mockResolvedValue([
      { id: 'p1', name: 'Test', userId: 'test-user-id', description: null,
        createdAt: new Date(), updatedAt: new Date() }
    ])

    const res = await request(authedApp()).get('/api/v1/portfolios')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
})
```

**Critical gotchas:**
1. **Always mock `../../server/src/db/index.js`** (`.js` extension, not `.ts`) — if you don't, the import chain loads `env.ts` which calls `process.exit(1)` when env vars are missing
2. **Use factory functions** in `vi.mock(...)` — bare `vi.mock('module')` can trigger the real module's import chain; wrapping in `() => ({ ... })` prevents this
3. **Mock path uses `.js` extension** even though source files are `.ts` — NodeNext module resolution requires this
4. **Always test the 401 case** for every route

---

## Test Helpers

### `tests/helpers/db.ts`

```typescript
createTestDb(): Promise<TestDb>   // creates PGLite instance with schema applied
withTestTransaction<T>(testDb: TestDb, fn: (db: DbInstance) => Promise<T>): Promise<T>
```

### `tests/helpers/app.ts`

```typescript
makeAuthenticatedApp(): Express   // app with req.user pre-populated as { id: 'test-user-id' }
makeUnauthenticatedApp(): Express // app without user — for testing 401 flows
```

### `tests/helpers/factories.ts`

Plain-object factories for test data. Note: `makeDividend()` uses the old schema fields (`holdingId`, `exDate`) — update overrides as needed.

```typescript
makeUser(overrides?)      // { id, email, name }
makePortfolio(overrides?) // { id, userId, name, description, createdAt, updatedAt }
makeAccount(overrides?)   // { id, portfolioId, name, description, ... }
makeHolding(overrides?)   // { id, accountId, ticker, shares, avgCostBasis, purchaseDate, ... }
makeDividend(overrides?)  // { id, accountId, ticker, amountPerShare, totalAmount, payDate, status, ... }
makePriceHistory(overrides?) // { ticker, date, closePrice, fetchedAt }
```

---

## TDD Workflow

1. Write the test — confirm it fails (`npm run test:watch`)
2. Write minimal implementation — confirm it passes
3. Refactor

`npm run test` must pass before any task is complete. Coverage must not drop below the established target.
