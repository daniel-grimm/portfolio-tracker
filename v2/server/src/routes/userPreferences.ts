import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getPreferences, updatePreferences } from '../services/userPreferences.js'
import { db } from '../db/index.js'

const router = Router()

const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
})

router.get(
  '/user/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const prefs = await getPreferences(db, req.user!.id)
    res.json({ data: prefs })
  }),
)

router.patch(
  '/user/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = UpdatePreferencesSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const prefs = await updatePreferences(db, req.user!.id, parsed.data)
    res.json({ data: prefs })
  }),
)

export default router
