/** Mirrors backend `socialResolve.js` for UI hints and minimum-length rules. */

function isProbablySingleUrl(s) {
  if (!/^https?:\/\//i.test(s)) return false
  if (/[\s\n]/.test(s)) return false
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

/** @param {URL} u */
export function getSocialLinkKindFromUrl(u) {
  const host = u.hostname.toLowerCase()
  const h = host.startsWith('www.') ? host.slice(4) : host

  if (h === 'youtu.be' || h === 'youtube.com' || h.endsWith('.youtube.com')) {
    if (h === 'youtu.be') return 'youtube'
    const p = u.pathname
    if (p.startsWith('/watch') || p.startsWith('/shorts/') || p.startsWith('/embed/') || p.startsWith('/live/'))
      return 'youtube'
    return null
  }

  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return 'tiktok'

  if (h === 'instagram.com' || h.endsWith('.instagram.com')) {
    const seg = u.pathname.split('/').filter(Boolean)[0]
    if (['reel', 'reels', 'p', 'tv'].includes(seg)) return 'instagram'
  }

  return null
}

export function getSocialLinkKind(input) {
  try {
    return getSocialLinkKindFromUrl(new URL(input.trim()))
  } catch {
    return null
  }
}

export function passesMinGenerationInput(input) {
  const t = input.trim()
  if (t.length >= 10) return true
  if (!isProbablySingleUrl(t)) return false
  return getSocialLinkKind(t) !== null
}
