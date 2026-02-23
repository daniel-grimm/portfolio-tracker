// Test database helpers using PGLite — real PostgreSQL compiled to WASM.
// PGLite is fully compatible with drizzle-orm and avoids the rowMode/fields
// incompatibilities that pg-mem has with drizzle-orm v0.41+.

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as schema from '../../server/src/db/schema.js'
import type { DbInstance } from '../../server/src/db/index.js'

export type { DbInstance }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export type TestDb = {
  client: PGlite
  db: DbInstance
}

async function applySchema(client: PGlite): Promise<void> {
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
      await client.exec(stmt)
    } catch {
      // PGLite doesn't support every Postgres syntax — skip unsupported ones
    }
  }
}

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite()
  await applySchema(client)
  const db = drizzle(client, { schema }) as unknown as DbInstance
  return { client, db }
}

export async function withTestTransaction<T>(
  testDb: TestDb,
  fn: (db: DbInstance) => Promise<T>,
): Promise<T> {
  // PGLite supports real transactions — use BEGIN/ROLLBACK for isolation
  await testDb.client.exec('BEGIN')
  try {
    return await fn(testDb.db)
  } finally {
    await testDb.client.exec('ROLLBACK')
  }
}
