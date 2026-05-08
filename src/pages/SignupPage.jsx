import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'

const TABS = ['signup', 'login']

export default function SignupPage() {
  const navigate    = useNavigate()
  const { session } = useAuth()

  const [tab,      setTab]      = useState('signup')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [status,   setStatus]   = useState(null)  // null | 'loading' | 'success' | 'error'
  const [message,  setMessage]  = useState('')

  // If already logged in, send straight to dashboard
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  function switchTab(t) {
    setTab(t)
    setStatus(null)
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    if (tab === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setStatus('error')
        setMessage(error.message)
        return
      }
      if (data.session) {
        // Email confirmation disabled — logged in immediately, redirect
        navigate('/dashboard', { replace: true })
      } else {
        setStatus('success')
        setMessage('Check your inbox to confirm your account, then log in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setStatus('error')
        setMessage(error.message)
        return
      }
      navigate('/dashboard', { replace: true })
    }
  }

  const inputClass = `
    w-full bg-neutral-900 border border-neutral-800 text-white text-sm font-light
    px-4 py-4 outline-none focus:border-[#10b981] transition-colors placeholder-neutral-600
  `

  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* Top bar */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-neutral-900">
        <Link to="/" className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#10b981]">
          Mind Sovereignty
        </Link>
        <Link to="/" className="text-[11px] tracking-widest uppercase font-bold text-neutral-600 hover:text-white transition-colors">
          ← Back
        </Link>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#10b981] font-bold mb-3">
              {tab === 'signup' ? 'Join Mind Sovereignty' : 'Welcome back'}
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
              {tab === 'signup'
                ? <>Access your<br /><span className="text-[#10b981]">AI coach.</span></>
                : <>Back to your<br /><span className="text-[#10b981]">dashboard.</span></>
              }
            </h1>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-neutral-800 mb-8">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={[
                  'flex-1 pb-3 text-[11px] font-bold tracking-widest uppercase transition-colors',
                  tab === t
                    ? 'text-[#10b981] border-b-2 border-[#10b981] -mb-px'
                    : 'text-neutral-600 hover:text-neutral-400',
                ].join(' ')}
              >
                {t === 'signup' ? 'Create Account' : 'Log In'}
              </button>
            ))}
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
              {tab === 'signup' && (
                <p className="mt-1.5 text-[10px] text-neutral-700">Minimum 6 characters.</p>
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
              className="w-full bg-[#10b981] text-black font-black text-[11px] tracking-[0.2em] uppercase py-4 mt-2 transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {status === 'loading'
                ? 'Please wait…'
                : tab === 'signup' ? 'Create Account' : 'Log In'}
            </button>
          </form>

          {/* Toggle hint */}
          <p className="text-center text-[11px] text-neutral-600 mt-6">
            {tab === 'signup' ? 'Already have an account? ' : 'No account yet? '}
            <button
              onClick={() => switchTab(tab === 'signup' ? 'login' : 'signup')}
              className="text-[#10b981] font-bold hover:underline"
            >
              {tab === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}
