// Startup sequence — runs once before the server accepts requests.
// Phase 9 will implement:
//   1. Fetch missing prices via Finnhub + Alpha Vantage
//   2. Upsert portfolio value snapshots for all portfolios
export async function startup(): Promise<void> {
  console.log('Startup: placeholder — price fetching and snapshots implemented in Phase 9')
}
