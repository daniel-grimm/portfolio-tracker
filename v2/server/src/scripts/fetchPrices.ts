// Run from the server/ directory:
// npx tsx src/scripts/fetchPrices.ts

import { db } from '../db/index.js'
import { fetchAndStorePrices } from '../services/priceFetchService.js'

try {
  const result = await fetchAndStorePrices(db)
  console.log(
    `Price fetch complete — fetched: ${result.fetched}, skipped: ${result.skipped}, failed: ${result.failed.length}`,
  )
  if (result.failed.length > 0) {
    console.warn('Failed tickers:', result.failed.join(', '))
  }
  process.exit(0)
} catch (err) {
  console.error('Unexpected error during price fetch:', err)
  process.exit(1)
}
