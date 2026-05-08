import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'

const SCHEDULE_DAYS = [1, 4, 7, 10, 14, 18, 21, 25, 28]

function ProgressBar({ currentDay }) {
  const filled = Math.round((currentDay / 28) * 14)
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: 14 }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 transition-colors ${i < filled ? 'bg-[#10b981]' : 'bg-neutral-800'}`}
        />
      ))}
    </div>
  )
}

function nextEmailDay(currentDay) {
  return SCHEDULE_DAYS.find((d) => d > currentDay) ?? null
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [journey, setJourney] = useState(undefined) // undefined = loading

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_journeys')
      .select('id, email, target_goal, start_date, current_day, status')
      .eq('email', user.email)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setJourney(data ?? null))
  }, [user])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const next = journey ? nextEmailDay(journey.current_day) : null

  return (
    <div className="min-h-screen bg-black text-white font-sans">

      {/* Top bar */}
      <header className="border-b border-neutral-900 px-8 md:px-16 py-5 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#10b981]">
          Mind Sovereignty
        </span>
        <div className="flex items-center gap-6">
          <span className="text-[11px] text-neutral-500 hidden sm:block">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-[11px] tracking-widest uppercase font-bold text-neutral-600 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 md:px-16 py-16 md:py-24 space-y-16">

        {/* Hero greeting */}
        <section>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-600 font-bold mb-4">
            Your Dashboard
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white">
            Stay the<br />
            <span className="text-[#10b981]">course.</span>
          </h1>
        </section>

        {/* Journey card */}
        {journey === undefined && (
          <p className="text-neutral-600 text-sm">Loading your journey…</p>
        )}

        {journey === null && (
          <div className="border border-neutral-800 p-8 space-y-4">
            <p className="text-neutral-400 text-sm font-light leading-relaxed">
              No active journey found. Complete the quiz on the homepage to start your 28-day programme.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-[#10b981] text-black text-[11px] font-black tracking-[0.2em] uppercase px-8 py-3.5 hover:opacity-90 transition-opacity"
            >
              Take the Quiz
            </button>
          </div>
        )}

        {journey && (
          <div className="space-y-10">

            {/* Status pill */}
            <div className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${journey.status === 'active' ? 'bg-[#10b981]' : 'bg-neutral-600'}`} />
              <span className="text-[10px] tracking-widest uppercase font-bold text-neutral-500">
                {journey.status === 'active' ? 'Active' : journey.status}
              </span>
            </div>

            {/* Progress section */}
            <div className="border border-neutral-900 p-8 space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-neutral-600 font-bold mb-1">
                    Progress
                  </p>
                  <p className="text-4xl font-black tracking-tight">
                    Day <span className="text-[#10b981]">{journey.current_day}</span>
                    <span className="text-neutral-700"> / 28</span>
                  </p>
                </div>
                <p className="text-[11px] text-neutral-600 font-light">
                  {Math.round((journey.current_day / 28) * 100)}% complete
                </p>
              </div>
              <ProgressBar currentDay={journey.current_day} />
            </div>

            {/* Goal + next email grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-neutral-900">
              <div className="bg-black p-8 space-y-2">
                <p className="text-[10px] tracking-widest uppercase text-neutral-600 font-bold">
                  Your Goal
                </p>
                <p className="text-base font-light text-neutral-300 leading-relaxed">
                  {journey.target_goal ?? 'Not specified'}
                </p>
              </div>
              <div className="bg-black p-8 space-y-2">
                <p className="text-[10px] tracking-widest uppercase text-neutral-600 font-bold">
                  Next Email
                </p>
                <p className="text-base font-light text-neutral-300 leading-relaxed">
                  {next ? `Day ${next}` : 'Journey complete — well done.'}
                </p>
              </div>
            </div>

            {/* Started date */}
            <p className="text-[11px] text-neutral-700 font-light">
              Journey started{' '}
              {new Date(journey.start_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        )}

      </main>
    </div>
  )
}
