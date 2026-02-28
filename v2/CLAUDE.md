# CLAUDE.md

This file is the primary reference for Claude Code when working on this project. Read it before making any changes.

---

## What This App Does

A multi-user dividend portfolio tracker with price tracking and portfolio value history. The domain hierarchy is:

```
Portfolio  (e.g. "Retirement", "Savings")
  └── Account  (e.g. "Roth IRA", "Rollover IRA", "Taxable Brokerage")
        └── Holding  (ticker, shares, avg cost basis, purchase date)
              └── Dividend
```

Supporting data (not user-owned):
- `price_history` — daily close prices per ticker, shared across all users
- `portfolio_value_history` — daily total value snapshot per portfolio

Each authenticated user can: create portfolios → add accounts → add holdings → log dividends → view income dashboards and portfolio value over time with unrealized gain/loss.

---

## Tech Stack

- **Frontend:** React + Vite, TypeScript (strict), Shadcn/ui, Tailwind CSS, D3, TanStack Query, React Router v6, React Hook Form + Zod
- **Backend:** Node.js, Express, TypeScript (strict)
- **ORM:** Drizzle ORM with Drizzle Kit for migrations
- **Database:** Neon (Postgres)
- **Auth:** Better Auth with Google OAuth
- **Price Data:** Finnhub (primary, ETFs/stocks) + Alpha Vantage (fallback, mutual funds); no dividend data from external APIs
- **Testing:** Vitest, pg-mem, supertest
- **Monorepo:** `client/`, `server/`, `shared/`, `tests/`

---

## TypeScript Rules

- Strict mode everywhere — `"strict": true` in all tsconfigs
- **No `any`.** Use `unknown` and narrow, or define a proper type
- **No `@ts-ignore` or `@ts-expect-error`** without an explanatory comment
- Shared types in `shared/types.ts` — imported by both client and server
- Project references in use — do not break the reference chain
- `npm run typecheck` must report zero errors before any task is complete

---

## Project Structure

```
client/src/
  components/
    ui/              # Shadcn — DO NOT edit
    charts/          # D3 chart components
  pages/
  hooks/
  lib/
    api.ts
    auth.ts

server/src/
  db/
    schema.ts        # Source of truth — never edit the DB directly
    migrations/      # Generated SQL — never edit manually
    index.ts
  routes/
  services/
    calculations.ts  # Pure functions — TDD, no DB/Express
    projections.ts   # Pure functions — TDD, no DB/Express
    portfolios.ts    # Accepts db as parameter
    accounts.ts      # Accepts db as parameter
    holdings.ts      # Accepts db as parameter
    dividends.ts     # Accepts db as parameter
    prices.ts        # Price cache checks + inserts; accepts db as parameter
    portfolioValue.ts # Snapshot writes + value history queries; accepts db as parameter
  middleware/
    auth.ts
  lib/
    auth.ts
    finnhub.ts       # Finnhub client — primary price source
    alphaVantage.ts  # Alpha Vantage client — fallback for mutual funds
  startup.ts         # Runs on server start: fetch missing prices → write portfolio snapshots
  env.ts
  index.ts

shared/
  types.ts

tests/
  unit/
  services/
  routes/
  helpers/
    db.ts            # createTestDb() + withTestTransaction()
    app.ts           # Express app factory with auth stubbed
    factories.ts     # makePortfolio(), makeAccount(), makeHolding(), makeDividend(), makePriceHistory()
```

---

## Database & Migrations

`schema.ts` is the single source of truth. Never edit the database directly.

```bash
npm run db:generate   # After changing schema.ts
npm run db:migrate    # Apply pending migrations
npm run db:studio     # Visual DB browser
```

Initial setup (once per environment):
```bash
npm run db:migrate
npx better-auth migrate
```

Every schema change must have a migration generated and committed in the same PR.

---

## Multi-User Data Isolation

Enforced in the service layer. The ownership chain is:
`dividend → holding → account → portfolio → user_id`

`price_history` and `portfolio_value_history` are **not** user-scoped:
- `price_history` is shared — the same ticker price is used by all users
- `portfolio_value_history` is scoped by `portfolio_id`; verify portfolio ownership before reading or writing it

```typescript
// Always verify portfolio ownership before accessing its value history
const portfolio = await getPortfolioById(db, portfolioId, userId) // throws if not owned
const history = await getPortfolioValueHistory(db, portfolioId, range)
```

---

## Startup Price Fetching (`server/src/startup.ts`)

This runs once when the server starts, before accepting requests:

1. Query all distinct tickers from `holdings` across all users
2. For each ticker, check `price_history` for a row dated today
3. Fetch prices for tickers with no entry today using `fetchQuotesBatched` from `finnhub.ts`
4. Insert new rows into `price_history`
5. For every portfolio (all users), compute `totalValue` and `costBasis` from current holdings and latest prices
6. Upsert a row into `portfolio_value_history` for today, setting `isPartial = true` if any ticker price is missing

The startup sequence is best-effort — failures for individual tickers are logged and skipped. The app starts and serves requests regardless of whether all prices were fetched.

---

## Price API Clients

**`server/src/lib/finnhub.ts`** — primary source for ETFs and stocks.
- `fetchFinnhubQuote(ticker)` — single fetch; returns `null` on failure, never throws
- `fetchFinnhubQuotesBatched(tickers, { delayMs })` — batched with delay; 60 req/min free tier; default 1100ms delay

**`server/src/lib/alphaVantage.ts`** — fallback for mutual funds and anything Finnhub can't quote.
- `fetchAlphaVantageQuote(ticker)` — single fetch; returns `null` on failure, never throws
- 25 req/day free tier — only called when Finnhub returns `null`, so in practice only fires for mutual fund tickers

Both return the same `PriceQuote` type from `shared/types.ts`. Neither is unit tested (external API wrappers).

---

## Calculations

Pure functions — no DB, no async, no Express imports. All in `calculations.ts` or `projections.ts`.

```typescript
// calculations.ts
calculateTotalDividend(amountPerShare, shares)
calculateYTDIncome(dividends)
calculateAllTimeIncome(dividends)
calculateAnnualizedIncome(dividends)
calculateUnrealizedGainLoss(shares, avgCostBasis, currentPrice)   // (currentPrice - avgCostBasis) × shares
calculateReturnPercent(shares, avgCostBasis, currentPrice)        // gain/loss ÷ totalCostBasis × 100
calculatePortfolioValue(holdings: HoldingWithPrice[])             // sum of shares × currentPrice
calculatePortfolioCostBasis(holdings: Holding[])                  // sum of shares × avgCostBasis
```

---

## Charting with D3

All charts are React components using D3 internally. Import as `import * as d3 from 'd3'`. Use `useRef` + `useEffect` pattern. Never use Recharts or any other charting library.

```typescript
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

Required charts: `PortfolioValueChart`, `IncomeBarChart`, `ProjectedIncomeChart`.

---

## Service Layer Rules

- Routes call services — no business logic in routes
- Services accept `db: DbInstance` as first parameter (dependency injection for testing)
- `calculations.ts` and `projections.ts` are pure — no DB or async
- `prices.ts` and `portfolioValue.ts` are services like the others — accept `db`, follow the same TDD rules

---

## Testing

**TDD applies to calculations, projections, services (including prices and portfolioValue), and routes.**
UI, DB schema, and the Finnhub client wrapper are not tested.

| Layer | Tool |
|---|---|
| Calculations & projections | Vitest, no mocking |
| Services | Vitest + pg-mem |
| Routes | Vitest + supertest + vi.mock() |
| UI / DB schema / price API clients (Finnhub, Alpha Vantage) | Not tested |

### TDD Workflow — no exceptions

1. Write the test first
2. `npm run test:watch` — confirm red
3. Minimal implementation — green
4. Refactor

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Service test pattern
```typescript
const testDb = createTestDb()  // pg-mem with schema applied
// Each test in a rolled-back transaction via withTestTransaction()
```

### Route test pattern
```typescript
vi.mock('../../server/src/services/portfolios')
// Always test the 401 case for every route
```

---

## API Conventions

- All routes prefixed `/api/v1`
- All routes except `/api/auth/*` and `/health` require `requireAuth`
- Success: `{ data: T }` — Error: `{ error: string, code?: string }`
- Use `asyncHandler` wrapper
- Status codes: 200, 201, 400, 401, 404, 500

---

## Frontend Conventions

- All server state via TanStack Query
- All API calls through `client/src/lib/api.ts`
- All forms use React Hook Form + Zod
- Add Shadcn components via `npx shadcn@latest add <component>`
- `useSession()` from Better Auth is the source of truth for the current user
- Price staleness: always display the price date alongside the price; if not today, show a staleness indicator

---

## Internationalisation (i18n)

All user-visible strings are managed via `react-i18next`. The app is English-only for now; i18n is in place for future-proofing and string organisation.

### Setup

- Package: `i18next` + `react-i18next` (client workspace only)
- Init file: `client/src/i18n/index.ts` — imported once in `main.tsx` before the app renders
- Strings: `client/src/i18n/locales/en.json` — single `translation` namespace, organised by feature

### Usage

```typescript
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()        // no namespace argument
t('common.save')                       // → "Save"
t('portfolio.deleteConfirm', { name }) // interpolation
t('projections.excludedHoldings', { count }) // plurals via _one / _other keys
t('calendar.months', { returnObjects: true }) as string[] // array values
```

### Namespace structure in `en.json`

| Key | Contents |
|---|---|
| `common` | Save, Cancel, Delete, Edit, Loading, Required, etc. |
| `auth` | App name, tagline, sign-in, sign-out |
| `portfolio` | Portfolio CRUD labels, value/cost/gain labels |
| `account` | Account CRUD labels |
| `holding` | Holding CRUD labels, table headers, CSV import strings |
| `dividend` | Dividend CRUD labels, status values, form fields |
| `calendar` | Calendar UI labels, month/day arrays, legend |
| `dashboard` | Dashboard section headings, chart labels |
| `projections` | Projections page labels, table headers, stat cards |
| `errors` | Generic error messages |
| `nav` | Navigation link labels |

### Rules

- **Never hardcode a user-visible string in a component.** Always use `t()`.
- Class components (e.g. `ErrorBoundary`) use `import i18n from '@/i18n'` and `i18n.t(...)` since hooks are not available.
- Do not add a second language until explicitly requested — just add keys to `en.json` and use them via `t()`.

---

## Definition of Done

**All tasks:**
1. Feature works as described
2. `npm run typecheck` → zero errors
3. Schema changed → migration generated and applied

**Calculations, projections, services, and routes (TDD):**
4. Tests written before implementation
5. `npm run test` → all tests pass
6. Coverage has not dropped below target
