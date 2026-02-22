# Product Requirements Document

## Product Name
VibeFolio

## Purpose
A personal finance tool for investors to track dividend-paying holdings across accounts and portfolios, monitor income received, forecast future dividend payouts, and track portfolio value and returns over time.

## Users
Multi-user application — each user has their own isolated data. Google login required. No public access. No user self-registration outside of Google OAuth.

---

## Domain Model

```
Portfolio  (e.g. "Retirement", "Savings")
  └── Account  (e.g. "Roth IRA", "Rollover IRA", "Taxable Brokerage")
        └── Holding  (e.g. QQQM, VTI, SCHD)
              └── Dividend
```

- A **portfolio** is an organizational grouping of accounts
- An **account** is a single brokerage account belonging to exactly one portfolio
- A **holding** is a position in a ticker within a specific account; the same ticker in two accounts is two holding records
- A **dividend** is a payment record tied to a specific holding
- **Portfolio value** is the sum of (shares × current price) for all holdings across all accounts in the portfolio

---

## Features

### Authentication
- Google OAuth login via Better Auth
- All pages and API routes require an authenticated session
- Session persists via secure HTTP-only cookie
- Logout clears session server-side

---

### Portfolio Management
- Create, edit, delete portfolios
- List portfolios with summary: account count, current total value, cost basis, unrealized gain/loss
- Each portfolio is strictly scoped to its owner

---

### Account Management
- Create accounts within a portfolio with name (e.g. "Roth IRA") and optional description (e.g. "Fidelity")
- Edit and delete accounts (cascades to holdings and dividends)
- List accounts within a portfolio showing: name, holding count, cost basis

---

### Holdings Management
- Add a holding to an account: ticker, shares, average cost basis per share, purchase date
- Edit shares, cost basis, and purchase date
- Delete a holding (cascades to dividends)
- Holdings list within an account: ticker, shares, cost basis, current price, current value, unrealized gain/loss, return %
- Aggregate view by ticker across all accounts in a portfolio
- Aggregate view by ticker across all portfolios

---

### Price Tracking
Prices are fetched using a **tiered strategy** — Finnhub first, Alpha Vantage as fallback. No dividend data is fetched from external APIs — dividends are entered manually.

- **Finnhub** — primary source; strong ETF and stock coverage; 60 req/min free tier
- **Alpha Vantage** — fallback for tickers Finnhub cannot quote (e.g. mutual funds); 25 req/day free tier

**Daily price check behavior:**
- On app startup, the server checks `price_history` for each ticker held by any user
- If a ticker has no entry for today, it tries Finnhub first; if Finnhub returns no valid quote, it tries Alpha Vantage
- If both APIs fail or return no data, the ticker is skipped silently — the UI shows the last known price with a staleness indicator
- If a ticker already has a price for today, no API call is made
- Alpha Vantage calls are minimized by only falling back when Finnhub fails, staying well within the 25/day limit for typical portfolios with mostly ETFs

**What is stored:**
- Daily closing price per ticker per date in `price_history`
- This accumulates over time naturally as the app runs day to day — no backfill

**Portfolio value snapshots:**
- After prices are fetched on startup, a portfolio value snapshot is written to `portfolio_value_history` for each portfolio
- Snapshot = sum of (shares × price) for all holdings across all accounts in the portfolio, at that date
- If prices are missing for some tickers, the snapshot is written with available data and flagged as partial

---

### Portfolio Value Over Time
A chart showing how a portfolio's total value has changed over time.

**Requirements:**
- Line chart (D3) of portfolio value by date
- Date range selector: 1 month, 3 months, 6 months, 1 year, all time
- Overlay the portfolio's total cost basis as a flat or step line for reference
- Gaps in data (weekends, holidays, missing prices) are rendered as connected lines — no artificial zeros
- Available on the Portfolio detail page

---

### Unrealized Gain / Loss
Per holding and per portfolio.

**Requirements:**
- Per holding: `current value - (shares × avg cost basis)` = unrealized gain/loss in dollars and as a percentage
- Per portfolio: sum of all holding unrealized gains/losses
- Displayed inline in the holdings table
- Color coded — green for gain, red for loss

---

### Dashboard — Summary View
- Total dividends received YTD and all time
- Projected annual dividend income
- Monthly income bar chart — actual vs projected (D3)
- Top dividend payers by total income
- Portfolio value breakdown — current value and cost basis per portfolio

---

### Dividend Calendar
- Monthly grid calendar of upcoming dividend pay dates
- Navigate by month
- Scheduled vs projected payouts visually distinct
- Click a day for full detail

---

### Projected Income Forecast
- 12-month forward income projection (D3 chart + table)
- Cadence-based projection: monthly / quarterly / annual patterns extended forward
- Scheduled dividends used as-is, not double-projected
- View per account, per portfolio, or aggregate

---

## Non-Features (Out of Scope for v1)
- Fetching dividend data from external APIs (manual entry only in v1)
- Real-time streaming prices
- Capital gains / realized P&L (only unrealized)
- DRIP simulation
- Mobile app
- Tax reporting
- Brokerage sync / import

---

## UX Notes
- Clean financial dashboard — data-dense but readable
- Dark mode support
- Sortable data tables
- D3 for all charts
- Staleness indicator when showing a price that is not from today
- Meaningful empty states at each level
- Confirmation dialogs before destructive actions
- Loading skeletons on async data

---

## Success Criteria for v1
- Multiple users can log in and see only their own data
- Can create portfolios → accounts → holdings with purchase dates and cost basis
- Prices fetched on startup via Finnhub (primary) and Alpha Vantage (fallback), once per day per ticker
- Portfolio value over time chart shows real historical data
- Unrealized gain/loss shown per holding and per portfolio
- Dividend income tracking and forecasting works
- All tests pass (TDD — calculations, projections, services, routes)
- TypeScript strict — zero type errors
- Deployed and accessible at a public URL
