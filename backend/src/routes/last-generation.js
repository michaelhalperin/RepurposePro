import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

export const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('generations')
    .select('input_text, output_json, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error?.code === 'PGRST116') return res.json(null) // no generations yet
  if (error) return res.status(500).json({ error: 'Failed to fetch last generation' })

  res.json(data)
})
