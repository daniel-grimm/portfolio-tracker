# Architecture

## Overview

A dividend portfolio tracker with price tracking, portfolio value history, and unrealized gain/loss. Built with TypeScript throughout, multi-user, TDD across calculations, projections, services, and routes. Prices are fetched on startup via a tiered strategy — Finnhub primary, Alpha Vantage fallback — once per day per ticker.

---

## Domain Model

```
Portfolio  (e.g. "Retirement", "Savings")
  └── Account  (e.g. "Roth IRA", "Rollover IRA")
        └── Holding  (ticker, shares, avg cost basis, purchase date)
              └── Dividend
```

**Supporting tables (not user-owned):**
```
price_history             (ticker, date, close_price)
portfolio_value_history   (portfolio_id, date, total_value, cost_basis, is_partial)
```

Ownership chain for authorization: `dividend → holding → account → portfolio → user_id`

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + Vite | Fast dev server, modern tooling |
| Component Library | Shadcn/ui + Tailwind CSS | Owned components, no vendor lock-in |
| Charting | D3 | Full rendering control for value-over-time, income, and projection charts |
| Backend | Node.js + Express | Familiar, sufficient for early traction |
| Language | TypeScript (strict) | End-to-end type safety |
| ORM | Drizzle ORM | Type-safe schema, first-class migrations |
| Database | Neon (Postgres) | Free tier, managed, multi-user |
| Auth | Better Auth | Google OAuth, session management |
| Price Data | Finnhub + Alpha Vantage | Tiered: Finnhub primary (ETFs/stocks), Alpha Vantage fallback (mutual funds); no dividend data fetched externally |
| Testing | Vitest + pg-mem + supertest | TDD across calculations, projections, services, routes |
| Hosting (Frontend) | Azure Static Web Apps | Free tier |
| Hosting (Backend) | Railway or Azure Container Apps | Low-cost, persistent |

---

## Repository Structure

```
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn/ui — do not edit
│   │   │   └── charts/          # D3 chart components
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   │       ├── api.ts
│   │       └── auth.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts        # Source of truth
│   │   │   ├── index.ts
│   │   │   └── migrations/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── calculations.ts  # Pure — unit tested
│   │   │   ├── projections.ts   # Pure — unit tested
│   │   │   ├── portfolios.ts
│   │   │   ├── accounts.ts
│   │   │   ├── holdings.ts
│   │   │   ├── dividends.ts
│   │   │   ├── prices.ts        # Price fetch + cache logic
│   │   │   └── portfolioValue.ts # Snapshot writes + value history queries
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── finnhub.ts       # Finnhub API client (primary)
│   │   │   └── alphaVantage.ts  # Alpha Vantage client (fallback)
│   │   ├── startup.ts           # Runs price fetch + snapshot on server start
│   │   ├── env.ts
│   │   └── index.ts
│   ├── drizzle.config.ts
│   ├── tsconfig.json
│   └── tsconfig.build.json
│
├── shared/
│   ├── types.ts
│   └── tsconfig.json
│
├── tests/
│   ├── unit/
│   │   ├── calculations.test.ts
│   │   ├── projections.test.ts
│   │   └── formatting.test.ts
│   ├── services/
│   │   ├── portfolios.service.test.ts
│   │   ├── accounts.service.test.ts
│   │   ├── holdings.service.test.ts
│   │   ├── dividends.service.test.ts
│   │   ├── prices.service.test.ts
│   │   └── portfolioValue.service.test.ts
│   ├── routes/
│   │   ├── portfolios.routes.test.ts
│   │   ├── accounts.routes.test.ts
│   │   ├── holdings.routes.test.ts
│   │   ├── dividends.routes.test.ts
│   │   └── dashboard.routes.test.ts
│   └── helpers/
│       ├── db.ts
│       ├── app.ts
│       └── factories.ts
│
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Schema

### User-Owned Tables

```typescript
export const portfolios = pgTable('portfolios', {
  id:          uuid('id').defaultRandom().primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index('portfolios_user_id_idx').on(t.userId),
}));

export const accounts = pgTable('accounts', {
  id:          uuid('id').defaultRandom().primaryKey(),
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  portfolioIdIdx: index('accounts_portfolio_id_idx').on(t.portfolioId),
}));

export const holdings = pgTable('holdings', {
  id:            uuid('id').defaultRandom().primaryKey(),
  accountId:     uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  ticker:        text('ticker').notNull(),
  shares:        numeric('shares', { precision: 18, scale: 6 }).notNull(),
  avgCostBasis:  numeric('avg_cost_basis', { precision: 18, scale: 6 }).notNull(),
  purchaseDate:  date('purchase_date').notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  accountIdIdx: index('holdings_account_id_idx').on(t.accountId),
}));

export const dividends = pgTable('dividends', {
  id:             uuid('id').defaultRandom().primaryKey(),
  holdingId:      uuid('holding_id').notNull().references(() => holdings.id, { onDelete: 'cascade' }),
  ticker:         text('ticker').notNull(),
  amountPerShare: numeric('amount_per_share', { precision: 18, scale: 6 }).notNull(),
  totalAmount:    numeric('total_amount', { precision: 18, scale: 6 }).notNull(),
  exDate:         date('ex_date').notNull(),
  payDate:        date('pay_date').notNull(),
  recordDate:     date('record_date'),
  status:         text('status', { enum: ['paid', 'scheduled', 'projected'] }).notNull().default('paid'),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  holdingIdIdx: index('dividends_holding_id_idx').on(t.holdingId),
  payDateIdx:   index('dividends_pay_date_idx').on(t.payDate),
}));
```

### Price & Value Tables

```typescript
// One row per ticker per date. Shared across all users — not user-scoped.
export const priceHistory = pgTable('price_history', {
  ticker:     text('ticker').notNull(),
  date:       date('date').notNull(),
  closePrice: numeric('close_price', { precision: 18, scale: 6 }).notNull(),
  fetchedAt:  timestamp('fetched_at').defaultNow().notNull(),
}, (t) => ({
  pk:        primaryKey({ columns: [t.ticker, t.date] }),
  tickerIdx: index('price_history_ticker_idx').on(t.ticker),
  dateIdx:   index('price_history_date_idx').on(t.date),
}));

// One row per portfolio per date.
export const portfolioValueHistory = pgTable('portfolio_value_history', {
  id:          uuid('id').defaultRandom().primaryKey(),
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  date:        date('date').notNull(),
  totalValue:  numeric('total_value', { precision: 18, scale: 6 }).notNull(),
  costBasis:   numeric('cost_basis', { precision: 18, scale: 6 }).notNull(),
  isPartial:   boolean('is_partial').notNull().default(false), // true if some ticker prices were missing
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  portfolioDateIdx: index('portfolio_value_history_portfolio_date_idx').on(t.portfolioId, t.date),
  uniquePortfolioDate: uniqueIndex('portfolio_value_history_unique').on(t.portfolioId, t.date),
}));
```

---

## Price Fetching Strategy

### Startup Sequence (`server/src/startup.ts`)

Runs once when the Express server starts, before accepting requests:

1. Query the database for all distinct tickers held by any user
2. For each ticker, check `price_history` for an entry dated today
3. Collect tickers with no entry for today — these need fetching
4. Fetch prices in batches via Finnhub; for any ticker where Finnhub returns `null`, fall back to Alpha Vantage
5. Insert successfully fetched prices into `price_history`; silently skip tickers where both APIs returned `null`
6. For each portfolio (across all users), compute the current total value and cost basis
7. Upsert a row into `portfolio_value_history` for today

### Price API Clients

### `server/src/lib/finnhub.ts` — Primary Source

Typed wrapper around Finnhub's `/quote` endpoint. Used for ETFs and stocks.

```typescript
export interface PriceQuote {
  ticker: string
  closePrice: number
  fetchedAt: Date
}

export async function fetchFinnhubQuote(ticker: string): Promise<PriceQuote | null>
export async function fetchFinnhubQuotesBatched(
  tickers: string[],
  options: { delayMs: number }
): Promise<Map<string, PriceQuote | null>>
```

Free tier: 60 req/min. Default delay between batched calls: 1100ms (`FINNHUB_FETCH_DELAY_MS`). Returns `null` on failure — does not throw.

### `server/src/lib/alphaVantage.ts` — Fallback Source

Typed wrapper around Alpha Vantage's `GLOBAL_QUOTE` endpoint. Used when Finnhub returns no valid quote (e.g. mutual funds).

```typescript
export async function fetchAlphaVantageQuote(ticker: string): Promise<PriceQuote | null>
```

Free tier: 25 req/day. Only called as a fallback — in practice only fires for mutual fund tickers, keeping usage well within limits. Returns `null` on failure — does not throw.

### Shared `PriceQuote` type

Both clients return the same `PriceQuote` shape so the startup sequence treats them uniformly. The `PriceQuote` interface lives in `shared/types.ts`.

### Price Staleness

The UI displays the last known price for each ticker along with its date. If the price is not from today, a staleness indicator is shown (e.g. "Last updated: Dec 12"). This is expected behavior on weekends and holidays.

---

## Ownership Enforcement Pattern

```typescript
// portfolios — direct user_id check
where: and(eq(portfolios.id, id), eq(portfolios.userId, userId))

// accounts — join to portfolio
.from(accounts)
.innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
.where(and(eq(accounts.id, accountId), eq(portfolios.userId, userId)))

// holdings — join account → portfolio
.from(holdings)
.innerJoin(accounts, eq(holdings.accountId, accounts.id))
.innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
.where(and(eq(holdings.id, holdingId), eq(portfolios.userId, userId)))

// dividends — join holding → account → portfolio
.from(dividends)
.innerJoin(holdings, eq(dividends.holdingId, holdings.id))
.innerJoin(accounts, eq(holdings.accountId, accounts.id))
.innerJoin(portfolios, eq(accounts.portfolioId, portfolios.id))
.where(and(eq(dividends.id, dividendId), eq(portfolios.userId, userId)))
```

Not-found and not-owned both return 404.

---

## Calculation Logic

Pure TypeScript functions — no DB, no Express, no async.

```typescript
// calculations.ts
export function calculateTotalDividend(amountPerShare: number, shares: number): number
export function calculateYTDIncome(dividends: Dividend[]): number
export function calculateAllTimeIncome(dividends: Dividend[]): number
export function calculateAnnualizedIncome(dividends: Dividend[]): number
export function calculateUnrealizedGainLoss(shares: number, avgCostBasis: number, currentPrice: number): number
export function calculateReturnPercent(shares: number, avgCostBasis: number, currentPrice: number): number
export function calculatePortfolioValue(holdings: HoldingWithPrice[]): number
export function calculatePortfolioCostBasis(holdings: Holding[]): number

// projections.ts
export function detectCadence(payDates: Date[]): 'monthly' | 'quarterly' | 'annual' | 'irregular' | 'unknown'
export function projectMonthlyIncome(dividends: Dividend[], monthsForward: number): MonthlyProjection[]
export function buildDividendCalendar(dividends: Dividend[], year: number, month: number): CalendarDay[]
```

---

## Charting with D3

All charts are React components using D3 internally. Pattern:

```typescript
import * as d3 from 'd3'
import { useRef, useEffect } from 'react'

export function PortfolioValueChart({ data }: { data: PortfolioValuePoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!svgRef.current || !data.length) return
    const svg = d3.select(svgRef.current)
    // D3 rendering
  }, [data])
  return <svg ref={svgRef} />
}
```

Charts live in `client/src/components/charts/`. Never use Recharts or any other charting library.

**Required charts:**
- `PortfolioValueChart` — portfolio value over time, with cost basis overlay, date range selector
- `IncomeBarChart` — monthly actual vs projected income, current year
- `ProjectedIncomeChart` — 12-month forward income projection

---

## Testing Philosophy

**TDD applies to calculations, projections, services, and routes.**

| Layer | Approach |
|---|---|
| Calculations & projections | TDD — pure unit tests |
| Services (incl. prices, portfolioValue) | TDD — `pg-mem` in-memory Postgres |
| Routes | TDD — `supertest` + mocked services |
| DB schema/migrations | Not tested |
| UI | Not tested |
| Finnhub + Alpha Vantage clients | Not tested (external API wrappers) |

Services accept `db` as an injected parameter. Each test runs in a rolled-back transaction.

Route tests mock services with `vi.mock()`. Better Auth session middleware is stubbed.

### Coverage Targets

| Layer | Target |
|---|---|
| `calculations.ts` | 100% |
| `projections.ts` | 90%+ |
| `formatting.ts` | 100% |
| Services | 85%+ |
| Routes | 80%+ |

---

## API Shape

```
GET    /api/v1/portfolios
POST   /api/v1/portfolios
GET    /api/v1/portfolios/:id
PUT    /api/v1/portfolios/:id
DELETE /api/v1/portfolios/:id
GET    /api/v1/portfolios/:id/value-history    # portfolio value over time

GET    /api/v1/portfolios/:id/accounts
POST   /api/v1/portfolios/:id/accounts
GET    /api/v1/accounts/:id
PUT    /api/v1/accounts/:id
DELETE /api/v1/accounts/:id

GET    /api/v1/accounts/:id/holdings
POST   /api/v1/accounts/:id/holdings
GET    /api/v1/holdings/:id
PUT    /api/v1/holdings/:id
DELETE /api/v1/holdings/:id

GET    /api/v1/holdings/:id/dividends
POST   /api/v1/holdings/:id/dividends
PUT    /api/v1/dividends/:id
DELETE /api/v1/dividends/:id

GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/calendar
GET    /api/v1/dashboard/projected-income

GET    /api/v1/prices/:ticker               # latest known price + date for a ticker
```

All success responses: `{ data: T }`
All error responses: `{ error: string, code?: string }`

---

## Environment Variables

```bash
# server/.env
DATABASE_URL=
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FINNHUB_API_KEY=
FINNHUB_FETCH_DELAY_MS=1100     # delay between Finnhub calls (default 1100ms)
ALPHA_VANTAGE_API_KEY=
BASE_URL=
PORT=3000

# client/.env
VITE_API_BASE_URL=
```

All validated on startup via Zod in `server/src/env.ts`. Server exits immediately if any are missing.
