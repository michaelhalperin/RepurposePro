import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

export const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('generations')
    .select('id, input_text, output_json, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return res.status(500).json({ error: 'Failed to fetch history' })
  res.json(data ?? [])
})

router.delete('/:id', requireAuth, async (req, res) => {
  const id = req.params.id
  const { data, error } = await supabase
    .from('generations')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('id')

  if (error) return res.status(500).json({ error: 'Failed to delete generation' })
  if (!data?.length) return res.status(404).json({ error: 'Generation not found' })
  res.status(204).send()
})
