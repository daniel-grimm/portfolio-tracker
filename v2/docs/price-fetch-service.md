# Price Fetch Service

## Overview

Price fetching and portfolio snapshotting logic lives in a dedicated service so it can be called both from server startup and on demand via a standalone script.

---

## Files

### `server/src/services/priceFetchService.ts`

The core service. Exports a single function:

```ts
fetchAndStorePrices(db: DbInstance): Promise<PriceFetchResult>
```

**What it does, in order:**

1. Queries all distinct tickers across all users' holdings
2. Checks which tickers already have a price entry for today — those are skipped with no API call
3. For tickers without today's price, tries **Finnhub** first (batched)
4. If Finnhub returns no quote for a ticker, falls back to **Alpha Vantage** (single request per ticker)
5. Inserts all successfully fetched prices into `price_history`
6. Upserts a `portfolio_value_history` snapshot for every portfolio — computed as sum of (shares × current price); `isPartial` is set to `true` if any holding's ticker is missing a price
7. Returns a `PriceFetchResult` summary

**Return type:**

```ts
type PriceFetchResult = {
  fetched: number    // tickers successfully priced today (Finnhub + Alpha Vantage combined)
  skipped: number   // tickers that already had a price for today (no API call made)
  failed: string[]  // tickers where both APIs returned no data
}
```

**Failure behavior:**

- Per-ticker failures are silent — logged to console, never thrown
- If Finnhub's batch call itself fails, Alpha Vantage is tried for every ticker individually
- Portfolio snapshot failures are logged per portfolio and do not abort the rest
- The function never throws under normal operation; only truly unexpected errors propagate

---

### `server/src/startup.ts`

Runs once when the server process starts, before accepting requests. Sequence:

1. Applies any pending Drizzle migrations
2. Calls `fetchAndStorePrices(db)` and logs the result summary

The startup sequence is best-effort — a failure in either step is logged and the server continues to start normally.

---

### `server/src/scripts/fetchPrices.ts`

A standalone Node script that runs the price fetch outside of the server process. Useful for manual refreshes, cron jobs, or debugging price data.

---

## Running the Script

From the `server/` directory:

```bash
npx tsx src/scripts/fetchPrices.ts
```

**Prerequisites:** The same environment variables the server requires must be present. The easiest way is to source your `.env` file first:

```bash
# From the repo root
cd server
npx dotenv -e ../.env -- tsx src/scripts/fetchPrices.ts
```

Or if your shell already has the variables exported:

```bash
cd server
npx tsx src/scripts/fetchPrices.ts
```

**Example output:**

```
Price fetch complete — fetched: 12, skipped: 3, failed: 0
```

If any tickers fail both APIs:

```
Price fetch complete — fetched: 10, skipped: 3, failed: 2
Failed tickers: VWELX, VWINX
```

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | Completed (partial failures are still exit 0 — they are logged, not fatal) |
| `1` | Unexpected error that prevented the function from running at all |

---

## API Price Source Behavior

| Situation | Action |
|-----------|--------|
| Ticker already has today's price in DB | Skipped — no API call |
| Finnhub returns a valid quote | Saved; Alpha Vantage not called |
| Finnhub returns no quote | Alpha Vantage attempted |
| Both APIs return no quote | Ticker added to `failed[]`; portfolio snapshots use cost basis as fallback |

Finnhub is the primary source for ETFs and stocks. Alpha Vantage is the fallback and is only called when Finnhub fails — it has a 25 req/day limit on the free tier, so it is intentionally rate-limited to mutual fund tickers that Finnhub can't price.
