import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

export const router = Router()

// DELETE /account — permanently delete the user and all their data
router.delete('/', requireAuth, async (req, res) => {
  const { error } = await supabase.auth.admin.deleteUser(req.user.id)
  if (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ error: 'Failed to delete account' })
  }
  res.json({ deleted: true })
})
