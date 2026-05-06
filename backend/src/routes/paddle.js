import { Router } from 'express'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

export const router = Router()

const PADDLE_API_URL = process.env.PADDLE_ENV === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

function paddleHeaders() {
  return {
    Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
    'Content-Type': 'application/json'
  }
}

async function paddleRequest(path, options = {}) {
  const response = await fetch(`${PADDLE_API_URL}${path}`, {
    ...options,
    headers: {
      ...paddleHeaders(),
      ...(options.headers ?? {})
    }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error?.detail || data?.error?.message || 'Paddle API request failed'
    throw new Error(message)
  }
  return data
}

function isCancelScheduled(subscription) {
  return subscription?.scheduled_change?.action === 'cancel'
}

function scheduledCancelAt(subscription) {
  return (
    subscription?.scheduled_change?.effective_at ||
    subscription?.scheduled_change?.effective_from ||
    null
  )
}

// POST /paddle/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  if (!process.env.PADDLE_API_KEY || !process.env.PADDLE_PRICE_ID) {
    return res.status(503).json({ error: 'Payments not configured' })
  }

  const successUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}?paddle_success=1`

  try {
    const response = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: 'POST',
      headers: paddleHeaders(),
      body: JSON.stringify({
        items: [{ price_id: process.env.PADDLE_PRICE_ID, quantity: 1 }],
        customer: { email: req.user.email },
        custom_data: { user_id: req.user.id },
        checkout: { url: successUrl }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Paddle API error:', data)
      return res.status(502).json({ error: 'Failed to create checkout' })
    }

    const checkoutUrl = data.data?.checkout?.url
    if (!checkoutUrl) return res.status(502).json({ error: 'No checkout URL returned' })

    res.json({ url: checkoutUrl })
  } catch (err) {
    console.error('Paddle checkout error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /paddle/subscription/cancel
router.post('/subscription/cancel', requireAuth, async (req, res) => {
  if (!process.env.PADDLE_API_KEY) {
    return res.status(503).json({ error: 'Payments not configured' })
  }

  try {
    const encodedEmail = encodeURIComponent(req.user.email)
    const customers = await paddleRequest(`/customers?email=${encodedEmail}&per_page=50`)
    const customer = customers?.data?.find((item) => item?.email?.toLowerCase() === req.user.email?.toLowerCase())

    if (!customer?.id) {
      return res.status(404).json({ error: 'No billing customer found for this account' })
    }

    const subscriptions = await paddleRequest(
      `/subscriptions?customer_id=${encodeURIComponent(customer.id)}&status=active,trialing,past_due&per_page=200`
    )

    const subscription = subscriptions?.data?.find((item) => item?.status !== 'canceled')
    if (!subscription?.id) {
      return res.status(404).json({ error: 'No active subscription found' })
    }

    if (isCancelScheduled(subscription)) {
      return res.json({
        success: true,
        subscription_id: subscription.id,
        already_scheduled: true,
        cancel_effective_at: scheduledCancelAt(subscription)
      })
    }

    await paddleRequest(`/subscriptions/${subscription.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ effective_from: 'next_billing_period' })
    })

    const refreshed = await paddleRequest(`/subscriptions/${subscription.id}`)
    const refreshedSubscription = refreshed?.data ?? null

    return res.json({
      success: true,
      subscription_id: subscription.id,
      already_scheduled: isCancelScheduled(refreshedSubscription),
      cancel_effective_at: scheduledCancelAt(refreshedSubscription)
    })
  } catch (err) {
    console.error('Paddle cancel subscription error:', err)
    return res.status(500).json({ error: err.message || 'Failed to cancel subscription' })
  }
})

// GET /paddle/subscription/status
router.get('/subscription/status', requireAuth, async (req, res) => {
  if (!process.env.PADDLE_API_KEY) {
    return res.status(503).json({ error: 'Payments not configured' })
  }

  try {
    const encodedEmail = encodeURIComponent(req.user.email)
    const customers = await paddleRequest(`/customers?email=${encodedEmail}&per_page=50`)
    const customer = customers?.data?.find((item) => item?.email?.toLowerCase() === req.user.email?.toLowerCase())

    if (!customer?.id) {
      return res.json({
        has_active_subscription: false,
        is_cancel_scheduled: false,
        cancel_effective_at: null,
        status: null
      })
    }

    const subscriptions = await paddleRequest(
      `/subscriptions?customer_id=${encodeURIComponent(customer.id)}&status=active,trialing,past_due&per_page=200`
    )

    const subscription = subscriptions?.data?.find((item) => item?.status !== 'canceled')

    if (!subscription?.id) {
      return res.json({
        has_active_subscription: false,
        is_cancel_scheduled: false,
        cancel_effective_at: null,
        status: null
      })
    }

    return res.json({
      has_active_subscription: true,
      is_cancel_scheduled: isCancelScheduled(subscription),
      cancel_effective_at: scheduledCancelAt(subscription),
      status: subscription.status ?? null
    })
  } catch (err) {
    console.error('Paddle subscription status error:', err)
    return res.status(500).json({ error: err.message || 'Failed to load subscription status' })
  }
})

// POST /paddle/webhook
router.post('/webhook', async (req, res) => {
  const signature = req.headers['paddle-signature']
  const secret = process.env.PADDLE_WEBHOOK_SECRET

  if (secret) {
    if (!signature) return res.status(400).json({ error: 'Missing signature' })

    const [tsPart, h1Part] = signature.split(';')
    const ts = tsPart?.replace('ts=', '')
    const h1 = h1Part?.replace('h1=', '')

    const signed = crypto
      .createHmac('sha256', secret)
      .update(`${ts}:${req.body.toString()}`)
      .digest('hex')

    if (signed !== h1) return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(req.body.toString())
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { event_type, data } = event

  if (
    event_type === 'subscription.activated' ||
    event_type === 'subscription.updated'
  ) {
    const status = data?.status
    if (status !== 'active') {
      return res.json({ received: true })
    }

    const userId = await resolveUserId(data)
    if (userId) {
      await supabase.from('users').update({ plan: 'pro' }).eq('id', userId)
    } else {
      console.warn('Paddle webhook: could not resolve user_id for event', event_type)
    }
  }

  if (event_type === 'subscription.canceled' || event_type === 'subscription.paused') {
    const userId = await resolveUserId(data)
    if (userId) {
      await supabase.from('users').update({ plan: 'free' }).eq('id', userId)
    }
  }

  res.json({ received: true })
})

// Resolve user_id from webhook payload with multiple fallbacks
async function resolveUserId(data) {
  // 1. custom_data on the subscription object
  const fromCustomData = data?.custom_data?.user_id
  if (fromCustomData) return fromCustomData

  // 2. custom_data on the originating transaction (Paddle sometimes nests this)
  const fromTransaction = data?.transaction?.custom_data?.user_id
  if (fromTransaction) return fromTransaction

  // 3. Fallback: look up by customer email
  const email = data?.customer?.email ?? data?.billing_details?.email
  if (!email) return null

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  return user?.id ?? null
}
