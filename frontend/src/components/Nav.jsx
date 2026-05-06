import { Bookmark, CircleUser, FileStack, History, Sparkles } from 'lucide-react'

const iconProps = {
  size: 20,
  strokeWidth: 1.75,
  absoluteStrokeWidth: true,
}

export default function Nav({ view, setView, hasResults, onHistoryOpen, onSavedOpen }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${view === 'create' ? 'active' : ''}`}
          onClick={() => setView('create')}
        >
          <span className="sidebar-icon" aria-hidden>
            <Sparkles {...iconProps} />
          </span>
          <span className="sidebar-label">Create</span>
        </button>

        <button
          className={`sidebar-item ${view === 'results' ? 'active' : ''} ${!hasResults ? 'disabled' : ''}`}
          onClick={() => hasResults && setView('results')}
          disabled={!hasResults}
        >
          <span className="sidebar-icon" aria-hidden>
            <FileStack {...iconProps} />
          </span>
          <span className="sidebar-label">Results</span>
        </button>

        <button
          className="sidebar-item"
          onClick={onHistoryOpen}
        >
          <span className="sidebar-icon" aria-hidden>
            <History {...iconProps} />
          </span>
          <span className="sidebar-label">History</span>
        </button>

        <button
          className={`sidebar-item ${view === 'saved' ? 'active' : ''}`}
          onClick={onSavedOpen}
        >
          <span className="sidebar-icon" aria-hidden>
            <Bookmark {...iconProps} />
          </span>
          <span className="sidebar-label">Saved</span>
        </button>

        <div className="sidebar-divider" />

        <button
          className={`sidebar-item ${view === 'profile' ? 'active' : ''}`}
          onClick={() => setView('profile')}
        >
          <span className="sidebar-icon" aria-hidden>
            <CircleUser {...iconProps} />
          </span>
          <span className="sidebar-label">Profile</span>
        </button>
      </nav>
    </aside>
  )
}
