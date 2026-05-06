import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function truncate(text, max = 62) {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

const SKELETON_TITLE_WIDTHS = ['92%', '78%', '88%', '65%', '95%', '72%']

function HistorySkeleton() {
  return (
    <ul
      className="history-list history-skeleton-list"
      aria-busy="true"
      aria-label="Loading recent generations"
    >
      {SKELETON_TITLE_WIDTHS.map((width, i) => (
        <li
          key={i}
          className="history-item history-skeleton-item"
          style={{ '--history-skeleton-delay': `${i * 0.07}s` }}
        >
          <div className="history-skeleton-title" style={{ width }} />
          <div className="history-skeleton-time" />
        </li>
      ))}
    </ul>
  )
}

function HistoryPanelContent({ history, onSelect, onClose }) {
  const panelRef = useRef()
  const backdropRef = useRef()

  useLayoutEffect(() => {
    gsap.from(backdropRef.current, { opacity: 0, duration: 0.2 })
    gsap.fromTo(panelRef.current,
      { x: '100%' },
      { x: '0%', duration: 0.35, ease: 'power3.out' }
    )
  }, [])

  function handleClose() {
    gsap.to(panelRef.current, { x: '100%', duration: 0.28, ease: 'power3.in' })
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, onComplete: onClose })
  }

  function handleSelect(item) {
    handleClose()
    setTimeout(() => onSelect(item), 280)
  }

  return (
    <>
      <div className="history-backdrop" ref={backdropRef} onClick={handleClose} />
      <div className="history-panel" ref={panelRef}>
        <div className="history-header">
          <h3 className="history-title">Recent generations</h3>
          <button className="history-close" onClick={handleClose}>✕</button>
        </div>

        {!history ? (
          <HistorySkeleton />
        ) : history.length === 0 ? (
          <p className="history-empty">No generations yet. Create your first one!</p>
        ) : (
          <ul className="history-list">
            {history.map((item) => (
              <li key={item.id} className="history-item" onClick={() => handleSelect(item)}>
                <p className="history-item-title">{truncate(item.input_text)}</p>
                <span className="history-item-time">{timeAgo(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default function HistoryPanel(props) {
  return createPortal(<HistoryPanelContent {...props} />, document.body)
}
