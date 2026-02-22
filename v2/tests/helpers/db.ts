// Test database helpers using pg-mem for in-memory Postgres.
// Applies the real Drizzle schema migration SQL to pg-mem so service tests
// run against a realistic schema without hitting the real Neon database.

import { IMemoryDb, newDb } from 'pg-mem'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as schema from '../../server/src/db/schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export type DbInstance = NodePgDatabase<typeof schema>

export type TestDb = {
  mem: IMemoryDb
  db: DbInstance
}

function applySchema(mem: IMemoryDb): void {
  const sqlPath = join(
    __dirname,
    '../../server/src/db/migrations/0000_nostalgic_lady_vermin.sql',
  )
  const raw = readFileSync(sqlPath, 'utf-8')
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const stmt of statements) {
    try {
      mem.public.none(stmt)
    } catch {
      // pg-mem doesn't support all Postgres syntax (e.g. USING btree) — skip those
    }
  }
}

export function createTestDb(): TestDb {
  const mem = newDb()
  applySchema(mem)

  const { Pool } = mem.adapters.createPg()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = new Pool() as any
  const db = drizzle(pool, { schema })

  return { mem, db }
}

export async function withTestTransaction<T>(
  testDb: TestDb,
  fn: (db: DbInstance) => Promise<T>,
): Promise<T> {
  const backup = testDb.mem.backup()
  try {
    return await fn(testDb.db)
  } finally {
    testDb.mem.restore(backup)
  }
}
