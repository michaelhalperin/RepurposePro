import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { resolveGenerationInput } from './socialResolve.js'

// Robustly extract JSON from model output even if it adds surrounding text
function extractJSON(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response')
  return JSON.parse(text.slice(start, end + 1))
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const TONE_MAP = {
  casual: `\
WRITING VOICE — CASUAL:
Write like you're texting a smart friend who hasn't heard this yet. Contractions everywhere. Short punchy sentences. One relatable personal detail that makes it feel real, not polished.
Hook style: something a friend would actually say out loud — curiosity gap or relatable mistake.
GOOD hook: "I kept doing this every morning without realizing it was draining my focus."
BAD hook:  "Boost your morning routine with these simple tips." ← sounds like a blog post, not a person
Script: raw and direct. Ends with a question that sounds natural, not scripted. Never sounds like a productivity listicle.`,

  professional: `\
WRITING VOICE — PROFESSIONAL:
Write like a respected practitioner sharing a hard-won insight with peers. Precise, measured language. Lead with a specific result or number. Acknowledge the trade-off — that's what makes it credible.
Hook style: counterintuitive finding or specific result a peer would stop to read.
GOOD hook: "30 days without a phone in the morning doubled my output — not by adding hours, but by stopping focus bleed before 9am."
BAD hook:  "Morning productivity tips that actually work." ← vague, no specificity, no stakes
Script: one clear insight per point. Structured reasoning. No exclamation points. No hype. Sounds like someone who actually did this, not someone who read about it.`,

  educational: `\
WRITING VOICE — EDUCATIONAL:
Write to teach one thing so clearly the viewer can act on it immediately. Name the mechanism. Number the steps. Give a concrete before/after comparison or analogy.
Hook style: state the exact outcome or transformation the viewer will have after watching.
GOOD hook: "Here is the exact 3-step sequence I use to protect my first hour every day."
BAD hook:  "You need a better morning routine." ← tells them nothing, promises nothing specific
Script: every sentence moves the learner forward. Ends with one specific action they can run today — not a vague "try this".`,

  viral: `\
WRITING VOICE — VIRAL:
Write to make people stop mid-scroll, feel something strong, and hit share. This is NOT tips content. This is opinion content — a point of view that makes people react.
MANDATORY: every hook must be a bold reversal or a specific uncomfortable truth. The reader should feel like they're about to hear something that reframes how they think.
GOOD hook: "Your morning routine is the problem — not your discipline."
GOOD hook: "I stopped trying to be productive before 10am and my output doubled."
BAD hook:  "Checking your phone first thing wrecks your day." ← too mild, everyone already knows this, zero tension
BAD hook:  "Want double the productivity? Skip your morning scroll." ← question hook, sounds like 2018 Facebook content
BAD hook:  "Morning routines: productive vs. distracted." ← that's a title, not a hook
Script rules (enforce hard):
- One bold take. One specific surprising detail from the source. One thing they can do TODAY.
- No tips-list. Not "here are 3 ways." One idea, hit hard.
- BANNED phrases — if any appear, rewrite the sentence entirely: "watch your X climb", "trust me", "follow for more", "your productivity will soar", "skyrocket", "game changer", "simple change", "simple habit", "one small tweak"
- CTA must be emotionally specific, not generic: e.g. "drop a 🔥 if this hit" / "share this with whoever still checks their phone first thing" / "tell me what your first hour actually looks like"
LinkedIn for viral: keep the strong POV but write it as a practitioner observation — bold provocative first line, specific detail from source, genuine question at the end. NOT "let's discuss." A real question that makes people think.`,
}

const SYSTEM_PROMPT = `\
You are a top-tier social media content writer — you've helped creators go viral by writing content that feels specific, real, and impossible to scroll past.

ABSOLUTE OUTPUT RULES:
- You may write a brief planning section before the JSON (angles, hook drafts). After it, output ONLY the valid JSON object. No markdown fences around the JSON.
- Never include visible scaffolding inside the content: no "Try this structure:", "Here's the plan:", "Use this approach:", or any meta-label a viewer would see.
- Never copy the same sentence, phrase, or disclaimer into more than one script.
- Never invent specific facts, prices, or statistics not present in the source.
- Write as a real human creator talking to camera — not a consultant describing what to write.

FILLER PHRASES TO DELETE — if any of these appear in your draft, cut or rewrite the sentence before outputting:
"makes all the difference", "it's all about", "think wisely", "spend smarter", "you won't be disappointed",
"truly unique experience", "a well-thought-out", "maximizing what X offers", "takes it to the next level",
"at the end of the day", "in today's world", "without further ado",
"watch your X climb", "trust me", "follow for more insights", "your productivity will soar",
"game changer", "simple change", "simple habit", "one small tweak", "skyrocket", "let's discuss and share"`

const USER_PROMPT = (content, tone = 'casual') => `\
${TONE_MAP[tone] ?? TONE_MAP.casual}

━━━ YOUR TASK ━━━
Repurpose the following source content into platform-native posts. Apply the writing voice above to every word — hooks, scripts, thread tweets, and LinkedIn. The voice must be unmistakably different from the default.

SOURCE CONTENT:
${content}

━━━ STEP 1 — PLAN (write this before the JSON) ━━━

In 5 lines, list the angle you will use for each TikTok script and draft its hook.
Format: "Script N — [angle]: [hook draft]"
Use this to catch generic hooks before you commit to them.

━━━ STEP 2 — OUTPUT ━━━

Return a JSON object with this exact shape:

{
  "tiktoks": [
    {
      "hook": "string",
      "script": "string",
      "hashtags": ["string", "string", "string", "string", "string"]
    }
  ],
  "thread": ["string", "string", "string", "string", "string", "string"],
  "linkedin": "string"
}

━━━ TIKTOK RULES (exactly 5) ━━━

HOOK — one sentence, under 10 words. Use one of these proven formulas:
  • Specific loss/mistake:  "3 Eilat mistakes that wasted my first morning"
  • Bold reversal:          "Eilat is cheaper than Tel Aviv — if you know where to eat"
  • Curiosity gap:          "The free Eilat beach that beats the paid one"
  • Contrast:               "Skip the North Beach day one — do this instead"
  • Stakes:                 "Book Coral Beach last and you'll regret it"

HOOK QUALITY TEST — before locking in each hook, mentally replace the main topic with a different destination. If the hook still works unchanged, it is too generic. Rewrite it with a detail that only fits this specific content.

BAD:  "Top itinerary tips for Eilat success"      ← works for any city, says nothing specific
BAD:  "Must-see hidden gems in Eilat"             ← pure label, zero tension
GOOD: "I'd skip North Beach on day one — here's what I'd do instead"
GOOD: "Eilat has a free snorkeling spot better than the paid one"

SCRIPT — 100–130 words, spoken directly to camera:
- Open with the payoff — the specific thing people get wrong or don't know
- 2–3 concrete details from the source (real place names, comparisons, or practical steps)
- Natural short lines — rhythm over bullet structure
- One CTA at the end — rotate across the 5 scripts using different formats: ask a direct question / give a specific challenge / request a reaction / invite a comparison / make a bold statement that needs no response
- BANNED CTA formats: "Save this if you're [X]", "Share if you've ever [felt/done X]", "Comment if you know what I mean", "Like if this resonates" — these are Facebook engagement-bait from 2019, not real CTAs
- Each script uses a distinct angle: mistakes · budget · itinerary · ranking · myth-busting · hidden gems · before-after · comparison

SCRIPT QUALITY TEST — before finalizing, cut any sentence where you could swap the topic for any other topic and the sentence still works. Every line should be specific to this content.

BAD:  "A well-thought-out schedule makes all the difference."
BAD:  "Think wisely, spend smarter, and see it all."
GOOD: "Most people blow their morning on the hotel pool when Coral Beach is 10 minutes south."

HASHTAGS — 5 niche-relevant tags, no # prefix, no spaces, no generic spam (fyp/viral/trending)

━━━ X/TWITTER THREAD (5–7 tweets) ━━━

The thread must carry the same writing voice set at the top. A thread is NOT a listicle — it is one perspective that unfolds one punch at a time.

TWEET 1 — the hook tweet. One specific, concrete claim that gives a real reason to keep reading. Should feel like the first line of a story, not the topic sentence of an essay.
GOOD: "I stopped checking my phone before 9am for 30 days. My output doubled without adding a single work hour. Here's what actually changed 🧵"
BAD:  "Mornings dictate your productivity, yet most of us start them the wrong way." ← vague observation, no specifics, no stakes, could apply to anything

TWEETS 2 to N-1 — number each one (1/, 2/, …). Each tweet must:
- Contain exactly one specific insight or detail from the source — no vague filler
- Be self-contained: readable without needing the tweet before it
- BANNED in any tweet: "changes the game", "it's staggering", "you'll be amazed", "game-changing", "soared", "skyrocketed", "level up", "let that sink in"
- Under 280 characters. 1 emoji max per tweet, only where it adds meaning not decoration

LAST TWEET — a direct question that forces the reader to reflect on their own situation. Not rhetorical. Not a generic CTA.
GOOD: "What does your first hour actually look like right now?"
BAD:  "How often is your phone the first thing you reach for? 🛎️" ← emoji softens it, question is rhetorical, not genuine

━━━ LINKEDIN ━━━

Apply the writing voice from the top of this prompt. Do not default to corporate-professional regardless of the tone selected.

Structure (150–200 words):
- Line 1: a single sharp sentence drawn directly from the source — bold enough to stop scrolling
- Body: 2–3 short paragraphs. Each one specific insight or detail from the source. No vague summaries.
- Close: one genuine question that makes the reader think about their own situation. Not "let's discuss." Not "share your thoughts below." A real question with a specific answer.

BANNED anywhere in the LinkedIn post: "noticeable boost", "let's discuss", "share your thoughts", "I never expected", "it goes without saying", "in today's fast-paced world", "it made all the difference"`

// ─── Output normalization ─────────────────────────────────────────────────────
// Only validates structure and cleans whitespace — no content injection.

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.replace(/\s+/g, ' ').trim() || fallback
}

function cleanHashtag(tag) {
  if (typeof tag !== 'string') return null
  const cleaned = tag
    .replace(/^#+/, '')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase()
    .trim()
  return cleaned || null
}

function normalizeHashtags(hashtags, fallback) {
  const source = Array.isArray(hashtags) ? hashtags : []
  const unique = []
  for (const tag of source) {
    const cleaned = cleanHashtag(tag)
    if (!cleaned) continue
    if (!unique.includes(cleaned)) unique.push(cleaned)
    if (unique.length >= 5) break
  }
  if (unique.length === 5) return unique
  for (const tag of fallback) {
    if (!unique.includes(tag)) unique.push(tag)
    if (unique.length >= 5) break
  }
  return unique.slice(0, 5)
}

function normalizeOutput(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {}
  const rawTikToks = Array.isArray(safe.tiktoks) ? safe.tiktoks : []

  const fallbackHashtagSets = [
    ['contenttips', 'creators', 'execution', 'growthstrategy', 'socialmedia'],
    ['marketingtips', 'contentcreator', 'audiencebuilding', 'copywriting', 'growth'],
    ['hottake', 'systems', 'performance', 'results', 'selfimprovement'],
    ['ideas', 'strategy', 'creatorbusiness', 'productivity', 'learnontiktok'],
    ['playbook', 'digitalmarketing', 'framework', 'businesstips', 'contentmarketing'],
  ]

  const tiktoks = rawTikToks.slice(0, 5).map((item, i) => ({
    hook: cleanText(item?.hook, 'The detail most people miss'),
    script: cleanText(item?.script, 'Check the source for the full breakdown.'),
    hashtags: normalizeHashtags(item?.hashtags, fallbackHashtagSets[i] ?? fallbackHashtagSets[0]),
  }))

  // Pad if model returned fewer than 5 (shouldn't happen with a good prompt, but be safe)
  while (tiktoks.length < 5) {
    tiktoks.push({
      hook: 'One thing worth knowing before you go',
      script: 'This one detail changes how most people approach the topic. Check the full breakdown in the source.',
      hashtags: normalizeHashtags([], fallbackHashtagSets[tiktoks.length] ?? fallbackHashtagSets[0]),
    })
  }

  // Thread — normalize numbering, ensure 5–7 tweets
  const rawThread = Array.isArray(safe.thread) ? safe.thread : []
  const fallbackThread = [
    'Most people get this wrong — here\'s the practical breakdown 🧵',
    '1/ The common trap: optimizing the wrong thing first.',
    '2/ A better sequence: clarify the outcome before the tactic.',
    '3/ Then simplify execution so the process is repeatable.',
    '4/ Review one metric weekly and improve one variable at a time.',
    '5/ Start with a 24-hour action you can finish today.',
    'If this helped, share it with someone who needs it.',
  ]

  const sourceThread = rawThread.length >= 5 ? rawThread : fallbackThread
  const thread = sourceThread.slice(0, 7).map((tweet, i) => cleanText(tweet, fallbackThread[i] ?? ''))

  while (thread.length < 5) thread.push(fallbackThread[thread.length] ?? '')

  // LinkedIn — clean text, no injection
  const linkedin = cleanText(
    safe.linkedin,
    'Planning quality matters more than destination hype. Define your priorities, sequence your time around constraints, and verify practical details before committing. What is the one thing you always check before booking a trip?'
  )

  return { tiktoks, thread, linkedin }
}

// ─── Provider logic ───────────────────────────────────────────────────────────

function normalizeProvider() {
  const raw = (process.env.AI_PROVIDER || 'anthropic').toLowerCase().trim()
  if (raw === 'openai') return 'openai'
  return 'anthropic'
}

function hasApiKeyForProvider(provider) {
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim())
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

async function generateWithAnthropic(userContent, isRetry = false) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

  const system = isRetry
    ? `${SYSTEM_PROMPT}\n\nThis is a quality retry. Previous output had repeated phrases, weak scripts, or template leakage. Produce substantially improved, varied content.`
    : SYSTEM_PROMPT

  const message = await client.messages.create({
    model,
    max_tokens: 6000,
    system,
    messages: [{ role: 'user', content: userContent }]
  })
  return extractJSON(message.content[0].text)
}

async function generateWithOpenAI(userContent, isRetry = false) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_MODEL || 'gpt-4o'

  const systemContent = isRetry
    ? `${SYSTEM_PROMPT}\n\nThis is a quality retry. Previous output had repeated phrases, weak scripts, or template leakage. Produce substantially improved, varied content.`
    : SYSTEM_PROMPT

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent }
    ],
    max_tokens: 4096
  })
  const text = completion.choices[0]?.message?.content
  if (!text) throw new Error('Empty response from OpenAI')
  return extractJSON(text)
}

function hasQualityIssues(normalized, tone = 'casual') {
  const tiktoks = normalized?.tiktoks ?? []
  if (tiktoks.length !== 5) return true

  // Structural leakage — visible scaffolding in content
  const leakagePatterns = [
    /try this structure:/i,
    /here('?s| is) the plan:/i,
    /use this approach:/i,
    /practical route:/i,
    /skip the guesswork:/i,
    /better game plan:/i,
  ]

  // Filler phrases that should have been cut
  const fillerPatterns = [
    /makes all the difference/i,
    /it'?s all about/i,
    /think wisely/i,
    /spend smarter/i,
    /a well-thought-out/i,
    /maximizing what .{0,20} offers/i,
    /takes it to the next level/i,
    /truly unique experience/i,
  ]

  for (const item of tiktoks) {
    const combined = `${item.hook ?? ''} ${item.script ?? ''}`
    if (leakagePatterns.some(p => p.test(combined))) return true
    if (fillerPatterns.some(p => p.test(combined))) return true
    if ((item.script?.split(/\s+/) ?? []).length < 60) return true  // too short
  }

  // Same sentence pasted across multiple scripts
  const sentences = tiktoks.flatMap(t =>
    (t.script ?? '').split(/[.!?]\s+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 30)
  )
  const seen = new Set()
  for (const s of sentences) {
    if (seen.has(s)) return true
    seen.add(s)
  }

  // Generic hooks that pass the "swap topic" test (topic-agnostic)
  const genericHookPatterns = [
    /^top \w+ tips for .{1,30} success$/i,
    /^must-see .{1,30} in .{1,30}$/i,
    /^amazing .{1,30} you need to know/i,
    /^the ultimate .{1,30} guide$/i,
    /^everything you need to know about/i,
    /^[\w\s]+ routines?:\s/i,                  // "Morning routines: productive vs. distracted"
    /^you (lose|gain|get|boost) .{0,25} with /i, // "You lose focus with..."
    /^want .{0,50}\?/i,                          // any question-hook starting with "Want"
  ]
  const genericHookCount = tiktoks.filter(t =>
    genericHookPatterns.some(p => p.test((t.hook ?? '').trim()))
  ).length
  if (genericHookCount >= 2) return true

  // Viral-specific: catch tips-energy language that slips past generic checks
  if (tone === 'viral') {
    const viralWeakPatterns = [
      /trust me/i,
      /follow for more/i,
      /(climb|soar|skyrocket)ed?\b/i,
      /your (productivity|output|results) will/i,
      /game.?chang(er|ing)/i,
      /simple (change|habit|tweak|trick)/i,
      /did you know/i,
      /skyrocket/i,
      /(save|share|comment|like) (this )?if you('ve| have)? (ever )?(felt|done|been|tried|know|experienced)/i,
    ]
    for (const item of tiktoks) {
      const combined = `${item.hook ?? ''} ${item.script ?? ''}`
      if (viralWeakPatterns.some(p => p.test(combined))) return true
    }
  }

  return false
}

export async function generateContent(input, tone = 'casual') {
  const provider = normalizeProvider()
  const USE_MOCK = !hasApiKeyForProvider(provider)
  const enableRetry = process.env.AI_RETRY_ON_LOW_QUALITY !== 'false' // on by default

  if (USE_MOCK) return normalizeOutput(getMockOutput(input))

  const resolvedInput = await resolveGenerationInput(input)
  const userPrompt = USER_PROMPT(resolvedInput, tone)

  const generated = provider === 'openai'
    ? await generateWithOpenAI(userPrompt)
    : await generateWithAnthropic(userPrompt)

  const normalized = normalizeOutput(generated)

  if (enableRetry && hasQualityIssues(normalized, tone)) {
    const retried = provider === 'openai'
      ? await generateWithOpenAI(userPrompt, true)
      : await generateWithAnthropic(userPrompt, true)
    return normalizeOutput(retried)
  }

  return normalized
}

// ─── Mock output (dev fallback when no API key is set) ────────────────────────

function getSentences(input) {
  return input
    .split(/[.!?\n]+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 20)
    .filter(s => !/^https?:\/\/\S+$/i.test(s))
    .filter(s => !/^(www\.)?\S+\.\S+$/i.test(s))
    .filter(s => (s.match(/[a-z]/gi) ?? []).length >= 12)
}

function pick(sentences, idx, fallback) {
  return sentences[idx] ?? fallback
}

function getMockOutput(input) {
  const sentences = getSentences(input)
  const sourceText = input.replace(/\s+/g, ' ').trim()
  const safeDefault = sourceText.slice(0, 160) || 'your source topic'

  const topic  = pick(sentences, 0, `The core idea here is: ${safeDefault}`)
  const point1 = pick(sentences, 1, 'Most people stay at the awareness level and never apply this in a real workflow.')
  const point2 = pick(sentences, 2, 'Progress compounds when you build a repeatable system instead of relying on motivation.')
  const point3 = pick(sentences, 3, 'Tracking one leading metric weekly gives you real feedback to improve.')
  const point4 = pick(sentences, 4, 'Starting with a small implementation you can finish in 24 hours beats endless planning.')

  return {
    tiktoks: [
      {
        hook: 'Most people skip this and wonder why they stall.',
        script: `${topic}\n\nThe fix isn't working harder — it's sequencing correctly.\n\nDefine your outcome first. Build one repeatable process. Review what moved the needle each week.\n\n${point1}\n\nSave this and run it for 7 days.`,
        hashtags: ['creators', 'contentstrategy', 'workflow', 'productivitytips', 'learnontiktok']
      },
      {
        hook: 'Effort without structure will always underperform.',
        script: `${point1}\n\nThe upgrade is simpler than people expect: one channel, one audience pain, one focused message per day.\n\n${point2}\n\nTry it: create a before/after example for one specific problem and post it this week. Compare engagement in 7 days.`,
        hashtags: ['growthtips', 'contentcreator', 'audiencebuilding', 'digitalmarketing', 'businesstips']
      },
      {
        hook: 'Consistency beats intensity — here\'s the data.',
        script: `${topic}\n\nBoring and reliable outperforms sporadic and intense every single time.\n\nReduce decisions with templates. Track one quality metric. Improve one variable per week.\n\n${point3}\n\nWhat would change for you if your process was predictable? Drop it in the comments.`,
        hashtags: ['hottake', 'systems', 'creatorbusiness', 'habits', 'results']
      },
      {
        hook: '3 ideas that move the needle fast.',
        script: `Idea one: start smaller than you think you should.\n${point4}\n\nIdea two: optimize for clarity before you scale volume.\n${point2}\n\nIdea three: review your misses, not just your wins.\n${point3}\n\nWhich one are you applying this week?`,
        hashtags: ['ideas', 'contenttips', 'execution', 'selfimprovement', 'learnontiktok']
      },
      {
        hook: '60-second framework that actually holds up.',
        script: `Step one: clarify the outcome in one sentence.\n${point1}\n\nStep two: build the repeatable weekly process.\n${point2}\n\nStep three: pick one metric and one experiment per cycle.\n${point3}\n\nRun this for 30 days, then reassess what changed.`,
        hashtags: ['productivity', 'playbook', 'growthstrategy', 'contentmarketing', 'learnontiktok']
      }
    ],
    thread: [
      `Results come from systems, not bursts of effort. Here's the practical breakdown 🧵`,
      `1/ The common trap: chasing tactics before clarifying the outcome. ${topic}`,
      `2/ A better sequence: outcome → process → metric. ${point1}`,
      `3/ Simplify execution: fewer moving parts, clearer message, consistent cadence. ${point2}`,
      `4/ The compounding step: review weekly and improve one variable at a time. ${point3}`,
      `5/ Fast start: pick one 24-hour action and ship it today. ${point4}`,
      `What's the one thing holding your process back right now?`
    ],
    linkedin: `${topic}\n\nA pattern I keep seeing: teams optimize activity when they should be optimizing outcomes.\n\n${point1}\n\nWhat works better in practice: define one measurable outcome per cycle, standardize the process before scaling volume, and use weekly review to improve one lever at a time.\n\n${point2}\n\nThis is where compounding starts: ${point3}\n\nIf you had to improve one part of your current process this week — what would you change first?`
  }
}
