# API Reference

All routes are prefixed `/api/v1` unless noted. All routes require authentication (session cookie from Better Auth) unless marked **public**.

**Response envelope:**
- Success: `{ data: T }`
- Error: `{ error: string }`

**Common status codes:** 200, 201, 400, 401, 403, 404, 500

---

## Portfolios

### `GET /api/v1/portfolios`
List all portfolios for the authenticated user.

**Response:** `{ data: Portfolio[] }`

```typescript
type Portfolio = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}
```

---

### `POST /api/v1/portfolios`
Create a new portfolio.

**Request body:**
```json
{ "name": "Retirement", "description": "Optional description" }
```
- `name`: required, non-empty string
- `description`: optional string or null

**Response:** `{ data: Portfolio }` — 201

---

### `GET /api/v1/portfolios/:id`
Get a single portfolio by ID. Returns 404 if not found or not owned by user.

**Response:** `{ data: Portfolio }`

---

### `PUT /api/v1/portfolios/:id`
Update a portfolio.

**Request body:** (all fields optional)
```json
{ "name": "Updated Name", "description": "New description" }
```

**Response:** `{ data: Portfolio }`

---

### `DELETE /api/v1/portfolios/:id`
Delete a portfolio (cascades to accounts → holdings → dividends).

**Response:** `{ data: null }`

---

### `GET /api/v1/portfolios/:id/value-history?range=`
Get portfolio value history. Verifies portfolio ownership.

**Query param:** `range` — one of `1m`, `3m`, `6m`, `1y`, `all` (default: `all`)

**Response:** `{ data: PortfolioValuePoint[] }`

```typescript
type PortfolioValuePoint = {
  date: string        // YYYY-MM-DD
  totalValue: number
  costBasis: number
  isPartial: boolean  // true if some ticker prices were missing when snapshot was taken
}
```

---

## Accounts

### `GET /api/v1/portfolios/:portfolioId/accounts`
List accounts in a portfolio. Verifies portfolio ownership.

**Response:** `{ data: Account[] }`

```typescript
type Account = {
  id: string
  portfolioId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}
```

---

### `POST /api/v1/portfolios/:portfolioId/accounts`
Create an account within a portfolio.

**Request body:**
```json
{ "name": "Roth IRA", "description": "Optional" }
```

**Response:** `{ data: Account }` — 201

---

### `GET /api/v1/accounts/:id`
Get a single account. Returns 404 if not found or not accessible by user.

**Response:** `{ data: Account }`

---

### `PUT /api/v1/accounts/:id`
Update an account.

**Request body:** (all optional)
```json
{ "name": "New Name", "description": "Updated" }
```

**Response:** `{ data: Account }`

---

### `DELETE /api/v1/accounts/:id`
Delete an account (cascades to holdings and dividends).

**Response:** `{ data: null }`

---

## Holdings

### `GET /api/v1/accounts/:accountId/holdings`
List holdings for an account.

**Response:** `{ data: Holding[] }`

```typescript
type Holding = {
  id: string
  accountId: string
  ticker: string
  shares: string          // numeric as string
  avgCostBasis: string    // numeric as string
  purchaseDate: string    // YYYY-MM-DD
  createdAt: Date
  updatedAt: Date
}
```

---

### `POST /api/v1/accounts/:accountId/holdings`
Create a holding.

**Request body:**
```json
{ "ticker": "AAPL", "shares": "10", "avgCostBasis": "150.00", "purchaseDate": "2024-01-15" }
```
- All fields required
- `purchaseDate`: YYYY-MM-DD

**Response:** `{ data: Holding }` — 201

---

### `POST /api/v1/accounts/:accountId/holdings/import`
Bulk import holdings (parsed from CSV client-side, sent as JSON).

**Request body:**
```json
{
  "holdings": [
    { "ticker": "AAPL", "shares": "10", "avgCostBasis": "150.00", "purchaseDate": "2024-01-15" }
  ]
}
```

**Response:** `{ data: ImportHoldingsResult }`

```typescript
type ImportHoldingsResult = { imported: number; skipped: number }
```

---

### `GET /api/v1/holdings/import/template` — **public**
Download the CSV template file.

**Response:** CSV file download (`vibefolio-holdings-template.csv`)

CSV format:
```
Ticker,Shares,AvgCostBasis,PurchaseDate
AAPL,10,150.00,01/14/2026
```
Note: PurchaseDate in the template is MM/DD/YYYY — the client parses this before sending to the API.

---

### `GET /api/v1/holdings`
Get all holdings for the user across all accounts, aggregated by ticker.

**Response:** `{ data: AggregatedHolding[] }`

```typescript
type AggregatedHolding = {
  ticker: string
  totalShares: string            // sum of all lots for this ticker
  weightedAvgCostBasis: string   // weighted average cost basis across lots
  holdings: Holding[]            // all individual lots
}
```

---

### `GET /api/v1/holdings/:id`
Get a single holding.

**Response:** `{ data: Holding }`

---

### `PUT /api/v1/holdings/:id`
Update a holding.

**Request body:** (all optional)
```json
{ "ticker": "MSFT", "shares": "15", "avgCostBasis": "200.00", "purchaseDate": "2024-03-01" }
```

**Response:** `{ data: Holding }`

---

### `DELETE /api/v1/holdings/:id`
Delete a holding.

**Response:** `{ data: null }`

---

## Dividends

### `GET /api/v1/accounts/:accountId/dividends`
List dividends for an account.

**Response:** `{ data: Dividend[] }`

```typescript
type Dividend = {
  id: string
  accountId: string
  ticker: string
  amountPerShare: string       // numeric as string
  totalAmount: string          // user-entered total payout; numeric as string
  payDate: string              // YYYY-MM-DD
  projectedPerShare: string | null
  projectedPayout: string | null
  status: 'scheduled' | 'projected' | 'paid'
  createdAt: Date
  updatedAt: Date
}
```

---

### `POST /api/v1/accounts/:accountId/dividends`
Create a dividend.

**Request body:**
```json
{
  "ticker": "AAPL",
  "amountPerShare": "0.25",
  "totalAmount": "25.00",
  "payDate": "2024-02-15",
  "status": "paid",
  "projectedPerShare": null,
  "projectedPayout": null
}
```
- `ticker`, `amountPerShare`, `totalAmount`, `payDate`: required
- `status`: optional, defaults to `"scheduled"`
- `projectedPerShare`, `projectedPayout`: optional, only meaningful when `status = "projected"`

**Response:** `{ data: Dividend }` — 201

---

### `GET /api/v1/dividends`
All dividends for the user across all accounts, with account name included.

**Response:** `{ data: DividendWithAccount[] }`

```typescript
type DividendWithAccount = Dividend & { accountName: string }
```

---

### `PUT /api/v1/dividends/:id`
Update a dividend.

**Request body:** (all optional)
```json
{
  "amountPerShare": "0.30",
  "totalAmount": "30.00",
  "payDate": "2024-03-15",
  "status": "paid",
  "projectedPerShare": null,
  "projectedPayout": null
}
```

**Response:** `{ data: Dividend }`

---

### `DELETE /api/v1/dividends/:id`
Delete a dividend.

**Response:** `{ data: null }`

---

## Prices

### `GET /api/v1/prices/:ticker`
Get the latest known price for a ticker. Prices are fetched on server startup, not on demand.

**Response:** `{ data: PriceHistory }`

```typescript
type PriceHistory = {
  ticker: string
  date: string       // YYYY-MM-DD of the price
  closePrice: string // numeric as string
  fetchedAt: Date
}
```

Returns 404 if no price data exists for the ticker.

---

## Dashboard

### `GET /api/v1/dashboard/summary`
Aggregated income stats and portfolio breakdown.

**Response:** `{ data: DashboardSummary }`

```typescript
type DashboardSummary = {
  ytdIncome: number            // sum of paid dividends this calendar year
  allTimeIncome: number        // sum of all paid dividends ever
  projectedAnnual: number      // sum of paid dividends in the last 12 months (rolling)
  portfolioBreakdown: PortfolioBreakdown[]
}

type PortfolioBreakdown = {
  id: string
  name: string
  totalValue: number    // from latest portfolio_value_history snapshot
  costBasis: number     // from latest portfolio_value_history snapshot
  gainLoss: number      // totalValue - costBasis
}
```

---

### `GET /api/v1/dashboard/calendar?year=&month=`
Dividends grouped by pay date for a given month.

**Query params:**
- `year`: integer (defaults to current year)
- `month`: integer 1–12 (defaults to current month)

**Response:** `{ data: CalendarDay[] }`

```typescript
type CalendarDay = {
  date: string        // YYYY-MM-DD
  dividends: Dividend[]
}
```

Only days with at least one dividend are included. Array is sorted by date ascending.

---

### `GET /api/v1/dashboard/projected-income`
12-month forward income projection based on past dividend cadence.

**Response:** `{ data: MonthlyProjection[] }`

```typescript
type MonthlyProjection = {
  year: number
  month: number         // 1–12
  projectedIncome: number
}
```

Returns 12 entries (next 12 months from current month). Projections are 0 for holdings without at least 2 paid dividends with a detectable cadence (monthly, quarterly, or annual).

---

## User Preferences

### `GET /api/user/preferences`
Get the current user's preferences.

**Response:** `{ data: UserPreferences }`

```typescript
type UserPreferences = { theme: 'light' | 'dark' }
```

---

### `PATCH /api/user/preferences`
Update user preferences.

**Request body:**
```json
{ "theme": "dark" }
```

**Response:** `{ data: UserPreferences }`

---

## Auth

All auth endpoints are handled by Better Auth at `/api/auth/*`. The app uses Google OAuth. Session is maintained via HTTP-only cookie.

Key endpoints (managed by Better Auth, not custom routes):
- `POST /api/auth/sign-in/social` — initiate Google OAuth
- `GET /api/auth/callback/google` — OAuth callback
- `POST /api/auth/sign-out` — sign out
- `GET /api/auth/get-session` — get current session
