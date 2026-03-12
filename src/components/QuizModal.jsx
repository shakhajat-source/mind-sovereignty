import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { computeArchetype, computeCognitiveLeakage, ARCHETYPES } from '../lib/archetypes'

/* ─────────────────────────────────────────────────────────────────────────────
   STEP MAP
   0  → Intro
   1  → Section 1: Usage (6 questions on one screen)
   2  → Section 2a: App Categories (ranked)
   3  → Section 2b: Sub-categories (conditional — skipped for utility/not_sure)
   4  → Section 3: Patterns (When, Where, Shadow)
   5  → Section 4: Motives (ranked, 11 options)
   6  → Section 5: Severity & Impact (Q4 + Q5 on one screen)
   7  → Section 6: Attention Span (single multiple-choice)
   8  → Section 7: Interests (open text)
   9  → Section 8: Social Connection (multiple-choice)
   10 → Results (Archetype + Cognitive Leakage chart)
───────────────────────────────────────────────────────────────────────────── */

const MAX_STEPS = 9

/* ── Section 1: Usage ────────────────────────────────────────────────────── */
const USAGE_HOURS_OPTIONS = [
  { key: '0to2',  label: '0 – 2 hours'  },
  { key: '2to4',  label: '2 – 4 hours'  },
  { key: '4to6',  label: '4 – 6 hours'  },
  { key: '6to8',  label: '6 – 8 hours'  },
  { key: '8to10', label: '8 – 10 hours' },
  { key: 'gt10',  label: '10+ hours'    },
]
const UNNECESSARY_PCT_OPTIONS = [
  { key: '10to20', label: '10–20%'   },
  { key: '20to30', label: '20–30%'   },
  { key: '30to40', label: '30–40%'   },
  { key: 'gt40',   label: '40%+'     },
  { key: 'not_sure', label: 'Not Sure' },
]
const MORNING_OPTIONS      = [{ key: 'agree', label: 'Agree' }, { key: 'disagree', label: 'Disagree' }, { key: 'trying', label: 'Trying not to' }]
const WORK_PROC_OPTIONS    = [{ key: 'agree', label: 'Agree' }, { key: 'disagree', label: 'Disagree' }, { key: 'not_sure', label: 'Not Sure' }]
const MOVIE_FOCUS_OPTIONS  = [{ key: 'agree', label: 'Agree' }, { key: 'disagree', label: 'Disagree' }]
const SOCIAL_FB_OPTIONS    = [{ key: 'agree', label: 'Agree' }, { key: 'disagree', label: 'Disagree' }]

/* ── Section 2a: App Categories ──────────────────────────────────────────── */
const Q2_OPTIONS = [
  { key: 'work_admin',   label: 'Work / Life Admin',       desc: 'Emails, sorting finances, life logistics, staying on top of tasks' },
  { key: 'social_doom',  label: 'Social Doomscrolling',    desc: 'Passively flicking through X, TikTok, Instagram, Facebook, YouTube Reels' },
  { key: 'own_social',   label: 'Your Own Social Network', desc: 'Seeing what friends are up to, messaging, posting your own content' },
  { key: 'games_videos', label: 'Games & Videos',          desc: 'YouTube deep-dives, gaming, streaming, content rabbit holes' },
  { key: 'utility',      label: 'Utility',                 desc: 'Maps, banking, calendar, travel — functional use with little excess' },
  { key: 'not_sure',     label: 'Not sure',                desc: 'I genuinely cannot identify a clear pattern' },
]

/* ── Section 2b: Sub-categories ──────────────────────────────────────────── */
const SUBCATEGORIES = {
  work_admin: {
    question: 'Which type of work/admin use is pulling you in most?',
    options: [
      { key: 'email_slack', label: 'Email & Slack / messaging apps' },
      { key: 'task_mgmt',   label: 'Task management & to-do lists' },
      { key: 'finance',     label: 'Finance, banking & admin' },
      { key: 'news_feeds',  label: 'News & professional feeds (LinkedIn, etc.)' },
    ],
  },
  social_doom: {
    question: 'Where does the doomscrolling happen most?',
    options: [
      { key: 'tiktok',    label: 'TikTok / Instagram Reels / YouTube Shorts' },
      { key: 'twitter_x', label: 'X / Twitter' },
      { key: 'instagram', label: 'Instagram feed & stories' },
      { key: 'facebook',  label: 'Facebook / Reddit' },
    ],
  },
  own_social: {
    question: 'What drives your own social network use?',
    options: [
      { key: 'fomo',      label: 'Fear of missing out — checking what others are doing' },
      { key: 'posting',   label: 'Creating & posting my own content' },
      { key: 'messaging', label: 'Direct messaging & group chats' },
      { key: 'approval',  label: 'Checking likes, comments & reactions' },
    ],
  },
  games_videos: {
    question: 'What type of content or gaming pulls you in?',
    options: [
      { key: 'youtube',      label: 'YouTube long-form videos' },
      { key: 'streaming',    label: 'Netflix / streaming on phone' },
      { key: 'mobile_games', label: 'Mobile games' },
      { key: 'podcasts',     label: 'Podcasts / audio content' },
    ],
  },
}

/* ── Section 3: Patterns ─────────────────────────────────────────────────── */
const WHEN_OPTIONS = [
  { key: 'morning',    label: 'Morning'      },
  { key: 'work',       label: 'During Work'  },
  { key: 'evening',    label: 'Evening'      },
  { key: 'late_night', label: 'Late Night'   },
]
const WHERE_OPTIONS = [
  { key: 'in_bed',    label: 'In bed'        },
  { key: 'sofa',      label: 'On the sofa'   },
  { key: 'desk',      label: 'At my desk'    },
  { key: 'kitchen',   label: 'In the kitchen'},
  { key: 'commuting', label: 'Commuting'     },
]
const SHADOW_OPTIONS = [
  { key: 'follows',  label: 'It follows me'  },
  { key: 'has_home', label: 'It has a home'  },
]

/* ── Section 4: Motives ──────────────────────────────────────────────────── */
const MOTIVE_OPTIONS = [
  { key: 'connection',      label: 'Connection',              desc: 'Staying close to friends/family' },
  { key: 'information',     label: 'Information',             desc: 'News, politics, world events' },
  { key: 'emotional_buffer',label: 'Emotional Buffer',        desc: 'Soothing stress, anxiety, loneliness' },
  { key: 'avoidance',       label: 'Avoidance',               desc: 'Procrastinating on a task' },
  { key: 'gap_filler',      label: 'The Gap Filler',          desc: 'Hating boredom, waiting in lines' },
  { key: 'secondary_screen',label: 'Secondary Screen',        desc: 'Background noise' },
  { key: 'high_stimulation',label: 'High-Stimulation',        desc: 'Slow activities feel boring' },
  { key: 'tactile',         label: 'Tactile / Fidgeting',     desc: 'Hands need something to do' },
  { key: 'rabbit_hole',     label: 'The Rabbit Hole',         desc: "Loop of seeking 'one more' answer" },
  { key: 'validation',      label: 'Validation',              desc: 'Checking likes, comments, engagement' },
  { key: 'professional',    label: 'Professional Obligation', desc: "Pressure to be always 'on'" },
]

/* ── Section 5: Severity & Impact ────────────────────────────────────────── */
const Q4_OPTIONS = [
  { key: 'sleep',     label: 'Sleep quality' },
  { key: 'focus',     label: 'Ability to focus on deep work' },
  { key: 'attention', label: 'Attention span & reading ability' },
  { key: 'relations', label: 'Relationships & in-person connections' },
  { key: 'fitness',   label: 'Physical fitness & health habits' },
  { key: 'not_sure',  label: 'Not sure / all of the above' },
]
const Q5_OPTIONS = [
  { key: 'mild',     label: "Mild — I notice it but it doesn't really bother me" },
  { key: 'moderate', label: "Moderate — it's affecting my daily life noticeably" },
  { key: 'severe',   label: "Severe — it's a real problem I need to fix" },
  { key: 'crisis',   label: "Crisis — it's significantly damaging my life" },
]

/* ── Section 6: Attention ────────────────────────────────────────────────── */
const ATTENTION_OPTIONS = [
  { key: 'flow_state',   label: "I get into a 'flow state' and rarely notice distractions." },
  { key: 'check_once',   label: 'I might check my phone once or twice, but I get the job done.' },
  { key: 'switch_tasks', label: 'I frequently switch between tabs or tasks before finishing the first one.' },
  { key: 'pulled_away',  label: "Every notification or noise completely pulls me away from what I'm doing." },
  { key: 'cant_refocus', label: 'I spend more time trying to get back into the zone than actually working.' },
]

/* ── Section 8: Social Connection ───────────────────────────────────────── */
const SOCIAL_OPTIONS = [
  { key: 'rarely',     label: "Rarely — I'm too busy/tired" },
  { key: 'once_week',  label: 'Once a week' },
  { key: '2to3_week',  label: '2–3 times a week' },
  { key: 'too_busy',   label: "My life is too busy to socialise" },
  { key: 'online_only',label: "I don't meet people in person — my social life is online" },
]

/* ── Misc ─────────────────────────────────────────────────────────────────── */
const Q5_LABEL = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe', crisis: 'Crisis' }

function generateRef() {
  return `MSA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function initAnswers() {
  return {
    usageHours: null, unnecessaryPct: null, morningUsage: null,
    workProcrastination: null, movieFocus: null, socialFeedback: null,
    q2_ranked: [], q2b: [],
    when: null, where: null, shadowStatus: null,
    motives_ranked: [],
    impactArea: null, severity: null,
    attentionSpan: null,
    interests: '',
    socialConnection: null,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function QuizModal({ isOpen, onClose }) {
  const [step,       setStep]       = useState(0)
  const [answers,    setAnswers]    = useState(initAnswers)
  const [email,      setEmail]      = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [emailSent,  setEmailSent]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [refNum]                    = useState(generateRef)

  /* ── Body scroll lock ──────────────────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  /* ── Reset on close ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) {
      setStep(0); setAnswers(initAnswers())
      setEmail(''); setNewsletter(false); setEmailSent(false); setSaving(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const isIntro   = step === 0
  const isResults = step === 10
  const progress  = isIntro ? 0 : isResults ? 100 : (step / 10) * 100

  const topApp     = answers.q2_ranked?.[0] ?? null
  const subCatData = topApp ? SUBCATEGORIES[topApp] : null
  const skipQ2b    = !subCatData  // true for utility, not_sure, or unrecognised

  // Results computation (safe to run on every render — cheap)
  const archetypeKey = computeArchetype(topApp, answers.motives_ranked)
  const archetype    = ARCHETYPES[archetypeKey]
  const leakage      = computeCognitiveLeakage(topApp, answers.motives_ranked)

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  function set(key, val) {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }

  function toggleRank(arr, val) {
    return arr.includes(val) ? arr.filter(k => k !== val) : [...arr, val]
  }

  function toggleMultiMax2(arr, val) {
    if (arr.includes(val)) return arr.filter(k => k !== val)
    if (arr.length >= 2)   return arr
    return [...arr, val]
  }

  /* ── Validation ────────────────────────────────────────────────────────── */
  function canAdvance() {
    switch (step) {
      case 1:
        return !!(answers.usageHours && answers.unnecessaryPct && answers.morningUsage &&
                  answers.workProcrastination && answers.movieFocus && answers.socialFeedback)
      case 2: return answers.q2_ranked.length >= 1
      case 3: return answers.q2b.length >= 1
      case 4: return !!(answers.when && answers.where && answers.shadowStatus)
      case 5: return answers.motives_ranked.length >= 1
      case 6: return !!(answers.impactArea && answers.severity)
      case 7: return !!answers.attentionSpan
      case 8: return answers.interests.trim().length > 0
      case 9: return !!answers.socialConnection
      default: return false
    }
  }

  /* ── Navigation ────────────────────────────────────────────────────────── */
  function advance() {
    if (!canAdvance()) return
    if (step === 2 && skipQ2b) { setStep(4); return }
    setStep(s => s + 1)
  }

  function retreat() {
    if (step === 0) return
    if (step === 4 && skipQ2b) { setStep(2); return }
    setStep(s => s - 1)
  }

  /* ── Email submit ──────────────────────────────────────────────────────── */
  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email.trim() || saving) return
    setSaving(true)

    const { error } = await supabase.from('quiz_submissions').insert({
      email:                 email.trim().toLowerCase(),
      primary_magnet:        topApp,
      profile_type:          archetypeKey,
      radar_scores:          leakage,
      audit_data: {
        severity:        answers.severity,
        interests:       answers.interests,
        socialConnection:answers.socialConnection,
        usageHours:      answers.usageHours,
        unnecessaryPct:  answers.unnecessaryPct,
      },
      newsletter_subscribed: newsletter,
    })
    if (error) console.error('quiz_submissions insert error:', error)

    setSaving(false)
    setEmailSent(true)
  }

  /* ── Shared styles ─────────────────────────────────────────────────────── */
  function optionClass(active) {
    return [
      'w-full text-left px-5 py-3.5 border text-sm font-sans font-light',
      'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500',
      active
        ? 'border-emerald-600 bg-emerald-50 text-neutral-900'
        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900',
    ].join(' ')
  }

  function chipClass(active) {
    return [
      'px-4 py-2 border text-sm font-light transition-all duration-150 focus:outline-none',
      active
        ? 'border-emerald-600 bg-emerald-50 text-neutral-900'
        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
    ].join(' ')
  }

  /* ── Leakage chart data ─────────────────────────────────────────────────── */
  const leakageData = [
    { name: 'Stimulation Tax', value: leakage.stimulation, color: '#c17240' },
    { name: 'Vigilance Tax',   value: leakage.vigilance,   color: '#5c7a8c' },
    { name: 'Avoidance Tax',   value: leakage.avoidance,   color: '#8c6b5c' },
  ]

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
         role="dialog" aria-modal="true" aria-label="Digital Health Assessment">

      <div className="absolute inset-0 bg-[#1A1A1A]/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className={`relative bg-[#F2F0ED] w-full shadow-2xl flex flex-col overflow-hidden
                       border border-neutral-300 max-h-[92vh]
                       ${isResults ? 'max-w-2xl' : 'max-w-lg'}`}>

        {/* Progress bar */}
        <div className="h-1 bg-neutral-200 flex-shrink-0">
          <div className="h-full bg-emerald-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Close */}
        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-5 z-10 text-neutral-400 hover:text-neutral-900 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="overflow-y-auto overscroll-contain flex-1">

          {/* ══════════════════════════  INTRO  ══════════════════════════════ */}
          {step === 0 && (
            <div className="px-10 py-12 space-y-5">
              <div className="space-y-1">
                <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Free Assessment</p>
                <p className="text-xs text-neutral-400 font-light">9 sections · ~5 minutes</p>
              </div>
              <h2 className="font-display font-black text-3xl text-neutral-900 leading-tight tracking-tight">
                Your Digital Health Profile
              </h2>
              <p className="text-sm text-neutral-600 font-light leading-relaxed">
                This assessment is designed to identify your specific digital habits so we can assess
                your individual needs. Don't be afraid to answer honestly — for our results to work,
                we need accurate data. Remember, the addiction tools employed by tech companies aren't
                your fault. Modern tech is designed to bypass human willpower; it's a conflict of
                biology, not a failure of character.
              </p>
              <p className="text-sm text-neutral-600 font-light leading-relaxed">
                By answering these questions honestly, you are gathering the intelligence we need to
                build your exit strategy. Once completed, you'll receive our initial assessment and
                the broad structure of your customised free 4-week recovery plan to give you back the
                time you've been losing.
              </p>
              <button onClick={() => setStep(1)}
                className="w-full bg-[#1A1A1A] text-white text-sm font-bold tracking-widest uppercase py-4 hover:bg-black transition-colors mt-2">
                Start Assessment
              </button>
            </div>
          )}

          {/* ══════════════════════════  STEP 1: USAGE  ══════════════════════ */}
          {step === 1 && (
            <div className="px-10 py-10 space-y-8">
              <StepHeader step={1} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 1: Usage</p>

              {/* Q1a: Daily screen time */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  My average daily screen time is:
                </h3>
                <p className="text-xs text-neutral-400 font-light">
                  iOS: Settings → Screen Time. Android: Settings → Digital Wellbeing.
                </p>
                <div className="flex flex-wrap gap-2">
                  {USAGE_HOURS_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => set('usageHours', opt.key)}
                      className={chipClass(answers.usageHours === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q1b: % unnecessary */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  What percentage of this time feels like unnecessary 'zombie usage' you'd like to reduce?
                </h3>
                <div className="flex flex-wrap gap-2">
                  {UNNECESSARY_PCT_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => set('unnecessaryPct', opt.key)}
                      className={chipClass(answers.unnecessaryPct === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q1c: Morning usage */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  I usually look at my phone within ten minutes of waking up.
                </h3>
                <div className="flex flex-wrap gap-2">
                  {MORNING_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => set('morningUsage', opt.key)}
                      className={chipClass(answers.morningUsage === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q1d: Work procrastination */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  I spend at least 1 hour procrastinating on my phone during work or productive hours.
                </h3>
                <div className="flex flex-wrap gap-2">
                  {WORK_PROC_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => set('workProcrastination', opt.key)}
                      className={chipClass(answers.workProcrastination === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q1e: Movie / book focus */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  I struggle to sit through a full-length movie or read a book chapter without checking my phone.
                </h3>
                <div className="flex flex-wrap gap-2">
                  {MOVIE_FOCUS_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => set('movieFocus', opt.key)}
                      className={chipClass(answers.movieFocus === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q1f: Social feedback */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  Family or friends have mentioned my phone usage to me recently.
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_FB_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => set('socialFeedback', opt.key)}
                      className={chipClass(answers.socialFeedback === opt.key)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 2: APP CATEGORIES  ═════════════ */}
          {step === 2 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={2} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 2a: Landscape</p>
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  What draws you to your phone most?
                </h2>
                <p className="text-sm text-neutral-400 font-light">Click to rank from most to least — your top choice first.</p>
              </div>
              <ul className="space-y-2">
                {Q2_OPTIONS.map(opt => {
                  const rank   = answers.q2_ranked.indexOf(opt.key)
                  const ranked = rank !== -1
                  return (
                    <li key={opt.key}>
                      <button onClick={() => set('q2_ranked', toggleRank(answers.q2_ranked, opt.key))}
                        className={[
                          'w-full text-left px-5 py-3.5 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500',
                          ranked ? 'border-emerald-600 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400',
                        ].join(' ')}>
                        <span className="flex items-center gap-3">
                          <span className={[
                            'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-150',
                            ranked ? 'bg-emerald-600 text-white' : 'border border-neutral-300 text-neutral-300',
                          ].join(' ')}>
                            {ranked ? rank + 1 : ''}
                          </span>
                          <span className="flex flex-col">
                            <span className={`text-sm font-medium ${ranked ? 'text-neutral-900' : 'text-neutral-600'}`}>{opt.label}</span>
                            <span className="text-xs text-neutral-400 font-light mt-0.5">{opt.desc}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {answers.q2_ranked.length > 0 && (
                <p className="text-xs text-neutral-400 font-light">
                  {answers.q2_ranked.length === Q2_OPTIONS.length ? 'All ranked.' : `${answers.q2_ranked.length} ranked. Keep going or tap Next.`}
                </p>
              )}
              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 3: SUB-CATEGORIES  ═════════════ */}
          {step === 3 && subCatData && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={3} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 2b: Landscape</p>
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  {subCatData.question}
                </h2>
                <p className="text-sm text-neutral-400 font-light">Select up to two.</p>
              </div>
              <ul className="space-y-2" role="group">
                {subCatData.options.map(opt => {
                  const active   = answers.q2b.includes(opt.key)
                  const disabled = !active && answers.q2b.length >= 2
                  return (
                    <li key={opt.key}>
                      <button onClick={() => set('q2b', toggleMultiMax2(answers.q2b, opt.key))} disabled={disabled}
                        className={[optionClass(active), disabled ? 'opacity-30 cursor-not-allowed' : ''].join(' ')}>
                        <span className="flex items-center gap-3">
                          <CheckBox active={active} />
                          {opt.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 4: PATTERNS  ═══════════════════ */}
          {step === 4 && (
            <div className="px-10 py-10 space-y-8">
              <StepHeader step={4} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 3: Patterns</p>

              {/* When */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  When do you feel most 'hooked' or likely to scroll aimlessly?
                </h3>
                <ul className="space-y-2" role="radiogroup">
                  {WHEN_OPTIONS.map(opt => (
                    <li key={opt.key}>
                      <button role="radio" aria-checked={answers.when === opt.key}
                        onClick={() => set('when', opt.key)} className={optionClass(answers.when === opt.key)}>
                        <span className="flex items-center gap-3">
                          <RadioDot active={answers.when === opt.key} />
                          {opt.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Where */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  Think about that time. Where are you usually?
                </h3>
                <ul className="space-y-2" role="radiogroup">
                  {WHERE_OPTIONS.map(opt => (
                    <li key={opt.key}>
                      <button role="radio" aria-checked={answers.where === opt.key}
                        onClick={() => set('where', opt.key)} className={optionClass(answers.where === opt.key)}>
                        <span className="flex items-center gap-3">
                          <RadioDot active={answers.where === opt.key} />
                          {opt.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shadow test */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                  Does your phone follow you from room to room like a shadow, or does it have a dedicated spot where it stays?
                </h3>
                <ul className="space-y-2" role="radiogroup">
                  {SHADOW_OPTIONS.map(opt => (
                    <li key={opt.key}>
                      <button role="radio" aria-checked={answers.shadowStatus === opt.key}
                        onClick={() => set('shadowStatus', opt.key)} className={optionClass(answers.shadowStatus === opt.key)}>
                        <span className="flex items-center gap-3">
                          <RadioDot active={answers.shadowStatus === opt.key} />
                          {opt.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 5: MOTIVES  ════════════════════ */}
          {step === 5 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={5} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 4: Motive</p>
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  Why do you use your phone?
                </h2>
                <p className="text-sm text-neutral-400 font-light">Rank all that apply — most important first.</p>
              </div>
              <ul className="space-y-2">
                {MOTIVE_OPTIONS.map(opt => {
                  const rank   = answers.motives_ranked.indexOf(opt.key)
                  const ranked = rank !== -1
                  return (
                    <li key={opt.key}>
                      <button onClick={() => set('motives_ranked', toggleRank(answers.motives_ranked, opt.key))}
                        className={[
                          'w-full text-left px-5 py-3.5 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500',
                          ranked ? 'border-emerald-600 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400',
                        ].join(' ')}>
                        <span className="flex items-center gap-3">
                          <span className={[
                            'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-150',
                            ranked ? 'bg-emerald-600 text-white' : 'border border-neutral-300 text-neutral-300',
                          ].join(' ')}>
                            {ranked ? rank + 1 : ''}
                          </span>
                          <span className="flex flex-col">
                            <span className={`text-sm font-medium ${ranked ? 'text-neutral-900' : 'text-neutral-600'}`}>{opt.label}</span>
                            <span className="text-xs text-neutral-400 font-light mt-0.5">{opt.desc}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {answers.motives_ranked.length > 0 && (
                <p className="text-xs text-neutral-400 font-light">
                  {answers.motives_ranked.length === MOTIVE_OPTIONS.length ? 'All ranked.' : `${answers.motives_ranked.length} ranked. Keep going or tap Next.`}
                </p>
              )}
              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 6: SEVERITY & IMPACT  ══════════ */}
          {step === 6 && (
            <div className="px-10 py-10 space-y-8">
              <StepHeader step={6} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 5: Severity & Impact</p>

              {/* Q4: Impact area */}
              <div className="space-y-3">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  What part of your non-phone life is feeling the most neglected?
                </h2>
                <ul className="space-y-2" role="radiogroup">
                  {Q4_OPTIONS.map(opt => (
                    <li key={opt.key}>
                      <button role="radio" aria-checked={answers.impactArea === opt.key}
                        onClick={() => set('impactArea', opt.key)} className={optionClass(answers.impactArea === opt.key)}>
                        <span className="flex items-center gap-3">
                          <RadioDot active={answers.impactArea === opt.key} />
                          {opt.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Q5: Severity */}
              <div className="space-y-3">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  How severe is this problem for you, honestly?
                </h2>
                <ul className="space-y-2" role="radiogroup">
                  {Q5_OPTIONS.map(opt => (
                    <li key={opt.key}>
                      <button role="radio" aria-checked={answers.severity === opt.key}
                        onClick={() => set('severity', opt.key)} className={optionClass(answers.severity === opt.key)}>
                        <span className="flex items-center gap-3">
                          <RadioDot active={answers.severity === opt.key} />
                          {opt.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 7: ATTENTION SPAN  ═════════════ */}
          {step === 7 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={7} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 6: Attention Span</p>
              <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                Which of the following best describes your typical experience when working on a project that requires 20 minutes of steady concentration?
              </h2>
              <ul className="space-y-2" role="radiogroup">
                {ATTENTION_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button role="radio" aria-checked={answers.attentionSpan === opt.key}
                      onClick={() => set('attentionSpan', opt.key)} className={optionClass(answers.attentionSpan === opt.key)}>
                      <span className="flex items-center gap-3">
                        <RadioDot active={answers.attentionSpan === opt.key} />
                        {opt.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 8: INTERESTS  ══════════════════ */}
          {step === 8 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={8} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 7: Interests</p>
              <div className="space-y-2">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  If you had an extra hour of calm every day, what is one thing you'd actually like to do?
                </h2>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  It might be something you used to do, or something you've seen someone else doing and thought
                  "I wish I could do that." Avoid picking things that feel like 'work'. If you aren't sure, think
                  back to what you enjoyed before you had a smartphone.
                </p>
              </div>
              <textarea
                rows={4}
                placeholder="e.g. Reading fiction, learning guitar, painting, walking without headphones..."
                value={answers.interests}
                onChange={e => set('interests', e.target.value)}
                className="w-full bg-white border border-neutral-200 px-4 py-3 text-sm font-sans
                           text-neutral-900 placeholder:text-neutral-300 resize-none
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 9: SOCIAL CONNECTION  ══════════ */}
          {step === 9 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={9} total={MAX_STEPS} />
              <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 8: Social Connection</p>
              <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                How often do you socialise in person — whether just meeting friends or as part of a club/society?
              </h2>
              <ul className="space-y-2" role="radiogroup">
                {SOCIAL_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button role="radio" aria-checked={answers.socialConnection === opt.key}
                      onClick={() => set('socialConnection', opt.key)} className={optionClass(answers.socialConnection === opt.key)}>
                      <span className="flex items-center gap-3">
                        <RadioDot active={answers.socialConnection === opt.key} />
                        {opt.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
            </div>
          )}

          {/* ══════════════════════════  STEP 10: RESULTS  ═══════════════════ */}
          {isResults && (
            <div className="divide-y divide-neutral-200">

              {/* Letterhead */}
              <div className="px-10 py-8 flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs tracking-widest uppercase text-neutral-400 font-light mb-1.5">Mind Sovereignty</p>
                  <h2 className="font-display font-black text-2xl text-neutral-900 tracking-tight">Your Sovereignty Assessment</h2>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-neutral-300 font-light">{today}</p>
                  <p className="text-xs text-neutral-200 font-mono mt-0.5">{refNum}</p>
                </div>
              </div>

              {/* Archetype */}
              <div className="px-10 py-7 space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">01</span>
                  <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Your Sovereignty Archetype</p>
                </div>
                <h3 className="font-display font-black text-3xl text-neutral-900 tracking-tight">
                  {archetype.name}
                </h3>
                <p className="text-sm text-neutral-600 font-light leading-relaxed">
                  {archetype.subtitle}
                </p>
                {answers.severity && (
                  <div className="inline-flex items-center gap-2 bg-neutral-900 px-3 py-1.5 mt-1">
                    <span className="text-xs text-white/50 font-light tracking-widest uppercase">Severity</span>
                    <span className="text-xs text-white font-bold tracking-wide uppercase">{Q5_LABEL[answers.severity]}</span>
                  </div>
                )}
              </div>

              {/* Cognitive Leakage Chart */}
              <div className="px-10 py-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">02</span>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Cognitive Leakage</p>
                    <p className="text-xs text-neutral-300 font-light mt-0.5">Where your mental energy is being spent</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart layout="vertical" data={leakageData} margin={{ top: 4, right: 44, bottom: 4, left: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category" dataKey="name" width={130}
                      tick={{ fontSize: 11, fill: '#888', fontFamily: 'Inter, sans-serif' }}
                      axisLine={false} tickLine={false}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]}
                      label={{ position: 'right', fontSize: 11, fill: '#aaa', fontFamily: 'monospace', formatter: v => `${v}` }}>
                      {leakageData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 4-Week Plan preview */}
              <div className="px-10 py-7 space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">03</span>
                  <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Your 4-Week Recovery Plan</p>
                </div>
                <div className="bg-white border border-neutral-200 px-5 py-4">
                  <ul className="text-xs text-neutral-400 font-light space-y-2">
                    <li><span className="text-neutral-700 font-semibold">Phase 1: The Reset</span> — Start your hobby, inform friends of the challenge, write down your intentions.</li>
                    <li><span className="text-neutral-700 font-semibold">Phase 2: The Itch</span> — Fully delete your trigger apps. Sit with the biological pressure to revert.</li>
                    <li><span className="text-neutral-700 font-semibold">Phase 3: Rebuilding Focus</span> — Feel the neurological benefits. Concentrate heavily on your interests.</li>
                    <li><span className="text-neutral-700 font-semibold">Phase 4: The New Normal</span> — Freedom from compulsive loops and dopamine irregularity.</li>
                  </ul>
                </div>
              </div>

              {/* Email capture */}
              <div className="px-10 py-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">04</span>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Get Your Full Recovery Plan</p>
                    <p className="text-xs text-neutral-300 font-light mt-0.5">Free · Sent to your inbox · No spam</p>
                  </div>
                </div>

                {!emailSent ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email" required placeholder="your@email.com"
                        value={email} onChange={e => setEmail(e.target.value)}
                        className="flex-1 bg-white border border-neutral-200 px-4 py-3.5 text-sm font-sans
                                   text-neutral-900 placeholder:text-neutral-300
                                   focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button type="submit" disabled={saving}
                        className={`bg-[#1A1A1A] text-white whitespace-nowrap text-xs font-bold tracking-widest uppercase px-6 py-3.5 hover:bg-black transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {saving ? 'Saving…' : 'Send My Plan'}
                      </button>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span onClick={() => setNewsletter(n => !n)}
                        className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors duration-150 cursor-pointer
                                    ${newsletter ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-300 group-hover:border-emerald-400'}`}>
                        {newsletter && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className="text-xs text-neutral-400 font-light" onClick={() => setNewsletter(n => !n)}>
                        Subscribe to our research updates — science-backed insights on attention, habit and focus.
                      </span>
                    </label>
                  </form>
                ) : (
                  <div className="bg-[#1A1A1A] px-6 py-5 space-y-1">
                    <p className="text-base font-display font-bold text-white">Your Roadmap Is On Its Way.</p>
                    <p className="text-xs text-white/55 font-light leading-relaxed">
                      Your personalised 4-week recovery plan — Phase 1: The Reset, Phase 2: The Itch,
                      Phase 3: Rebuilding Focus, and Phase 4: The New Normal — is heading to your inbox.
                    </p>
                  </div>
                )}
              </div>

              {/* Retake */}
              <div className="px-10 py-7">
                <button
                  onClick={() => {
                    setStep(0); setAnswers(initAnswers())
                    setEmailSent(false); setEmail(''); setSaving(false); setNewsletter(false)
                  }}
                  className="w-full border border-neutral-300 bg-white text-neutral-600 text-xs font-bold tracking-widest uppercase py-3.5 hover:border-neutral-600 hover:text-neutral-900 transition-colors">
                  Retake Assessment
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL REUSABLE PIECES
───────────────────────────────────────────────────────────────────────────── */

function StepHeader({ step, total }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-neutral-400 font-light tracking-wide">Step {step} of {total}</p>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1 w-5 transition-colors duration-300 ${i < step ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
        ))}
      </div>
    </div>
  )
}

function NavRow({ onBack, onNext, canNext, nextLabel = 'Next' }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button onClick={onBack}
        className="text-xs tracking-widest uppercase text-neutral-400 hover:text-neutral-900 transition-colors font-bold flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M8 2L3 6l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <button onClick={onNext} disabled={!canNext}
        className={`bg-[#1A1A1A] text-white text-xs font-bold tracking-widest uppercase py-3 px-6 hover:bg-black transition-colors
                    ${!canNext ? 'opacity-25 cursor-not-allowed' : ''}`}>
        {nextLabel}
      </button>
    </div>
  )
}

function RadioDot({ active }) {
  return (
    <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center
                      transition-colors duration-150 ${active ? 'border-emerald-600' : 'border-neutral-300'}`}>
      {active && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
    </span>
  )
}

function CheckBox({ active }) {
  return (
    <span className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors duration-150
                      ${active ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-300'}`}>
      {active && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  )
}
