# Calculations Reference

Pure functions — no DB, no async, no Express imports. Two files:

- `server/src/services/calculations.ts` — income, gain/loss, portfolio value
- `server/src/services/projections.ts` — forward projections and calendar building

Both are covered by unit tests in `tests/unit/`.

---

## `calculations.ts`

### `calculateTotalDividend(amountPerShare, shares)`
```typescript
calculateTotalDividend(amountPerShare: number, shares: number): number
```
Simple product. Returns `amountPerShare * shares`.

**Note:** `totalAmount` in the database is now user-entered, so this function is used for informational purposes only (e.g. suggesting a total when logging a dividend).

---

### `calculateYTDIncome(dividends)`
```typescript
calculateYTDIncome(dividends: Dividend[]): number
```
Sum of `totalAmount` for dividends where `status === 'paid'` and `payDate` falls in the current calendar year.

---

### `calculateAllTimeIncome(dividends)`
```typescript
calculateAllTimeIncome(dividends: Dividend[]): number
```
Sum of `totalAmount` for all dividends where `status === 'paid'`, regardless of date.

---

### `calculateAnnualizedIncome(dividends)`
```typescript
calculateAnnualizedIncome(dividends: Dividend[]): number
```
Sum of `totalAmount` for paid dividends with `payDate` within the last 12 months (rolling window, not calendar year).

Used as the "Projected Annual" stat card value on the Dividends page.

---

### `calculateUnrealizedGainLoss(shares, avgCostBasis, currentPrice)`
```typescript
calculateUnrealizedGainLoss(shares: number, avgCostBasis: number, currentPrice: number): number
```
Returns `(currentPrice - avgCostBasis) * shares`.

Positive = gain, negative = loss.

---

### `calculateReturnPercent(shares, avgCostBasis, currentPrice)`
```typescript
calculateReturnPercent(shares: number, avgCostBasis: number, currentPrice: number): number
```
Returns `((currentPrice - avgCostBasis) / avgCostBasis) * 100`.

Returns `0` if `shares === 0` or `avgCostBasis === 0` (guards against division by zero).

---

### `calculatePortfolioValue(holdings)`
```typescript
calculatePortfolioValue(holdings: HoldingWithPrice[]): number
```
Sum of `shares * currentPrice` for each holding. Skips holdings where `currentPrice === null` (price data unavailable).

---

### `calculatePortfolioCostBasis(holdings)`
```typescript
calculatePortfolioCostBasis(holdings: Holding[]): number
```
Sum of `shares * avgCostBasis` for each holding.

---

## `projections.ts`

### `detectCadence(payDates)`
```typescript
type Cadence = 'monthly' | 'quarterly' | 'annual' | 'irregular' | 'unknown'

detectCadence(payDates: string[]): Cadence
```
Given an array of YYYY-MM-DD pay date strings, infers the payment cadence by computing gaps between consecutive dates:

| Cadence | Gap range |
|---------|-----------|
| `monthly` | All gaps within ±5 days of 30 |
| `quarterly` | All gaps within ±15 days of 91 |
| `annual` | All gaps within ±30 days of 365 |
| `irregular` | None of the above |
| `unknown` | Fewer than 2 dates provided |

---

### `projectMonthlyIncome(dividends, monthsForward)`
```typescript
projectMonthlyIncome(dividends: Dividend[], monthsForward: number): MonthlyProjection[]
```
Returns `monthsForward` monthly projection slots starting from the **next month** (current month excluded).

Algorithm:
1. Groups dividends by `accountId + ticker` key
2. For each group, looks at `paid` dividends and detects cadence
3. Skips groups with fewer than 2 paid dividends, or with `irregular`/`unknown` cadence
4. Uses the `totalAmount` of the last paid dividend as the projected amount
5. Projects forward based on cadence (every 1, 3, or 12 months from last paid date)
6. Skips months that already have a `scheduled` or `projected` dividend for that holding

```typescript
type MonthlyProjection = { year: number; month: number; projectedIncome: number }
```

---

### `buildDividendCalendar(dividends, year, month)`
```typescript
buildDividendCalendar(dividends: Dividend[], year: number, month: number): CalendarDay[]
```
Filters dividends to those with `payDate` in the given year/month, groups them by date, and returns sorted `CalendarDay[]`.

Returns an empty array if no dividends fall in the given month. Only dates with at least one dividend are included.

```typescript
type CalendarDay = { date: string; dividends: Dividend[] }
```

---

## Usage Context

These functions are called in `server/src/routes/dashboard.ts`:

```typescript
// /dashboard/summary
const ytdIncome = calculateYTDIncome(dividends)
const allTimeIncome = calculateAllTimeIncome(dividends)
const projectedAnnual = calculateAnnualizedIncome(dividends)

// /dashboard/projected-income
const projections = projectMonthlyIncome(dividends, 12)

// /dashboard/calendar
const calendar = buildDividendCalendar(dividends, year, month)
```

`calculatePortfolioValue` and `calculatePortfolioCostBasis` are used in `server/src/startup.ts` when writing portfolio value snapshots.
