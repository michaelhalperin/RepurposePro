import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { supabase } from '../lib/supabase'
import { deleteAccount } from '../lib/api'

export default function ProfileScreen({ user, usage, onUpgrade, onSignOut }) {
  const containerRef = useRef()

  const [pendingConfirm, setPendingConfirm] = useState(null) // 'signout' | 'delete' | null
  const [passwordMsg, setPasswordMsg] = useState(null) // { type: 'success'|'info', text }
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name
  const isGoogleUser = user?.app_metadata?.provider === 'google'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null
  const email = user?.email || ''
  const avatarInitial = (displayName || email || '?')[0].toUpperCase()

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.profile-avatar', { scale: 0.85, opacity: 0, duration: 0.4, ease: 'back.out(1.4)' })
      gsap.from('.profile-info', { y: 16, opacity: 0, duration: 0.4, delay: 0.1, ease: 'power3.out' })
      gsap.from('.profile-card', { y: 20, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.2, ease: 'power3.out' })
      gsap.from('.profile-actions', { y: 16, opacity: 0, duration: 0.4, delay: 0.45, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  async function handleChangePassword() {
    if (!email) return
    if (passwordMsg) {
      setPasswordMsg(null)
      return
    }
    if (isGoogleUser) {
      setPasswordMsg({ type: 'info', text: 'You signed in with Google. To change your password, visit myaccount.google.com.' })
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      setPasswordMsg({ type: 'error', text: 'Failed to send reset email. Try again.' })
    } else {
      setPasswordMsg({ type: 'success', text: `Password reset email sent to ${email}.` })
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      await supabase.auth.signOut()
      onSignOut()
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
      setPendingConfirm(null)
    }
  }

  if (!user) return null

  return (
    <div className="profile-screen" ref={containerRef}>
      <div className="profile-inner">

        {/* Avatar + name */}
        <div className="profile-header">
          <div className="profile-avatar">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="avatar-img" />
              : <span className="avatar-fallback">{avatarInitial}</span>
            }
          </div>
          <div className="profile-info">
            {displayName && <p className="profile-name">{displayName}</p>}
            <p className="profile-email">{email}</p>
            {memberSince && <p className="profile-since">Member since {memberSince}</p>}
          </div>
        </div>

        {/* Plan card */}
        <div className="profile-card">
          <div className="profile-card-label">Plan</div>
          <div className="profile-card-row">
            {usage?.plan === 'pro' ? (
              <span className="badge-pro">Pro — Unlimited</span>
            ) : (
              <>
                <span className="plan-free">Free</span>
                <button className="btn-upgrade-sm" onClick={onUpgrade}>Upgrade to Pro</button>
              </>
            )}
          </div>
        </div>

        {/* Usage card */}
        <div className="profile-card">
          <div className="profile-card-label">Generations used</div>
          <div className="profile-card-row">
            {usage ? (
              usage.plan === 'pro' ? (
                <span className="profile-stat">Unlimited</span>
              ) : (
                <>
                  <span className="profile-stat">
                    {usage.usage_count} <span className="profile-stat-sub">/ 5 free</span>
                  </span>
                  <div className="usage-track">
                    <div className="usage-fill" style={{ width: `${Math.min((usage.usage_count / 5) * 100, 100)}%` }} />
                  </div>
                </>
              )
            ) : (
              <span className="profile-stat muted">—</span>
            )}
          </div>
        </div>

        {/* Account actions */}
        <div className="profile-actions-block">
          <div className="profile-actions">
            <button className="btn-action" onClick={handleChangePassword}>
              Change password
            </button>

            <button
              type="button"
              className={`btn-action${pendingConfirm === 'signout' ? ' btn-action-pending' : ''}`}
              onClick={() => setPendingConfirm(prev => (prev === 'signout' ? null : 'signout'))}
            >
              Sign out
            </button>

            <button
              type="button"
              className={`btn-action danger${pendingConfirm === 'delete' ? ' btn-action-pending-danger' : ''}`}
              onClick={() => setPendingConfirm(prev => (prev === 'delete' ? null : 'delete'))}
            >
              Delete account
            </button>
          </div>

          {pendingConfirm === 'signout' && (
            <div className="profile-confirm-section" role="region" aria-label="Sign out confirmation">
              <p className="profile-confirm-text">Sign out? You will need to sign in again to use the app.</p>
              <div className="profile-confirm-buttons">
                <button type="button" className="confirm-cancel" onClick={() => setPendingConfirm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-yes"
                  onClick={() => {
                    setPendingConfirm(null)
                    onSignOut()
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {pendingConfirm === 'delete' && (
            <div
              className="profile-confirm-section danger"
              role="region"
              aria-label="Delete account confirmation"
            >
              <p className="profile-confirm-text">
                Delete your account permanently? This cannot be undone.
              </p>
              <div className="profile-confirm-buttons">
                <button
                  type="button"
                  className="confirm-cancel"
                  onClick={() => setPendingConfirm(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button type="button" className="confirm-yes danger" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </div>
          )}
        </div>

        {passwordMsg && <span className={`action-msg ${passwordMsg.type}`}>{passwordMsg.text}</span>}
        {deleteError && <span className="action-msg error">{deleteError}</span>}
      </div>
    </div>
  )
}
