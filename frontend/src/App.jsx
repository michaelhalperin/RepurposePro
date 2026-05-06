import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { AuthProvider, useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import InputScreen from './components/InputScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultsScreen from './components/ResultsScreen'
import ProfileScreen from './components/ProfileScreen'
import SavedScreen from './components/SavedScreen'
import HistoryPanel from './components/HistoryPanel'
import UpgradeModal from './components/UpgradeModal'
import { generate, getUsage, getHistory, deleteGeneration, getSaved, saveItem, unsaveItem } from './lib/api'
import { initPaddle } from './lib/paddle'
import repurposeProLogo from './assets/repurposepro-logo.png'

const PATHS = ['/', '/results', '/profile', '/saved']

function AppInner() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const view =
    location.pathname === '/results'
      ? 'results'
      : location.pathname === '/profile'
        ? 'profile'
        : location.pathname === '/saved'
          ? 'saved'
          : 'create'
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState(null)
  const [currentGenerationId, setCurrentGenerationId] = useState(null)
  const [deletingResults, setDeletingResults] = useState(false)

  const [usage, setUsage] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedItems, setSavedItems] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const mainRef = useRef()

  // Unknown paths → home
  useEffect(() => {
    if (!PATHS.includes(location.pathname)) {
      navigate('/', { replace: true })
    }
  }, [location.pathname, navigate])

  // Initialize Paddle.js once for frontend checkout features.
  useEffect(() => {
    initPaddle()
  }, [])

  // /results with nothing to show → home
  useEffect(() => {
    if (user && location.pathname === '/results' && !output && !loading) {
      navigate('/', { replace: true })
    }
  }, [user, location.pathname, output, loading, navigate])

  // Signed out (or auth resolved to guest): clear app state, keep URLs sane for guests
  useEffect(() => {
    if (user) return
    setUsage(null)
    setOutput(null)
    if (!authLoading && location.pathname !== '/') {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, location.pathname, navigate])

  // Signed in: load usage, handle Paddle redirect
  useEffect(() => {
    if (!user) return

    getUsage().then(setUsage).catch(() => {})

    const params = new URLSearchParams(window.location.search)
    if (params.get('paddle_success') === '1') {
      setSuccessMsg('Payment successful! Your Pro plan is now active.')
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => getUsage().then(setUsage).catch(() => {}), 3000)
      setTimeout(() => getUsage().then(setUsage).catch(() => {}), 7000)
    }
  }, [user])

  // Fetch history when panel opens
  useEffect(() => {
    if (historyOpen && user) {
      getHistory().then(setHistory).catch(() => setHistory([]))
    }
  }, [historyOpen, user])

  // Fetch saved items when saved view opens or when output is set (so Results knows what's already saved)
  useEffect(() => {
    if (view === 'saved' && user) {
      getSaved().then(setSavedItems).catch(() => setSavedItems([]))
    }
  }, [view, user])

  // Results screen needs saved ids for bookmark state; skip when on /saved to avoid double getSaved()
  useEffect(() => {
    if (output && user && view === 'results') {
      getSaved().then(setSavedItems).catch(() => {})
    }
  }, [output, user, view])

  async function handleSaveItem(itemType, itemData) {
    const result = await saveItem(itemType, itemData)
    setSavedItems(prev => [
      { id: result.id, item_type: itemType, item_data: itemData, created_at: new Date().toISOString() },
      ...(prev ?? [])
    ])
    return result.id
  }

  async function handleUnsaveItem(id) {
    await unsaveItem(id)
    setSavedItems(prev => prev?.filter(i => i.id !== id) ?? [])
  }

  async function transitionMain(fn) {
    await gsap.to(mainRef.current, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in' })
    await fn()
    gsap.to(mainRef.current, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' })
  }

  async function handleGenerate(input, tone) {
    setError(null)
    setLoading(true)
    if (mainRef.current) {
      await gsap.to(mainRef.current, { opacity: 0, duration: 0.2 })
      // Exit tween leaves <main> at opacity 0; reset so LoadingScreen is visible during the request.
      gsap.set(mainRef.current, { opacity: 1, y: 0 })
    }

    try {
      const result = await generate(input, tone)
      setOutput(result.output)
      setCurrentGenerationId(result.generation_id ?? null)
      setUsage({ plan: result.plan, usage_count: result.usage_count })
      navigate('/results')
    } catch (err) {
      if (err.message === 'limit_reached') {
        setShowUpgrade(true)
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
      navigate('/')
    } finally {
      setLoading(false)
      gsap.to(mainRef.current, { opacity: 1, y: 0, duration: 0.25 })
    }
  }

  function handleHistorySelect(item) {
    setOutput(item.output_json)
    setCurrentGenerationId(item.id ?? null)
    transitionMain(async () => navigate('/results'))
  }

  async function handleDeleteResults() {
    setDeletingResults(true)
    setError(null)
    try {
      if (currentGenerationId) {
        await deleteGeneration(currentGenerationId)
      }
      setOutput(null)
      setCurrentGenerationId(null)
      if (history) setHistory(h => h?.filter(i => i.id !== currentGenerationId) ?? h)
      await transitionMain(async () => navigate('/'))
    } catch (err) {
      setError(err.message || 'Could not delete. Try again.')
    } finally {
      setDeletingResults(false)
    }
  }

  function pathForView(v) {
    if (v === 'results') return '/results'
    if (v === 'profile') return '/profile'
    if (v === 'saved') return '/saved'
    return '/'
  }

  function handleSetView(v) {
    transitionMain(async () => navigate(pathForView(v)))
  }

  return (
    <div className="app">
      {successMsg && (
        <div className="success-banner">
          {successMsg}
          <button className="link-btn" onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}
          <button className="link-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className={`app-body ${user ? 'app-body--with-nav' : ''}`}>
      {user && (
        <Nav
          view={view}
          setView={handleSetView}
          hasResults={!!output}
          onHistoryOpen={() => setHistoryOpen(true)}
          onSavedOpen={() => handleSetView('saved')}
        />
      )}
      <main className="main" ref={mainRef} aria-busy={loading}>
        <img className="main-logo" src={repurposeProLogo} alt="RepurposePro" />
        {loading ? (
          <LoadingScreen />
        ) : view === 'create' ? (
          <InputScreen
            onGenerate={handleGenerate}
            usage={usage}
            onUpgrade={() => setShowUpgrade(true)}
            authLoading={authLoading}
            user={user}
            onSignIn={signInWithGoogle}
          />
        ) : view === 'results' && output ? (
          <ResultsScreen
            output={output}
            onOutputChange={setOutput}
            onDelete={handleDeleteResults}
            deleting={deletingResults}
            savedItems={savedItems}
            onSaveItem={handleSaveItem}
            onUnsaveItem={handleUnsaveItem}
          />
        ) : view === 'saved' ? (
          <SavedScreen
            savedItems={savedItems}
            onUnsaveItem={handleUnsaveItem}
          />
        ) : view === 'profile' && user ? (
          <ProfileScreen
            user={user}
            usage={usage}
            onUpgrade={() => setShowUpgrade(true)}
            onSignOut={signOut}
          />
        ) : null}
      </main>
      </div>

      {historyOpen && (
        <HistoryPanel
          history={history}
          onSelect={handleHistorySelect}
          onClose={() => { setHistoryOpen(false); setHistory(null) }}
        />
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
