import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { generateContent } from '../lib/ai.js'
import { passesMinGenerationInput } from '../lib/socialResolve.js'

export const router = Router()

const FREE_LIMIT = 5
const TIMEOUT_MS = Number(process.env.GENERATION_TIMEOUT_MS || 75_000)

// Simple in-memory rate limiter — 1 request per 8 seconds per user
const lastRequestAt = new Map()

function rateLimiter(req, res, next) {
  const now = Date.now()
  const last = lastRequestAt.get(req.user.id) ?? 0
  if (now - last < 8000) {
    return res.status(429).json({ error: 'Please wait a moment before generating again.' })
  }
  lastRequestAt.set(req.user.id, now)
  next()
}

router.post('/', requireAuth, rateLimiter, async (req, res) => {
  const { input, tone } = req.body

  if (!input || typeof input !== 'string' || !passesMinGenerationInput(input)) {
    return res.status(400).json({
      error: 'Input must be at least 10 characters, or a supported social link (YouTube, TikTok, Instagram).',
    })
  }

  // Fetch user plan + usage (upsert if row missing)
  let { data: user, error: userErr } = await supabase
    .from('users')
    .select('plan, usage_count')
    .eq('id', req.user.id)
    .single()

  if (userErr?.code === 'PGRST116') {
    const { data: upserted, error: upsertErr } = await supabase
      .from('users')
      .upsert({ id: req.user.id, email: req.user.email }, { onConflict: 'id' })
      .select('plan, usage_count')
      .single()
    if (upsertErr) return res.status(500).json({ error: 'Failed to create user row' })
    user = upserted
    userErr = null
  }

  if (userErr) return res.status(500).json({ error: 'Failed to fetch user data' })

  // Enforce free tier limit
  if (user.plan === 'free' && user.usage_count >= FREE_LIMIT) {
    return res.status(403).json({ error: 'limit_reached', plan: user.plan, usage_count: user.usage_count })
  }

  // Generate with timeout
  let output
  let timeoutId
  try {
    const timeout = new Promise((_, reject) =>
      timeoutId = setTimeout(() => reject(new Error('Generation timed out. Please try again.')), TIMEOUT_MS)
    )
    output = await Promise.race([generateContent(input.trim(), tone), timeout])
  } catch (err) {
    console.error('AI generation error:', err.message)
    return res.status(500).json({ error: err.message || 'Content generation failed. Please try again.' })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  // Store generation
  const { error: insertErr } = await supabase
    .from('generations')
    .insert({ user_id: req.user.id, input_text: input.trim(), output_json: output })

  if (insertErr) console.error('Failed to store generation:', insertErr)

  // Increment usage count
  await supabase
    .from('users')
    .update({ usage_count: user.usage_count + 1 })
    .eq('id', req.user.id)

  res.json({ output, usage_count: user.usage_count + 1, plan: user.plan })
})
