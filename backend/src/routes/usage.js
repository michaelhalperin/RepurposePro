import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

export const router = Router()

router.get('/', requireAuth, async (req, res) => {
  let { data, error } = await supabase
    .from('users')
    .select('plan, usage_count')
    .eq('id', req.user.id)
    .single()

  // Row missing (trigger didn't run or schema applied after signup) — create it now
  if (error?.code === 'PGRST116') {
    const { data: upserted, error: upsertErr } = await supabase
      .from('users')
      .upsert({ id: req.user.id, email: req.user.email }, { onConflict: 'id' })
      .select('plan, usage_count')
      .single()

    if (upsertErr) return res.status(500).json({ error: 'Failed to create user row' })
    return res.json(upserted)
  }

  if (error) return res.status(500).json({ error: 'Failed to fetch usage' })
  res.json(data)
})
