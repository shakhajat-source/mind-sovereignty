import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TABS = ['login', 'signup']

export default function AuthModal({ isOpen, onClose, onSignUpSuccess }) {
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus]   = useState(null) // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  // Reset state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('login')
      setEmail('')
      setPassword('')
      setStatus(null)
      setMessage('')
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    let error
    if (tab === 'signup') {
      const result = await supabase.auth.signUp({ email, password })
      error = result.error
      if (!error) {
        if (result.data.session) {
          // Email confirmation disabled — session is live immediately, hand off to parent
          onSignUpSuccess?.(result.data.user)
        } else {
          // Email confirmation required — stay open, show message
          setStatus('success')
          setMessage('Check your inbox to confirm your account, then log in to start your journey.')
        }
        return
      }
    } else {
      const result = await supabase.auth.signInWithPassword({ email, password })
      error = result.error
      if (!error) {
        onClose()
        return
      }
    }

    setStatus('error')
    setMessage(error.message)
  }

  const inputClass = `
    w-full bg-neutral-900 border border-neutral-800 text-white text-sm font-light
    px-4 py-3.5 outline-none focus:border-[#10b981] transition-colors placeholder-neutral-600
  `

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-black border border-neutral-800">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-600 hover:text-white transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="px-8 pt-10 pb-6 border-b border-neutral-800">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#10b981] font-bold mb-3">
            Mind Sovereignty
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight leading-none">
            {tab === 'login' ? 'Welcome back.' : 'Start your journey.'}
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-neutral-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatus(null); setMessage('') }}
              className={`
                flex-1 py-4 text-[11px] font-bold tracking-widest uppercase transition-colors
                ${tab === t
                  ? 'text-[#10b981] border-b-2 border-[#10b981] -mb-px'
                  : 'text-neutral-600 hover:text-neutral-400'}
              `}
            >
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
            {tab === 'signup' && (
              <p className="mt-1.5 text-[10px] text-neutral-600">Minimum 6 characters.</p>
            )}
          </div>

          {/* Feedback */}
          {message && (
            <p className={`text-xs font-light leading-relaxed ${status === 'error' ? 'text-red-400' : 'text-[#10b981]'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="
              w-full bg-[#10b981] text-black font-black text-[11px] tracking-[0.2em] uppercase
              py-4 mt-2 transition-opacity disabled:opacity-50 hover:opacity-90
            "
          >
            {status === 'loading'
              ? 'Please wait…'
              : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>

          {/* Toggle hint */}
          <p className="text-center text-[11px] text-neutral-600 pt-1">
            {tab === 'login' ? "No account? " : "Already a member? "}
            <button
              type="button"
              onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setStatus(null); setMessage('') }}
              className="text-[#10b981] font-bold hover:underline"
            >
              {tab === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
