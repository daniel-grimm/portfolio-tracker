# VibeFolio — Current State

> **Purpose:** Paste this file into a Claude web session to ground it in the actual state of the codebase before ideating or speccing features. It reflects what is built and deployed, not what was originally planned.

---

## What the App Does

VibeFolio is a multi-user dividend portfolio tracker. Users track investment portfolios, log dividend income, view income history and projections, and monitor unrealized gains/losses.

---

## Domain Hierarchy

```
User
  └── Portfolio  (e.g. "Retirement")
        └── Account  (e.g. "Roth IRA")
              ├── Holding  (ticker, shares, avg cost basis, purchase date)
              └── Dividend  (linked to account + ticker, NOT to a specific holding)
```

Supporting data:
- `price_history` — daily close prices per ticker, shared across all users
- `portfolio_value_history` — daily value snapshot per portfolio

---

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `Login` | Google OAuth sign-in page |
| `/` | `Dashboard` | Portfolio breakdown table, TTM income bar chart, 12-month projected income chart, top dividend payers list |
| `/portfolios` | `Portfolios` | Card grid of portfolios with create/edit/delete |
| `/portfolios/:id` | `PortfolioDetail` | Accounts list, portfolio value chart (D3), holdings aggregated by ticker |
| `/portfolios/:id/accounts/:accountId` | `AccountDetail` | Holdings table with CRUD, CSV import button, dividends for this account |
| `/dividends` | `Dividends` | Stat cards (YTD, all-time, projected annual), monthly calendar, full dividend log table with CRUD |

---

## Features

### Core Features
- Google OAuth authentication (Better Auth)
- Portfolio CRUD
- Account CRUD (nested under portfolios)
- Holding CRUD (nested under accounts)
- Dividend CRUD (nested under accounts, scoped to a ticker)
- Price fetching on server startup (Finnhub primary, Alpha Vantage fallback for mutual funds)
- Portfolio value history (daily snapshots written on startup)
- Dashboard with income summary, TTM income chart, projected income chart
- Dividend calendar (monthly grid view)

### Additional Features (not in original PRD)
- **CSV import** — Upload holdings in bulk via CSV template. Download template at `/api/v1/holdings/import/template`. Format: `Ticker,Shares,AvgCostBasis,PurchaseDate` (date as MM/DD/YYYY). Preview step before committing.
- **Dark mode / theme toggle** — `ThemeToggle` component in NavBar; theme persisted to `user_preferences` table via `PATCH /api/user/preferences`.
- **User preferences** — Server-side storage for `theme` setting per user.
- **Aggregated holdings view** — `GET /api/v1/holdings` returns all holdings across all accounts, aggregated by ticker (total shares, weighted avg cost basis).

---

## Dividend Data Model (Important — differs from older docs)

The dividend schema was redesigned after initial implementation:

| What changed | Old design | Current design |
|---|---|---|
| Parent relationship | `holdingId` (FK to holdings) | `accountId` (FK to accounts) |
| `totalAmount` | Calculated from holdings × amountPerShare | **User-entered directly** |
| `exDate` / `recordDate` | Present | **Removed** |
| `projectedPerShare` | Not present | Nullable, for projected dividends |
| `projectedPayout` | Not present | Nullable, for projected dividends |

Dividend statuses: `paid`, `scheduled`, `projected`

- `paid` — actual dividend received; `totalAmount` is the real payout
- `scheduled` — announced but not yet paid
- `projected` — system-inferred future dividend; `projectedPerShare` and `projectedPayout` hold estimated values shown in the UI with `~` prefix

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, TypeScript strict, Tailwind v4, Shadcn/ui, D3, TanStack Query, React Router v6, React Hook Form |
| Backend | Node.js, Express, TypeScript strict |
| ORM | Drizzle ORM |
| Database | Neon (Postgres) |
| Auth | Better Auth, Google OAuth |
| Price APIs | Finnhub (primary) + Alpha Vantage (mutual fund fallback) |
| Monorepo | npm workspaces: `client/`, `server/`, `shared/` |

---

## Shared Types (`shared/types.ts`)

All types shared between client and server. Key types:

```typescript
type DividendStatus = 'scheduled' | 'projected' | 'paid'

type Dividend = {
  id: string; accountId: string; ticker: string
  amountPerShare: string; totalAmount: string; payDate: string
  projectedPerShare: string | null; projectedPayout: string | null
  status: DividendStatus; createdAt: Date; updatedAt: Date
}

type DividendWithAccount = Dividend & { accountName: string }

type HoldingWithPrice = Holding & {
  currentPrice: string | null; priceDate: string | null
}

type AggregatedHolding = {
  ticker: string; totalShares: string; weightedAvgCostBasis: string
  holdings: Holding[]
}

type DashboardSummary = {
  ytdIncome: number; allTimeIncome: number; projectedAnnual: number
  portfolioBreakdown: PortfolioBreakdown[]
}

type PortfolioBreakdown = {
  id: string; name: string; totalValue: number; costBasis: number; gainLoss: number
}

type PortfolioValuePoint = {
  date: string; totalValue: number; costBasis: number; isPartial: boolean
}

type MonthlyProjection = { year: number; month: number; projectedIncome: number }

type CalendarDay = { date: string; dividends: Dividend[] }

type UserPreferences = { theme: 'light' | 'dark' }

type ImportHoldingsResult = { imported: number; skipped: number }

type ValueHistoryRange = '1m' | '3m' | '6m' | '1y' | 'all'
```

Numeric fields (`shares`, `avgCostBasis`, `amountPerShare`, `totalAmount`, `closePrice`, etc.) are `string` because Drizzle returns Postgres `numeric` columns as strings. Parse with `parseFloat()` or `Number()` as needed.

---

## API Routes Summary

All routes under `/api/v1` require authentication (session cookie) except where noted.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/portfolios` | List user's portfolios |
| POST | `/api/v1/portfolios` | Create portfolio |
| GET | `/api/v1/portfolios/:id` | Get portfolio |
| PUT | `/api/v1/portfolios/:id` | Update portfolio |
| DELETE | `/api/v1/portfolios/:id` | Delete portfolio |
| GET | `/api/v1/portfolios/:id/value-history?range=` | Portfolio value history |
| GET | `/api/v1/portfolios/:portfolioId/accounts` | List accounts in portfolio |
| POST | `/api/v1/portfolios/:portfolioId/accounts` | Create account |
| GET | `/api/v1/accounts/:id` | Get account |
| PUT | `/api/v1/accounts/:id` | Update account |
| DELETE | `/api/v1/accounts/:id` | Delete account |
| GET | `/api/v1/accounts/:accountId/holdings` | List holdings in account |
| POST | `/api/v1/accounts/:accountId/holdings` | Create holding |
| POST | `/api/v1/accounts/:accountId/holdings/import` | Bulk import holdings from CSV data |
| GET | `/api/v1/holdings` | All holdings for user (aggregated by ticker) |
| GET | `/api/v1/holdings/:id` | Get single holding |
| PUT | `/api/v1/holdings/:id` | Update holding |
| DELETE | `/api/v1/holdings/:id` | Delete holding |
| GET | `/api/v1/holdings/import/template` | Download CSV template (no auth required) |
| GET | `/api/v1/accounts/:accountId/dividends` | Dividends for an account |
| POST | `/api/v1/accounts/:accountId/dividends` | Create dividend |
| GET | `/api/v1/dividends` | All dividends for user (with accountName) |
| PUT | `/api/v1/dividends/:id` | Update dividend |
| DELETE | `/api/v1/dividends/:id` | Delete dividend |
| GET | `/api/v1/prices/:ticker` | Latest price for ticker |
| GET | `/api/v1/dashboard/summary` | Dashboard summary stats + portfolio breakdown |
| GET | `/api/v1/dashboard/calendar?year=&month=` | Dividend calendar for month |
| GET | `/api/v1/dashboard/projected-income` | 12-month income projections |
| GET | `/api/user/preferences` | Get user theme preference |
| PATCH | `/api/user/preferences` | Update user theme preference |
| ANY | `/api/auth/*` | Better Auth routes (session, OAuth callbacks) |

---

## Startup Behavior

On server start, before accepting requests:
1. Query all distinct tickers from `holdings` across all users
2. For each ticker without a price today, fetch from Finnhub (or Alpha Vantage as fallback)
3. Insert new `price_history` rows
4. For every portfolio, compute total value + cost basis and upsert a `portfolio_value_history` row with `isPartial = true` if any prices are missing

Failures for individual tickers are logged and skipped. The server starts regardless.

---

## Key Conventions

- All API responses: `{ data: T }` on success, `{ error: string }` on failure
- Auth: session cookie via Better Auth; `requireAuth` middleware on all routes except `/api/auth/*`, `/health`, and the CSV template download
- Numeric DB columns (`numeric` type) come back as strings from Drizzle — always parse before arithmetic
- Forms use React Hook Form without `@hookform/resolvers` (Zod v4 incompatibility); validation is native RHF + server-side Zod
- All charts use D3 (no Recharts or other chart libs)
- Theme stored server-side in `user_preferences` table; `ThemeContext` applies it to `<html>` via `.dark` class
