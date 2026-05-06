import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { getSocialLinkKind, passesMinGenerationInput } from '../lib/sourceUrls.js'

const TONES = ['casual', 'professional', 'educational', 'viral']
const DEFAULT_TONE = 'casual'

export default function InputScreen({ onGenerate, usage, onUpgrade, authLoading, user, onSignIn }) {
  const [input, setInput] = useState('')
  const [tone, setTone] = useState(DEFAULT_TONE)
  const containerRef = useRef()

  const trimmed = input.trim()
  const linkKind = /^https?:\/\//i.test(trimmed) && !/[\s\n]/.test(trimmed) ? getSocialLinkKind(trimmed) : null

  const isLimitReached = usage && usage.plan === 'free' && usage.usage_count >= 5
  const hasProTones = usage?.plan === 'pro'
  const canGenerate = passesMinGenerationInput(input) && !isLimitReached && user

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const animateIfPresent = (selector, vars) => {
        const el = containerRef.current?.querySelector(selector)
        if (el) gsap.from(el, vars)
      }

      animateIfPresent('.input-hero-title', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' })
      animateIfPresent('.input-hero-sub', { y: 16, opacity: 0, duration: 0.6, delay: 0.1, ease: 'power3.out' })
      animateIfPresent('.input-box-wrap', { y: 20, opacity: 0, duration: 0.6, delay: 0.2, ease: 'power3.out' })
      animateIfPresent('.example-preview', { y: 20, opacity: 0, duration: 0.6, delay: 0.35, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!hasProTones && tone !== DEFAULT_TONE) {
      setTone(DEFAULT_TONE)
    }
  }, [hasProTones, tone])

  function handleSubmit(e) {
    e.preventDefault()
    if (!canGenerate) return
    onGenerate(input.trim(), tone)
  }

  return (
    <div className="input-screen" ref={containerRef}>
      <div className="input-inner">
        <h1 className="input-hero-title">
          One piece of content.<br />
          <span className="accent">Infinite reach.</span>
        </h1>
        <p className="input-hero-sub">
          Paste text, or a link to YouTube, TikTok, or an Instagram reel — get 5 TikTok scripts,
          a Twitter thread, and a LinkedIn post instantly.
        </p>

        <form className="input-box-wrap" onSubmit={handleSubmit}>
          <textarea
            className="input-textarea"
            placeholder="Paste your content or a YouTube / TikTok / Instagram reel link…"
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={5}
            disabled={!user || authLoading}
          />

          {linkKind === 'youtube' && (
            <div className="link-detected link-detected--youtube">
              <span className="link-detected-icon">▶</span>
              YouTube detected — transcript will be extracted automatically
            </div>
          )}
          {linkKind === 'tiktok' && (
            <div className="link-detected link-detected--tiktok">
              <span className="link-detected-icon">♪</span>
              TikTok detected — caption will be fetched for repurposing
            </div>
          )}
          {linkKind === 'instagram' && (
            <div className="link-detected link-detected--instagram">
              <span className="link-detected-icon">◎</span>
              Instagram reel / post detected — caption will be fetched on generate
            </div>
          )}

          <div className="tone-selector">
            <span className="tone-label">Tone</span>
            {TONES.map(t => {
              const isLocked = !hasProTones && t !== DEFAULT_TONE
              return (
                <button
                  key={t}
                  type="button"
                  className={`tone-pill ${tone === t ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (isLocked) {
                      onUpgrade()
                      return
                    }
                    setTone(t)
                  }}
                  disabled={!user || authLoading}
                  title={isLocked ? 'Pro only tone' : undefined}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}{isLocked ? ' 🔒' : ''}
                </button>
              )
            })}
          </div>

          <div className="input-actions">
            {!user ? (
              <button type="button" className="btn-primary" onClick={onSignIn} disabled={authLoading}>
                {authLoading ? 'Loading…' : 'Sign in with Google to start'}
              </button>
            ) : isLimitReached ? (
              <button type="button" className="btn-upgrade" onClick={onUpgrade}>
                Upgrade to Pro — Unlock unlimited generations
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={input.trim().length < 10}>
                Generate →
              </button>
            )}
          </div>
        </form>

        {user && usage && (
          <div className="usage-bar">
            {usage.plan === 'pro' ? (
              <span className="badge-pro">Pro — Unlimited</span>
            ) : (
              <>
                <span className="usage-text">{usage.usage_count} / 5 free generations used</span>
                {usage.usage_count > 0 && (
                  <button className="link-btn" onClick={onUpgrade}>Upgrade for unlimited</button>
                )}
              </>
            )}
          </div>
        )}
        {user && usage && usage.plan === 'free' && usage.usage_count === 4 && (
          <p className="usage-last-warning">
            Last free generation — <button className="link-btn usage-last-warning-btn" onClick={onUpgrade}>upgrade before you run out</button>
          </p>
        )}

        {!user && !authLoading && (
          <div className="example-preview">
            <div className="example-preview-label">Example output</div>
            <div className="example-cards">
              <div className="example-card">
                <div className="example-card-badge">TikTok · Idea 1</div>
                <div className="example-field-label">Hook</div>
                <div className="example-hook">Most creators post daily and stay stuck at 200 followers.</div>
                <div className="example-field-label">Script</div>
                <div className="example-body">
                  The problem isn&apos;t frequency — it&apos;s that every post looks identical. Same hook style, same format, zero variation.
                  {'\n\n'}
                  Creators growing fast pick one new angle per week and test it against their baseline. That&apos;s not strategy, that&apos;s iteration.
                  {'\n\n'}
                  Save this and try a completely different hook style tomorrow.
                </div>
              </div>
              <div className="example-card">
                <div className="example-card-badge example-card-badge--linkedin">LinkedIn post</div>
                <div className="example-body">
                  Most content advice focuses on quantity. Post every day. Be consistent. Show up.
                  {'\n\n'}
                  But I&apos;ve watched creators post daily for a year and gain nothing — while others post twice a week and grow fast.
                  {'\n\n'}
                  The difference isn&apos;t volume. It&apos;s specificity. Every post that grows an account answers a question the audience didn&apos;t know they had.
                  {'\n\n'}
                  What&apos;s one piece of content that surprised you with how well it performed?
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
