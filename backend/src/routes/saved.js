import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

export const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('saved_items')
    .select('id, item_type, item_data, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[saved] GET:', error.message, error)
    return res.status(500).json({ error: 'Failed to fetch saved items', details: error.message })
  }
  res.json(data ?? [])
})

router.post('/', requireAuth, async (req, res) => {
  const { item_type, item_data } = req.body
  if (!item_type || !item_data) {
    return res.status(400).json({ error: 'item_type and item_data are required' })
  }

  const { data, error } = await supabase
    .from('saved_items')
    .insert({ user_id: req.user.id, item_type, item_data })
    .select('id')
    .single()

  if (error) {
    console.error('[saved] POST:', error.message, error)
    return res.status(500).json({ error: 'Failed to save item', details: error.message })
  }
  res.status(201).json(data)
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('saved_items')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id')

  if (error) {
    console.error('[saved] DELETE:', error.message, error)
    return res.status(500).json({ error: 'Failed to delete saved item', details: error.message })
  }
  if (!data?.length) return res.status(404).json({ error: 'Saved item not found' })
  res.status(204).send()
})
