import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb, withTestTransaction, type TestDb } from '../helpers/db.js'
import {
  getPreferences,
  updatePreferences,
} from '../../server/src/services/userPreferences.js'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})

async function insertUser(db: TestDb, id: string): Promise<void> {
  await db.client.exec(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ('${id}', 'Test User', '${id}@test.com', true, NOW(), NOW())`,
  )
}

describe('getPreferences', () => {
  it("returns default 'light' for a new user", async () => {
    await withTestTransaction(testDb, async (db) => {
      await insertUser(testDb, 'user-pref-1')
      const result = await getPreferences(db, 'user-pref-1')
      expect(result).toEqual({ theme: 'light' })
    })
  })

  it("returns 'light' when theme column is unset (non-existent user)", async () => {
    await withTestTransaction(testDb, async (db) => {
      const result = await getPreferences(db, 'no-such-user')
      expect(result).toEqual({ theme: 'light' })
    })
  })
})

describe('updatePreferences', () => {
  it("persists 'dark' and returns it", async () => {
    await withTestTransaction(testDb, async (db) => {
      await insertUser(testDb, 'user-pref-2')
      const result = await updatePreferences(db, 'user-pref-2', { theme: 'dark' })
      expect(result).toEqual({ theme: 'dark' })
      const fetched = await getPreferences(db, 'user-pref-2')
      expect(fetched).toEqual({ theme: 'dark' })
    })
  })

  it("persists 'light' and returns it", async () => {
    await withTestTransaction(testDb, async (db) => {
      await insertUser(testDb, 'user-pref-3')
      await updatePreferences(db, 'user-pref-3', { theme: 'dark' })
      const result = await updatePreferences(db, 'user-pref-3', { theme: 'light' })
      expect(result).toEqual({ theme: 'light' })
    })
  })
})
