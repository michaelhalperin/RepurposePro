import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Bookmark } from 'lucide-react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function TikTokSavedCard({ data, createdAt, onUnsave, unsaving }) {
  const text = `${data.hook}\n\n${data.script}\n\n${data.hashtags.map(h => `#${h}`).join(' ')}`
  return (
    <article className="card tiktok-card">
      <div className="card-header">
        <div className="card-badge card-badge--tiktok">TikTok script</div>
        <div className="card-actions">
          <span className="saved-date">{relativeDate(createdAt)}</span>
          <button
            className="save-btn save-btn--saved"
            onClick={onUnsave}
            disabled={unsaving}
            title="Remove from saved"
          >
            <Bookmark size={15} strokeWidth={1.75} fill="currentColor" />
          </button>
          <CopyButton text={text} />
        </div>
      </div>
      <div className="tiktok-body">
        <div className="content-field">
          <span className="content-field-label">Hook</span>
          <p className="content-field-text content-field-text--hook">{data.hook}</p>
        </div>
        <div className="content-field">
          <span className="content-field-label">Script</span>
          <p className="content-field-text content-field-text--script">{data.script}</p>
        </div>
        <div className="content-field content-field--flush">
          <span className="content-field-label">Hashtags</span>
          <div className="card-hashtags">
            {data.hashtags.map(h => (
              <span key={h} className="hashtag">#{h}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function ThreadSavedCard({ data, createdAt, onUnsave, unsaving }) {
  const tweets = data.tweets ?? []
  const fullThread = tweets.join('\n\n---\n\n')
  const [copiedIndex, setCopiedIndex] = useState(null)

  function copySingleTweet(tweet, index) {
    navigator.clipboard.writeText(tweet).then(
      () => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      },
      () => {}
    )
  }

  return (
    <article className="card thread-card">
      <div className="card-header">
        <div className="card-badge card-badge--x">X (Twitter) thread</div>
        <div className="card-actions">
          <span className="saved-date">{relativeDate(createdAt)}</span>
          <button
            className="save-btn save-btn--saved"
            onClick={onUnsave}
            disabled={unsaving}
            title="Remove from saved"
          >
            <Bookmark size={15} strokeWidth={1.75} fill="currentColor" />
          </button>
          <CopyButton text={fullThread} />
        </div>
      </div>
      <p className="thread-meta">
        {tweets.length} posts · click a post to copy it
      </p>
      <ol className="thread-tweets" aria-label="Thread posts">
        {tweets.map((tweet, i) => (
          <li key={i}>
            <div
              role="button"
              tabIndex={0}
              className={`tweet tweet--interactive ${copiedIndex === i ? 'tweet--copied' : ''}`}
              onClick={() => copySingleTweet(tweet, i)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copySingleTweet(tweet, i) }
              }}
              aria-label={copiedIndex === i ? `Post ${i + 1} copied` : `Copy post ${i + 1}`}
            >
              <span className="tweet-num" aria-hidden="true">{i + 1}</span>
              <p className="tweet-text">{tweet}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}

function LinkedInSavedCard({ data, createdAt, onUnsave, unsaving }) {
  return (
    <article className="card linkedin-card">
      <div className="card-header">
        <div className="card-badge card-badge--linkedin">LinkedIn post</div>
        <div className="card-actions">
          <span className="saved-date">{relativeDate(createdAt)}</span>
          <button
            className="save-btn save-btn--saved"
            onClick={onUnsave}
            disabled={unsaving}
            title="Remove from saved"
          >
            <Bookmark size={15} strokeWidth={1.75} fill="currentColor" />
          </button>
          <CopyButton text={data.post} />
        </div>
      </div>
      <div className="linkedin-body">
        <p className="linkedin-text">{data.post}</p>
      </div>
    </article>
  )
}

function SavedCardSkeleton({ delay = 0 }) {
  return (
    <article className="card saved-skeleton-card" style={{ '--saved-skeleton-delay': `${delay}s` }}>
      <div className="saved-skeleton-header">
        <span className="saved-skeleton-badge" />
        <div className="saved-skeleton-actions">
          <span className="saved-skeleton-chip" />
          <span className="saved-skeleton-chip saved-skeleton-chip--sm" />
        </div>
      </div>
      <div className="saved-skeleton-body">
        <span className="saved-skeleton-line saved-skeleton-line--lg" />
        <span className="saved-skeleton-line" />
        <span className="saved-skeleton-line saved-skeleton-line--md" />
      </div>
    </article>
  )
}

export default function SavedScreen({ savedItems, onUnsaveItem }) {
  const containerRef = useRef()
  const [unsavingId, setUnsavingId] = useState(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const hero = containerRef.current?.querySelector('.saved-hero')
      if (hero) {
        gsap.from(hero, { opacity: 0, y: -12, duration: 0.4, ease: 'power2.out' })
      }
    }, containerRef)
    return () => ctx.revert()
  }, [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = containerRef.current?.querySelectorAll('.saved-card-item') ?? []
      if (!cards.length) return
      gsap.from(cards, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.07,
        delay: 0.1,
        ease: 'power3.out'
      })
    }, containerRef)
    return () => ctx.revert()
  }, [savedItems?.length])

  async function handleUnsave(id) {
    setUnsavingId(id)
    try {
      await onUnsaveItem(id)
    } finally {
      setUnsavingId(null)
    }
  }

  const isEmpty = !savedItems || savedItems.length === 0
  const isLoading = savedItems === null

  return (
    <div className="saved-screen" ref={containerRef}>
      <div className="saved-inner">
        <header className="saved-hero">
          <p className="results-eyebrow">Collection</p>
          <h1 className="results-title">Saved items</h1>
          <p className="results-sub">
            {isLoading ? 'Loading saved items…' : isEmpty ? 'Nothing saved yet' : `${savedItems.length} saved ${savedItems.length === 1 ? 'item' : 'items'}`}
          </p>
        </header>

        {isLoading && (
          <div className="saved-grid saved-grid--skeleton" aria-hidden="true">
            <SavedCardSkeleton delay={0} />
            <SavedCardSkeleton delay={0.12} />
            <SavedCardSkeleton delay={0.24} />
          </div>
        )}

        {!isLoading && isEmpty && (
          <div className="saved-empty">
            <Bookmark size={36} strokeWidth={1.25} className="saved-empty-icon" />
            <p className="saved-empty-text">Save individual TikTok scripts, threads, or LinkedIn posts from your results to find them here.</p>
          </div>
        )}

        {!isLoading && !isEmpty && (
          <div className="saved-grid">
            {savedItems.map(item => (
              <div key={item.id} className="saved-card-item">
                {item.item_type === 'tiktok' && (
                  <TikTokSavedCard
                    data={item.item_data}
                    createdAt={item.created_at}
                    onUnsave={() => handleUnsave(item.id)}
                    unsaving={unsavingId === item.id}
                  />
                )}
                {item.item_type === 'thread' && (
                  <ThreadSavedCard
                    data={item.item_data}
                    createdAt={item.created_at}
                    onUnsave={() => handleUnsave(item.id)}
                    unsaving={unsavingId === item.id}
                  />
                )}
                {item.item_type === 'linkedin' && (
                  <LinkedInSavedCard
                    data={item.item_data}
                    createdAt={item.created_at}
                    onUnsave={() => handleUnsave(item.id)}
                    unsaving={unsavingId === item.id}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
