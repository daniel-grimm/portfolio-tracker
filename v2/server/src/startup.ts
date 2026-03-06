import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { env } from './env.js'
import { db } from './db/index.js'
import { fetchAndStorePrices } from './services/priceFetchService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function startup(): Promise<void> {
  // ── 0. Run pending migrations ───────────────────────────────────────────────
  try {
    const sql = neon(env.DATABASE_URL)
    const migrationDb = drizzleNeonHttp(sql)
    await migrate(migrationDb, { migrationsFolder: join(__dirname, 'db/migrations') })
    console.log('Startup: migrations applied')
  } catch (err) {
    console.error('Startup: migration failed (non-fatal):', err)
  }

  // ── 1. Fetch prices and snapshot portfolios ─────────────────────────────────
  try {
    const result = await fetchAndStorePrices(db)
    console.log(
      `Price fetch complete — fetched: ${result.fetched}, skipped: ${result.skipped}, failed: ${result.failed.length}`,
    )
    if (result.failed.length > 0) {
      console.warn('Price fetch failed for tickers:', result.failed.join(', '))
    }
  } catch (err) {
    console.error('Startup: price fetch failed (non-fatal):', err)
  }
}
