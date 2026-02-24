import { eq } from 'drizzle-orm'
import type { DbInstance } from '../db/index.js'
import { user } from '../db/auth-schema.js'
import type { UserPreferences } from 'shared'

export async function getPreferences(db: DbInstance, userId: string): Promise<UserPreferences> {
  const [row] = await db.select({ theme: user.theme }).from(user).where(eq(user.id, userId))
  if (!row) return { theme: 'light' }
  const theme = row.theme === 'dark' ? 'dark' : 'light'
  return { theme }
}

export async function updatePreferences(
  db: DbInstance,
  userId: string,
  data: { theme: 'light' | 'dark' },
): Promise<UserPreferences> {
  await db.update(user).set({ theme: data.theme }).where(eq(user.id, userId))
  return { theme: data.theme }
}
