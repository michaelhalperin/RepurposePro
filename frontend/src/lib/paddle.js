import { initializePaddle } from '@paddle/paddle-js'

let paddlePromise = null

export function initPaddle() {
  if (paddlePromise) return paddlePromise

  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
  if (!token) {
    paddlePromise = Promise.resolve(null)
    return paddlePromise
  }

  paddlePromise = initializePaddle({
    environment: 'sandbox',
    token
  }).catch((err) => {
    console.error('Failed to initialize Paddle.js', err)
    return null
  })

  return paddlePromise
}

export async function openPaddleCheckout({ email, userId } = {}) {
  const paddle = await initPaddle()
  if (!paddle) {
    throw new Error('Paddle is not initialized. Check VITE_PADDLE_CLIENT_TOKEN.')
  }

  const priceId = import.meta.env.VITE_PADDLE_PRICE_ID
  if (!priceId) {
    throw new Error('Missing VITE_PADDLE_PRICE_ID in frontend/.env')
  }

  const options = {
    items: [{ priceId, quantity: 1 }],
    settings: {
      displayMode: 'overlay',
      successUrl: `${window.location.origin}${window.location.pathname}?paddle_success=1`
    }
  }

  if (email) {
    options.customer = { email }
  }

  if (userId) {
    options.customData = { user_id: userId }
  }

  paddle.Checkout.open(options)
}
