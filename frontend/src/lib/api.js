import { supabase } from './supabase'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`
  }
}

export async function generate(input, tone = 'casual') {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ input, tone })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Generation failed')
  return data
}

export async function getUsage() {
  const res = await fetch('/api/usage', { headers: await authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch usage')
  return data
}

export async function getHistory() {
  const res = await fetch('/api/history', { headers: await authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch history')
  return data // array of { id, input_text, output_json, created_at }
}

export async function deleteGeneration(id) {
  const res = await fetch(`/api/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders()
  })
  if (res.status === 204) return
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to delete generation')
}

export async function deleteAccount() {
  const res = await fetch('/api/account', {
    method: 'DELETE',
    headers: await authHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete account')
  return data
}

export async function getSaved() {
  const res = await fetch('/api/saved', { headers: await authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch saved items')
  return data
}

export async function saveItem(item_type, item_data) {
  const res = await fetch('/api/saved', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ item_type, item_data })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to save item')
  return data // { id }
}

export async function unsaveItem(id) {
  const res = await fetch(`/api/saved/${id}`, {
    method: 'DELETE',
    headers: await authHeaders()
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to unsave item')
  }
}

export async function createCheckout() {
  const res = await fetch('/api/paddle/checkout', {
    method: 'POST',
    headers: await authHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create checkout')
  return data
}

export async function cancelSubscription() {
  const res = await fetch('/api/paddle/subscription/cancel', {
    method: 'POST',
    headers: await authHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription')
  return data
}
