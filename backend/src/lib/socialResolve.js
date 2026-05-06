import { YoutubeTranscript } from 'youtube-transcript'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\n?#]+)/

/** @param {string} s */
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

/** @param {string} input */
export function getSocialLinkKind(input) {
  try {
    return getSocialLinkKindFromUrl(new URL(input.trim()))
  } catch {
    return null
  }
}

/**
 * Free tier validation: allow short pasted links (e.g. vm.tiktok.com/…)
 * @param {string} input
 */
export function passesMinGenerationInput(input) {
  const t = input.trim()
  if (t.length >= 10) return true
  if (!isProbablySingleUrl(t)) return false
  return getSocialLinkKind(t) !== null
}

async function followUrl(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    })
    return res.url || url
  } catch {
    return url
  }
}

function decodeHtmlEntities(s) {
  if (!s) return ''
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** @param {string} html */
function extractFromInstagramOembedHtml(html) {
  if (!html) return ''
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  const texts = paragraphs
    .map(m => stripTags(decodeHtmlEntities(m[1])))
    .map(t => t.trim())
    .filter(Boolean)
  if (texts.length) return texts.join('\n\n')
  return stripTags(decodeHtmlEntities(html)).slice(0, 4000)
}

async function fetchTikTokCaption(url) {
  const canonical = await followUrl(url)
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonical)}`
  const res = await fetch(oembedUrl, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`TikTok oEmbed HTTP ${res.status}`)
  const data = await res.json()
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const author = typeof data.author_name === 'string' ? data.author_name.trim() : ''
  const parts = [title, author ? `Creator: ${author}` : ''].filter(Boolean)
  return parts.join('\n\n')
}

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    'i'
  )
  let m = html.match(re)
  if (m) return decodeHtmlEntities(m[1])
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
    'i'
  )
  m = html.match(re2)
  return m ? decodeHtmlEntities(m[1]) : ''
}

/** Try to pull caption text from public Instagram HTML (best-effort). */
function extractInstagramCaptionFromHtml(html) {
  const ogDesc = metaContent(html, 'og:description')
  const ogTitle = metaContent(html, 'og:title')
  const pieces = [ogDesc, ogTitle && ogTitle !== 'Instagram' ? ogTitle : ''].filter(Boolean)

  const jsonCaptions = [
    /"edge_media_to_caption":\s*\{\s*"edges":\s*\[\s*\{\s*"node":\s*\{\s*"text":\s*"((?:[^"\\]|\\.)*)"/,
    /"caption":\s*\{\s*"text":\s*"((?:[^"\\]|\\.)*)"/,
  ]
  for (const re of jsonCaptions) {
    const m = html.match(re)
    if (m) {
      try {
        pieces.push(JSON.parse(`"${m[1]}"`))
      } catch {
        pieces.push(m[1].replace(/\\n/g, '\n'))
      }
      break
    }
  }

  const combined = pieces.join('\n\n').trim()
  return combined
}

async function fetchInstagramViaMetaOembed(pageUrl) {
  const token =
    process.env.META_APP_ACCESS_TOKEN ||
    (process.env.META_APP_ID && process.env.META_APP_SECRET
      ? `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
      : null)
  if (!token) return null

  const api = new URL('https://graph.facebook.com/v21.0/instagram_oembed')
  api.searchParams.set('url', pageUrl)
  api.searchParams.set('access_token', token)
  api.searchParams.set('omitscript', 'true')

  const res = await fetch(api.toString(), { headers: { 'User-Agent': UA } })
  if (!res.ok) {
    const errText = await res.text()
    console.warn('instagram_oembed:', res.status, errText.slice(0, 120))
    return null
  }
  const data = await res.json()
  const fromEmbed = extractFromInstagramOembedHtml(data.html)
  const author = typeof data.author_name === 'string' ? data.author_name.trim() : ''
  const bits = [fromEmbed, author ? `Creator: ${author}` : ''].filter(Boolean)
  return bits.join('\n\n').trim()
}

async function fetchInstagramCaptionFromPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!res.ok) throw new Error(`Instagram page HTTP ${res.status}`)
  const html = await res.text()
  const text = extractInstagramCaptionFromHtml(html)
  if (!text || text.length < 3) throw new Error('Could not read caption from Instagram page')
  return text
}

async function fetchInstagramCaption(pageUrl) {
  const viaMeta = await fetchInstagramViaMetaOembed(pageUrl)
  if (viaMeta && viaMeta.length > 5) return viaMeta
  return fetchInstagramCaptionFromPage(pageUrl)
}

export async function resolveGenerationInput(input) {
  const trimmed = input.trim()

  if (isProbablySingleUrl(trimmed)) {
    const kind = getSocialLinkKind(trimmed)
    if (kind === 'tiktok') {
      try {
        const text = await fetchTikTokCaption(trimmed)
        if (text.length > 5) return `[TikTok video]\n\n${text}`
      } catch (e) {
        console.warn('TikTok caption fetch:', e.message)
      }
      return input
    }
    if (kind === 'instagram') {
      try {
        const text = await fetchInstagramCaption(trimmed)
        if (text.length > 5) return `[Instagram reel/post]\n\n${text}`
      } catch (e) {
        console.warn('Instagram caption fetch:', e.message)
      }
      return input
    }
  }

  const yt = trimmed.match(YOUTUBE_REGEX)
  if (yt) {
    try {
      const videoId = yt[1]
      const transcript = await YoutubeTranscript.fetchTranscript(videoId)
      const text = transcript.map(t => t.text).join(' ')
      return `[YouTube transcript]: ${text}`
    } catch (e) {
      console.warn('YouTube transcript:', e.message)
      return input
    }
  }

  return input
}
