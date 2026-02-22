# Build Tasks

Work through phases in order. Verify each checkpoint before moving on.

**Definition of done — all tasks:**
- `npm run typecheck` → zero errors
- Schema changed → migration generated and applied

**Additional for calculations, projections, services, and routes (TDD):**
- Tests written before implementation
- `npm run test` → all tests pass

---

## Phase 1 — Project Scaffold

- [ ] Initialize monorepo root `package.json` with scripts: `dev`, `build`, `typecheck`, `test`, `test:watch`, `test:coverage`, `db:generate`, `db:migrate`, `db:studio`
- [ ] Scaffold `server/` — `ts-node-dev` for dev, `tsc` for build; `tsconfig.json` with `strict: true`, `target: ES2022`, `module: NodeNext`; `tsconfig.build.json` excluding `tests/**`
- [ ] Scaffold `client/` — React + Vite + TypeScript; `tsconfig.json` with `strict: true`
- [ ] Create `shared/` — `shared/types.ts` placeholder, `shared/tsconfig.json` with `composite: true`
- [ ] Configure TypeScript project references in root `tsconfig.json`
- [ ] Configure path alias so both `client` and `server` can import from `shared/`
- [ ] Install and configure Tailwind CSS in `client/`
- [ ] Initialize Shadcn/ui — neutral base theme, dark mode support
- [ ] Install test dependencies: `vitest`, `pg-mem`, `supertest`, `@types/supertest`
- [ ] Install D3 in `client/`: `d3`, `@types/d3`
- [ ] Configure Vitest at root covering `tests/**/*.test.ts`
- [ ] Create test helpers:
  - `tests/helpers/db.ts` — `createTestDb()` applies Drizzle schema to `pg-mem`; `withTestTransaction(db, fn)` rolls back after each test
  - `tests/helpers/app.ts` — Express app factory with `requireAuth` stubbed; exports `makeAuthenticatedApp(user?)` and `makeUnauthenticatedApp()`
  - `tests/helpers/factories.ts` — `makeUser()`, `makePortfolio()`, `makeAccount()`, `makeHolding()`, `makeDividend()`, `makePriceHistory()`
- [ ] Placeholder smoke test in `tests/unit/calculations.test.ts`
- [ ] `server/src/env.ts` — Zod validation for all env vars including `FINNHUB_API_KEY` and `FINNHUB_FETCH_DELAY_MS`; server exits if invalid
- [ ] `.env.example` files for `client/` and `server/`
- [ ] Root `.gitignore`

**Checkpoint:**
- `npm run typecheck` → zero errors
- `npm run test` → smoke test passes
- `npm run dev` → client `localhost:5173`, server `localhost:3000`
- `GET localhost:3000/health` → `{ "ok": true }`

---

## Phase 2 — Database & Schema

- [ ] Install `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `ws`
- [ ] Create `server/drizzle.config.ts`
- [ ] Define schema in `server/src/db/schema.ts`:
  - `portfolios` — `id`, `user_id` FK, `name`, `description`, timestamps; index on `user_id`
  - `accounts` — `id`, `portfolio_id` FK, `name`, `description`, timestamps; index on `portfolio_id`
  - `holdings` — `id`, `account_id` FK, `ticker`, `shares`, `avg_cost_basis`, `purchase_date`, timestamps; index on `account_id`
  - `dividends` — `id`, `holding_id` FK, `ticker`, `amount_per_share`, `total_amount`, `ex_date`, `pay_date`, `record_date`, `status` enum, timestamps; indexes on `holding_id` and `pay_date`
  - `price_history` — composite PK `(ticker, date)`, `close_price`, `fetched_at`; indexes on `ticker` and `date`
  - `portfolio_value_history` — `id`, `portfolio_id` FK, `date`, `total_value`, `cost_basis`, `is_partial` boolean, `created_at`; unique index on `(portfolio_id, date)`
  - `dividend_cache` — `ticker` PK, `payload` jsonb, `fetched_at`
  - All numeric fields use `numeric` with `precision: 18, scale: 6`
- [ ] Define Drizzle relation helpers
- [ ] `server/src/db/index.ts` — export Drizzle db instance
- [ ] Export inferred TypeScript types from schema; add to `shared/types.ts`
- [ ] `npm run db:generate` → verify migration SQL created
- [ ] `npm run db:migrate` → verify all tables created in Neon
- [ ] `npx better-auth migrate` → verify auth tables created
- [ ] Update `tests/helpers/db.ts` to apply the real schema to the `pg-mem` instance

**Checkpoint:**
- `npm run db:studio` → all tables visible including `price_history` and `portfolio_value_history`
- `npm run typecheck` → zero errors

---

## Phase 3 — Authentication

- [ ] Install `better-auth`
- [ ] Initialize Better Auth in `server/src/lib/auth.ts` — Neon adapter, Google OAuth, HTTP-only session cookie
- [ ] Mount at `/api/auth/*`
- [ ] `requireAuth` middleware — validates session, attaches `req.user` (typed, no `any`), returns 401 if invalid
- [ ] Extend Express `Request` type for `req.user`
- [ ] Better Auth client in `client/src/lib/auth.ts`
- [ ] `/login` page — "Continue with Google" button
- [ ] React Router — routes: `/login`, `/` (dashboard), `/portfolios`, `/portfolios/:id`, `/accounts/:id`, `/calendar`
- [ ] `AuthGuard` — checks `useSession()`, redirects to `/login`
- [ ] Wrap all routes except `/login` in `AuthGuard`
- [ ] Top nav bar — app name, user avatar + name, logout

**Checkpoint:**
- Unauthenticated → `/login`
- OAuth completes → lands on `/`
- `npm run typecheck` → zero errors

---

## Phase 4 — Calculations & Projections (TDD)

Strict TDD. Write every test before its implementation. Run `npm run test:watch` throughout.

### Step 1 — Scaffolding
- [ ] Add types to `shared/types.ts`: `MonthlyProjection`, `CalendarDay`, `HoldingWithPrice`, `PortfolioValuePoint`
- [ ] Create empty files: `calculations.ts`, `projections.ts`, `lib/formatting.ts`
- [ ] Create test files (imports will fail at first — expected): `calculations.test.ts`, `projections.test.ts`, `formatting.test.ts`

### Step 2 — TDD: `calculations.ts`

**`calculateTotalDividend(amountPerShare, shares)`**
- [ ] Test: whole numbers; fractional shares; fractional amount; zero shares → 0; zero amount → 0
- [ ] Implement → green

**`calculateYTDIncome(dividends)`**
- [ ] Test: empty → 0; current-year paid; excludes scheduled; excludes projected; excludes prior-year paid; sums multiple
- [ ] Implement → green

**`calculateAllTimeIncome(dividends)`**
- [ ] Test: empty → 0; all paid across years; excludes non-paid
- [ ] Implement → green

**`calculateAnnualizedIncome(dividends)`**
- [ ] Test: quarterly payer; empty → 0
- [ ] Implement → green

**`calculateUnrealizedGainLoss(shares, avgCostBasis, currentPrice)`**
- [ ] Test: gain case `(currentPrice - avgCostBasis) × shares`; loss case; break-even → 0; zero shares → 0
- [ ] Implement → green

**`calculateReturnPercent(shares, avgCostBasis, currentPrice)`**
- [ ] Test: positive return; negative return; zero cost basis → 0 (guard against division by zero); zero shares → 0
- [ ] Implement → green

**`calculatePortfolioValue(holdings: HoldingWithPrice[])`**
- [ ] Test: single holding; multiple holdings; empty → 0; holdings with zero shares
- [ ] Implement → green

**`calculatePortfolioCostBasis(holdings)`**
- [ ] Test: single holding; multiple holdings; empty → 0
- [ ] Implement → green

### Step 3 — TDD: `projections.ts`

**`detectCadence(payDates)`**
- [ ] Test: <2 dates → `'unknown'`; quarterly; monthly; annual; irregular
- [ ] Implement → green

**`projectMonthlyIncome(dividends, monthsForward)`**
- [ ] Test: length equals `monthsForward`; no history → all $0; <2 dividends → all $0; quarterly payer; no double-counting scheduled; monthly payer
- [ ] Implement → green

**`buildDividendCalendar(dividends, year, month)`**
- [ ] Test: out-of-month excluded; same-day grouping; correct day assignment; empty → []
- [ ] Implement → green

### Step 4 — TDD: `formatting.ts`
- [ ] Test: USD 2dp; $0 → `$0.00`; rounding edge cases
- [ ] Implement → green

**Checkpoint:**
- `npm run test` → all pass; `calculations.ts` 100%, `projections.ts` 90%+, `formatting.ts` 100%
- Zero DB or Express imports in `calculations.ts` or `projections.ts`
- `npm run typecheck` → zero errors

---

## Phase 5 — Portfolios

TDD order: service tests → service → route tests → routes → UI.

### Step 1 — Types
- [ ] Add `CreatePortfolioInput`, `UpdatePortfolioInput` to `shared/types.ts`

### Step 2 — TDD: Portfolios Service
- [ ] **Write** `tests/services/portfolios.service.test.ts`:
  - `getUserPortfolios` returns only requesting user's portfolios; empty array for user with none
  - `getPortfolioById` returns portfolio when userId matches; throws `NotFoundError` for wrong user or missing id
  - `createPortfolio` inserts and returns record with all fields
  - `updatePortfolio` updates and returns; throws `NotFoundError` for wrong userId
  - `deletePortfolio` removes record; throws `NotFoundError` for wrong userId
- [ ] Confirm red → **Implement** `portfolios.ts` → green

### Step 3 — TDD: Portfolios Routes
- [ ] **Write** `tests/routes/portfolios.routes.test.ts`:
  - Every route returns 401 without auth
  - `GET /portfolios` → 200 `{ data: Portfolio[] }`
  - `POST /portfolios` → 201 with new portfolio; 400 on missing fields
  - `GET /portfolios/:id` → 200; 404 on NotFoundError
  - `PUT /portfolios/:id` → 200; 404 on NotFoundError
  - `DELETE /portfolios/:id` → 200; 404 on NotFoundError
- [ ] Confirm red → **Implement** routes → green

### Step 4 — UI
- [ ] Portfolio API methods in `client/src/lib/api.ts`
- [ ] TanStack Query `QueryClientProvider` in `main.tsx`
- [ ] `Portfolios.tsx` — cards with name, account count, current value, cost basis, unrealized gain/loss; New/Edit/Delete dialogs; loading skeleton; empty state
- [ ] `PortfolioDetail.tsx` — portfolio header showing value + cost basis + gain/loss; accounts list placeholder

**Checkpoint:** `npm run test` passes, `npm run typecheck` zero errors

---

## Phase 6 — Accounts

TDD order: service tests → service → route tests → routes → UI.

### Step 1 — Types
- [ ] Add `CreateAccountInput`, `UpdateAccountInput` to `shared/types.ts`

### Step 2 — TDD: Accounts Service
- [ ] **Write** `tests/services/accounts.service.test.ts`:
  - `getAccountsForPortfolio` verifies portfolio ownership; throws `NotFoundError` for wrong user
  - `getAccountById` verifies ownership via JOIN; throws `NotFoundError` for wrong user
  - `createAccount` throws `NotFoundError` for another user's portfolio
  - `updateAccount` / `deleteAccount` ownership enforcement
  - `deleteAccount` cascades — holdings gone after deletion
- [ ] Confirm red → **Implement** `accounts.ts` → green

### Step 3 — TDD: Accounts Routes
- [ ] **Write** `tests/routes/accounts.routes.test.ts`:
  - Every route returns 401 without auth
  - `GET /portfolios/:id/accounts` → 200; 404 on NotFoundError
  - `POST /portfolios/:id/accounts` → 201; 400 on invalid body
  - `GET /accounts/:id` → 200; 404
  - `PUT /accounts/:id` → 200; 404
  - `DELETE /accounts/:id` → 200; 404
- [ ] Confirm red → **Implement** routes → green

### Step 4 — UI
- [ ] Account API methods in `api.ts`
- [ ] Accounts list in `PortfolioDetail.tsx` — account cards, New/Edit/Delete; loading skeleton; empty state
- [ ] `AccountDetail.tsx` at `/accounts/:id` — account header, holdings placeholder

**Checkpoint:** `npm run test` passes, `npm run typecheck` zero errors

---

## Phase 7 — Holdings

TDD order: service tests → service → route tests → routes → UI.

### Step 1 — Types
- [ ] Add `AggregatedHolding`, `CreateHoldingInput`, `UpdateHoldingInput` to `shared/types.ts`
- [ ] `CreateHoldingInput` includes `purchaseDate`

### Step 2 — TDD: Holdings Service
- [ ] **Write** `tests/services/holdings.service.test.ts`:
  - `getHoldingsForAccount` verifies account ownership; throws `NotFoundError` for wrong user
  - `getHoldingById` verifies full ownership chain; throws `NotFoundError` for wrong user
  - `getAllHoldingsForUser` returns only the user's holdings; aggregates same ticker across accounts correctly
  - `createHolding` throws `NotFoundError` for another user's account
  - `updateHolding` / `deleteHolding` ownership enforcement
- [ ] Confirm red → **Implement** `holdings.ts` → green

### Step 3 — TDD: Holdings Routes
- [ ] **Write** `tests/routes/holdings.routes.test.ts`:
  - Every route returns 401 without auth
  - `GET /accounts/:id/holdings` → 200; 404
  - `POST /accounts/:id/holdings` → 201; 400 on invalid body or missing purchaseDate
  - `GET /holdings/:id` → 200; 404
  - `PUT /holdings/:id` → 200; 404
  - `DELETE /holdings/:id` → 200; 404
- [ ] Confirm red → **Implement** routes → green

### Step 4 — UI
- [ ] Holdings API methods in `api.ts`
- [ ] Holdings table in `AccountDetail.tsx` — ticker, shares, avg cost basis, purchase date, current price (with staleness indicator), current value, unrealized gain/loss ($), return %; add/edit/delete; sortable
- [ ] Aggregate holdings view on Dashboard — all tickers across all accounts, grouped

**Checkpoint:** `npm run test` passes, `npm run typecheck` zero errors

---

## Phase 8 — Dividend Tracking

TDD order: service tests → service → route tests → routes → UI.

### Step 1 — Types
- [ ] Add `CreateDividendInput`, `UpdateDividendInput` to `shared/types.ts`

### Step 2 — TDD: Dividends Service
- [ ] **Write** `tests/services/dividends.service.test.ts`:
  - `createDividend` auto-calculates `total_amount = amount_per_share × shares`
  - `createDividend` throws `NotFoundError` for another user's holding
  - `getDividendsForHolding` verifies full ownership chain; throws `NotFoundError` for wrong user
  - `getDividendsForAccount` returns all dividends across all holdings in the account
  - `getDividendsForPortfolio` returns all dividends across all accounts in the portfolio
  - `getAllDividendsForUser` returns only the requesting user's dividends
  - `updateDividend` / `deleteDividend` ownership enforcement
- [ ] Confirm red → **Implement** `dividends.ts` → green

### Step 3 — TDD: Dividends Routes
- [ ] **Write** `tests/routes/dividends.routes.test.ts`:
  - Every route returns 401 without auth
  - `GET /holdings/:id/dividends` → 200; 404
  - `POST /holdings/:id/dividends` → 201; 400 on invalid body
  - `PUT /dividends/:id` → 200; 404
  - `DELETE /dividends/:id` → 200; 404
- [ ] Confirm red → **Implement** routes → green

### Step 4 — UI
- [ ] Dividend API methods in `api.ts`
- [ ] Dividends section in `AccountDetail.tsx` — table by holding/ticker; add/edit/delete
- [ ] Global `/dividends` page

**Checkpoint:** `npm run test` passes, `total_amount` auto-calc verified by service tests

---

## Phase 9 — Price Fetching & Portfolio Value (TDD)

TDD order: service tests → service → route tests → routes → UI.

### Step 1 — Price API Clients

- [ ] Add `PriceQuote` type to `shared/types.ts`: `{ ticker: string, closePrice: number, fetchedAt: Date }`
- [ ] Implement `server/src/lib/finnhub.ts`:
  - `fetchFinnhubQuote(ticker: string): Promise<PriceQuote | null>` — returns `null` on failure, never throws
  - `fetchFinnhubQuotesBatched(tickers: string[], options: { delayMs: number }): Promise<Map<string, PriceQuote | null>>` — rate-limited batched fetch; 60 req/min free tier; default 1100ms delay
  - Fully typed; no `any`
- [ ] Implement `server/src/lib/alphaVantage.ts`:
  - `fetchAlphaVantageQuote(ticker: string): Promise<PriceQuote | null>` — returns `null` on failure, never throws
  - Uses `GLOBAL_QUOTE` endpoint; 25 req/day free tier — only called as a fallback so daily limit is rarely approached
  - Fully typed; no `any`
- [ ] Note: neither price client is unit tested (external API wrappers)

### Step 2 — TDD: Prices Service

- [ ] **Write** `tests/services/prices.service.test.ts`:
  - `getTodaysPriceForTicker` returns the price row when one exists for today; returns `null` when none exists
  - `getLatestPriceForTicker` returns the most recent price row regardless of date; returns `null` for unknown ticker
  - `getLatestPricesForTickers` returns a map of ticker → latest price (or null); handles mix of known and unknown tickers
  - `savePrices` inserts new price rows correctly; does not error on duplicate (ticker, date) due to upsert
  - `getTickersNeedingPriceUpdate` returns only tickers with no `price_history` row for today
- [ ] Confirm red → **Implement** `prices.ts` → green

### Step 3 — TDD: Portfolio Value Service

- [ ] **Write** `tests/services/portfolioValue.service.test.ts`:
  - `computePortfolioSnapshot(db, portfolioId, userId)` returns `{ totalValue, costBasis, isPartial: false }` when all ticker prices are available
  - `computePortfolioSnapshot` returns `{ isPartial: true }` when some ticker prices are missing
  - `computePortfolioSnapshot` returns `{ totalValue: 0, costBasis: 0 }` for a portfolio with no holdings
  - `computePortfolioSnapshot` throws `NotFoundError` for a portfolio not owned by userId
  - `savePortfolioValueSnapshot` upserts correctly — second call for same portfolio + date overwrites
  - `getPortfolioValueHistory(db, portfolioId, userId, range)` returns rows ordered by date ascending
  - `getPortfolioValueHistory` verifies portfolio ownership; throws `NotFoundError` for wrong user
  - `getPortfolioValueHistory` respects date range filter (1m, 3m, 6m, 1y, all)
- [ ] Confirm red → **Implement** `portfolioValue.ts` → green

### Step 4 — Startup Sequence

- [ ] Implement `server/src/startup.ts`:
  ```
  1. Query all distinct tickers from holdings (all users)
  2. Call getTickersNeedingPriceUpdate(db) — tickers with no price_history row for today
  3. Call fetchFinnhubQuotesBatched on those tickers
  4. For each ticker where Finnhub returned null, call fetchAlphaVantageQuote individually
  5. Call savePrices(db, results) — silently skips tickers where both APIs returned null
  6. For each distinct portfolio_id, call computePortfolioSnapshot then savePortfolioValueSnapshot
  7. Log summary: X prices fetched (Y via Finnhub, Z via Alpha Vantage), W portfolios snapshotted, V tickers skipped
  ```
- [ ] Call `startup()` in `server/src/index.ts` before the server begins accepting requests
- [ ] Startup failures are logged but do not prevent the server from starting

### Step 5 — TDD: Value History Route

- [ ] **Write** `tests/routes/portfolios.routes.test.ts` (add to existing file):
  - `GET /portfolios/:id/value-history` → 401 without auth
  - `GET /portfolios/:id/value-history` → 200 with array of `PortfolioValuePoint`
  - `GET /portfolios/:id/value-history?range=1m` → 200 with filtered data
  - `GET /portfolios/:id/value-history` → 404 for another user's portfolio
- [ ] Confirm red → **Implement** the route → green

### Step 6 — Prices Route (TDD)

- [ ] **Write** route test for `GET /api/v1/prices/:ticker`:
  - 401 without auth
  - 200 with `{ ticker, closePrice, date }` for known ticker
  - 404 for ticker with no price data
- [ ] Confirm red → **Implement** route → green

### Step 7 — D3 Chart: Portfolio Value Over Time

- [ ] Build `client/src/components/charts/PortfolioValueChart.tsx`:
  - Line chart: portfolio `totalValue` over time (D3)
  - Second line: `costBasis` as a reference/step line
  - Date range selector: 1M, 3M, 6M, 1Y, All — updates query param and re-fetches
  - Gaps in data (weekends, holidays) are connected — no zero-filling
  - Partial snapshots (`isPartial: true`) shown with a dotted line or subtle indicator
  - Empty state when no history yet
  - Tooltip on hover: date, value, cost basis, gain/loss

### Step 8 — UI Integration

- [ ] Add value history API method to `client/src/lib/api.ts`
- [ ] Add prices API method for latest price per ticker
- [ ] Wire `PortfolioValueChart` into `PortfolioDetail.tsx`
- [ ] Holdings table in `AccountDetail.tsx` uses latest price from `GET /api/v1/prices/:ticker` to show current value, unrealized gain/loss, and return %
- [ ] Show price staleness indicator if the price date is not today

**Checkpoint:**
- `npm run test` → all tests pass
- On server startup, prices are fetched and portfolio snapshots are written
- `PortfolioValueChart` renders with real data
- Unrealized gain/loss is correct in the holdings table
- `npm run typecheck` → zero errors

---

## Phase 10 — Dashboard

TDD: route tests → route implementation → UI with D3 charts.

### Step 1 — TDD: Dashboard Routes
- [ ] **Write** `tests/routes/dashboard.routes.test.ts`:
  - Every route returns 401 without auth
  - `GET /dashboard/summary` → 200 with `{ ytdIncome, allTimeIncome, projectedAnnual, portfolioBreakdown }`
  - `GET /dashboard/calendar` → 200 with calendar data
  - `GET /dashboard/projected-income` → 200 with array of 12 `MonthlyProjection`
- [ ] Confirm red → **Implement** `dashboard.ts` → green

### Step 2 — D3 Charts
- [ ] `IncomeBarChart.tsx` — monthly actual vs projected, current year; D3 grouped bar chart
- [ ] `ProjectedIncomeChart.tsx` — next 12 months forward projection; D3 bar or area chart

### Step 3 — Dashboard UI
- [ ] `Dashboard.tsx`:
  - Stat cards: YTD Income, All-Time Income, Projected Annual Income
  - Portfolio value breakdown — current value + cost basis + gain/loss per portfolio
  - `IncomeBarChart`
  - `ProjectedIncomeChart`
  - Top dividend payers list
  - Loading skeletons, empty state

**Checkpoint:** `npm run test` passes, charts render with real data

---

## Phase 11 — Dividend Calendar

- [ ] `Calendar.tsx` — monthly grid, dividend badges, month navigation in URL, scheduled vs projected distinct, day detail popover
- [ ] Add to React Router and nav bar

---

## Phase 12 — Polish & Hardening

- [ ] Error boundaries on all major page sections
- [ ] Toast notifications for all API errors (Shadcn Sonner)
- [ ] `AlertDialog` confirmation before every destructive action
- [ ] Responsive layout — nav collapses on mobile
- [ ] Server-side Zod validation on all request bodies
- [ ] `express-rate-limit` on all `/api/` routes
- [ ] Manual cross-user data isolation audit: two accounts cannot see each other's data
- [ ] `npm run typecheck` → zero errors
- [ ] `npm run test:coverage` → all targets met

---

## Phase 13 — Deployment

- [ ] Multi-stage `Dockerfile` for Express server
- [ ] `client/staticwebapp.config.json` for Azure Static Web Apps SPA routing
- [ ] `db:migrate` runs automatically on server startup
- [ ] `DEPLOYMENT.md` with full deploy steps
- [ ] Verify Google OAuth redirect URIs include production domain
- [ ] `FINNHUB_API_KEY` set in production environment
- [ ] End-to-end smoke test on production URL: login → create portfolio → add account → add holding → verify price fetched → verify portfolio value chart appears
