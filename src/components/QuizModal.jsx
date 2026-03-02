import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { computeRadarScores } from '../lib/scores'
import SovereigntyRadar from './SovereigntyRadar'

/* ─────────────────────────────────────────────────────────────────────────────
   STEP MAP
   0  → Intro
   1  → Data Audit (manual screen-time entry — optional)
   2  → Q1  Usage hours  (SKIPPED if Audit was filled)
   3  → Q2  Usage categories  (ranked)
   4  → Q2b Sub-categories    (conditional)
   5  → Q3a When (time of day)
   6  → Q3b Where (context)
   7  → Q4  Impact
   8  → Q5  Severity
   9  → Attention span test
   10 → Results
───────────────────────────────────────────────────────────────────────────── */

const MAX_STEPS = 8   // displayed in progress bar (excl intro, audit, results)

/* ── Q1 ──────────────────────────────────────────────────────────────────── */
const Q1_OPTIONS = [
  { key: 'lt2',      label: 'Under 2 hours' },
  { key: '2to4',     label: '2 – 4 hours'   },
  { key: '4to6',     label: '4 – 6 hours'   },
  { key: '6to8',     label: '6 – 8 hours'   },
  { key: 'gt8',      label: '8+ hours'       },
  { key: 'not_sure', label: 'Not sure'       },
]

/* ── Q2 — ranked ─────────────────────────────────────────────────────────── */
const Q2_OPTIONS = [
  { key: 'work_admin',   label: 'Work / Life Admin',        desc: 'Emails, sorting finances, life logistics, staying on top of tasks' },
  { key: 'social_doom',  label: 'Social Doomscrolling',     desc: 'Passively flicking through X, TikTok, Instagram, Facebook, YouTube Reels' },
  { key: 'own_social',   label: 'Your Own Social Network',  desc: 'Seeing what friends are up to, messaging, posting your own content' },
  { key: 'games_videos', label: 'Games & Videos',           desc: 'YouTube deep-dives, gaming, streaming, content rabbit holes' },
  { key: 'utility',      label: 'Utility',                  desc: 'Maps, banking, calendar, travel — functional use with little excess' },
  { key: 'not_sure',     label: 'Not sure',                 desc: 'I genuinely cannot identify a clear pattern' },
]

/* ── Q2b sub-categories ──────────────────────────────────────────────────── */
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
      { key: 'youtube',   label: 'YouTube long-form videos' },
      { key: 'streaming', label: 'Netflix / streaming on phone' },
      { key: 'mobile_games', label: 'Mobile games' },
      { key: 'podcasts',  label: 'Podcasts / audio content' },
    ],
  },
}

/* ── Q3a ─────────────────────────────────────────────────────────────────── */
const Q3A_OPTIONS = [
  { key: 'morning',    label: 'First thing in the morning (before getting up)' },
  { key: 'commute',    label: 'During commute or travel' },
  { key: 'work_hours', label: 'During work / study hours' },
  { key: 'lunch',      label: 'Lunch & breaks' },
  { key: 'evening',    label: 'Evening (after work, before bed)' },
  { key: 'night',      label: 'Late at night / in bed' },
]

/* ── Q3b ─────────────────────────────────────────────────────────────────── */
const Q3B_OPTIONS = [
  { key: 'bed',       label: 'In bed' },
  { key: 'bathroom',  label: 'In the bathroom' },
  { key: 'desk',      label: 'At my desk while working' },
  { key: 'sofa',      label: 'On the sofa / relaxing at home' },
  { key: 'social',    label: 'While with other people (social settings)' },
  { key: 'outside',   label: 'Outside / walking' },
]

/* ── Q4 ─────────────────────────────────────────────────────────────────── */
const Q4_OPTIONS = [
  { key: 'sleep',     label: 'Sleep quality' },
  { key: 'focus',     label: 'Ability to focus on deep work' },
  { key: 'attention', label: 'Attention span & reading ability' },
  { key: 'relations', label: 'Relationships & in-person connections' },
  { key: 'fitness',   label: 'Physical fitness & health habits' },
  { key: 'not_sure',  label: 'Not sure / all of the above' },
]

/* ── Q5 ─────────────────────────────────────────────────────────────────── */
const Q5_OPTIONS = [
  { key: 'mild',     label: 'Mild — I notice it but it doesn\'t really bother me' },
  { key: 'moderate', label: "Moderate — it's affecting my daily life noticeably" },
  { key: 'severe',   label: 'Severe — it\'s a real problem I need to fix' },
  { key: 'crisis',   label: 'Crisis — it\'s significantly damaging my life' },
]

/* ── Attention passage ───────────────────────────────────────────────────── */
const ATTENTION_PASSAGE = `Researchers studying sustained attention have found that the average person now checks their phone within three minutes of waking up. This single behaviour — reaching for a device before the prefrontal cortex has fully activated — sets a neurological template for the rest of the day. Each check primes the brain to expect another hit of stimulation, reducing tolerance for slower, less stimulating activities like reading, deep thinking, and face-to-face conversation.

The consequences compound invisibly. Unlike obvious addictions, phone dependency rarely announces itself through dramatic failure. Instead, it quietly erodes the quality of your thinking, your relationships, and your capacity for genuine rest. Most people only notice the damage when they attempt to stop.`

/* ── Result copy ─────────────────────────────────────────────────────────── */
const BRIEF_INSIGHT = {
  work_admin:   'Your phone use is tangled into your productivity identity — the same device that earns you money is also costing you your best thinking hours.',
  social_doom:  'Passive consumption is the hardest loop to break because there is no clear goal to satisfy. The feed is engineered to never end.',
  own_social:   'Social validation loops are neurologically identical to gambling. The variable reward of likes and reactions fires the same dopamine pathways.',
  games_videos: 'Escapist content use is often a symptom, not the cause. The real question is what discomfort is the content helping you avoid.',
  utility:      'Utility users often underestimate their dependency because each individual use feels justified. The pattern is in the aggregate.',
  not_sure:     'Uncertainty about your own usage patterns suggests the behaviour is largely automatic — which is precisely what makes it difficult to interrupt.',
}

const IMPACT_SUPPLEMENT = {
  sleep:     'Disrupted sleep is the fastest route to cognitive decline. Every night of poor sleep compounds the attention deficit.',
  focus:     'Fragmented focus is not a personality trait — it is a trained response to constant interruption. It can be retrained.',
  attention: 'Shortened attention span affects your ability to read deeply, think creatively, and sustain any effortful mental task.',
  relations: 'Phubbing — phone use in social settings — is one of the most reliable predictors of relationship dissatisfaction.',
  fitness:   'Sedentary phone time displaces physical activity. The body and the attention system both recover through movement.',
  not_sure:  'Widespread impact across multiple life areas is a signal of a systemic problem, not an isolated one.',
}

/* ── Attention categorisation ────────────────────────────────────────────── */
function categoriseAttention(seconds) {
  if (seconds < 30)  return { label: 'Severely Fragmented', detail: 'Under 30 seconds. Significant attentional damage — this is the most common profile in heavy users.' }
  if (seconds < 60)  return { label: 'Heavily Fragmented',  detail: '30–60 seconds. Your focus window is well below baseline. Recovery is achievable with structured practice.' }
  if (seconds < 120) return { label: 'Moderately Intact',   detail: '1–2 minutes. Some fragmentation, but the baseline is still workable.' }
  if (seconds < 300) return { label: 'Healthy Range',       detail: '2–5 minutes. Solid sustained attention. Refinement rather than recovery is your path.' }
  return               { label: 'Exceptional Focus',        detail: '5+ minutes. Your attention span is well above average. Maintenance is your primary goal.' }
}

/* ── Misc helpers ────────────────────────────────────────────────────────── */
function generateRef() {
  return `MSA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`
}

const Q2_LABEL = { work_admin:'Work/Admin', social_doom:'Social Doomscrolling', own_social:'Own Social', games_videos:'Games & Videos', utility:'Utility', not_sure:'Not sure' }
const Q4_LABEL = { sleep:'Sleep', focus:'Deep Work', attention:'Attention Span', relations:'Relationships', fitness:'Fitness', not_sure:'Multiple areas' }
const Q5_LABEL = { mild:'Mild', moderate:'Moderate', severe:'Severe', crisis:'Crisis' }
const Q1_LABEL = { lt2:'Under 2h', '2to4':'2–4h', '4to6':'4–6h', '6to8':'6–8h', gt8:'8+h', not_sure:'Not sure' }

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function QuizModal({ isOpen, onClose }) {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState({
    q1: null, q2_ranked: [], q2b: [], q3a: [], q3b: [],
    q4: null, q5: null, attentionSec: null, auditData: null,
  })

  // Per-question temp state
  const [tempSingle,  setTempSingle]  = useState(null)
  const [tempRanked,  setTempRanked]  = useState([])
  const [tempMulti,   setTempMulti]   = useState([])

  // Data audit step
  const [auditHours,   setAuditHours]   = useState('')
  const [auditPickups, setAuditPickups] = useState('')

  // Attention test
  const [testPhase,       setTestPhase]       = useState('idle')
  const testStartRef                          = useRef(null)
  const [attentionResult, setAttentionResult] = useState(null)

  // Email / submit
  const [email,        setEmail]        = useState('')
  const [newsletter,   setNewsletter]   = useState(false)
  const [emailSent,    setEmailSent]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  // Misc
  const [refNum] = useState(generateRef)

  // ── Derived ───────────────────────────────────────────────────────────────
  const auditFilled   = !!(auditHours.trim() || auditPickups.trim())
  const isSkippingQ2b = step === 3
    ? tempRanked[0] === 'utility' || tempRanked[0] === 'not_sure'
    : answers.q2_ranked?.[0] === 'utility' || answers.q2_ranked?.[0] === 'not_sure'

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStep(0)
      setAnswers({ q1: null, q2_ranked: [], q2b: [], q3a: [], q3b: [], q4: null, q5: null, attentionSec: null, auditData: null })
      setTempSingle(null); setTempRanked([]); setTempMulti([])
      setAuditHours(''); setAuditPickups('')
      setTestPhase('idle'); testStartRef.current = null; setAttentionResult(null)
      setEmail(''); setNewsletter(false); setEmailSent(false); setSaving(false)
    }
  }, [isOpen])

  // ── Pre-fill temp on step change ──────────────────────────────────────────
  useEffect(() => {
    if      (step === 2) setTempSingle(answers.q1)
    else if (step === 3) setTempRanked([...answers.q2_ranked])
    else if (step === 4) setTempMulti([...answers.q2b])
    else if (step === 5) setTempMulti([...answers.q3a])
    else if (step === 6) setTempMulti([...answers.q3b])
    else if (step === 7) setTempSingle(answers.q4)
    else if (step === 8) setTempSingle(answers.q5)
    else { setTempSingle(null); setTempRanked([]); setTempMulti([]) }
    if (step === 9) { setTestPhase('idle'); testStartRef.current = null; setAttentionResult(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (!isOpen) return null

  const isIntro   = step === 0
  const isAudit   = step === 1
  const isResults = step === 10
  const progress  = isIntro || isAudit ? 0 : isResults ? 100 : ((step - 1) / MAX_STEPS) * 100

  // ── canProceed ────────────────────────────────────────────────────────────
  function canProceed() {
    if (step === 2) return tempSingle !== null
    if (step === 3) return tempRanked.length >= 1
    if (step === 4) return tempMulti.length >= 1
    if (step === 5) return tempMulti.length >= 1
    if (step === 6) return tempMulti.length >= 1
    if (step === 7) return tempSingle !== null
    if (step === 8) return tempSingle !== null
    if (step === 9) return attentionResult !== null
    return false
  }

  // ── handleNext ────────────────────────────────────────────────────────────
  function handleNext() {
    if (!canProceed()) return
    setAnswers(prev => {
      const upd = { ...prev }
      if (step === 2) upd.q1         = tempSingle
      if (step === 3) upd.q2_ranked  = tempRanked
      if (step === 4) upd.q2b        = tempMulti
      if (step === 5) upd.q3a        = tempMulti
      if (step === 6) upd.q3b        = tempMulti
      if (step === 7) upd.q4         = tempSingle
      if (step === 8) upd.q5         = tempSingle
      if (step === 9) upd.attentionSec = attentionResult?.seconds ?? null
      return upd
    })
    // Skip Q2b for utility/not_sure ranked first
    if (step === 3 && isSkippingQ2b) { setStep(5); return }
    setStep(s => s + 1)
  }

  // ── handleBack ────────────────────────────────────────────────────────────
  function handleBack() {
    if (step <= 1) return
    if (step === 5 && (answers.q2_ranked?.[0] === 'utility' || answers.q2_ranked?.[0] === 'not_sure')) { setStep(3); return }
    setStep(s => s - 1)
  }

  // ── Ranked / multi helpers ────────────────────────────────────────────────
  function toggleRank(key) {
    setTempRanked(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  function toggleMulti(key) {
    setTempMulti(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  function toggleMultiMax2(key) {
    setTempMulti(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= 2)   return prev
      return [...prev, key]
    })
  }

  // ── Attention test ────────────────────────────────────────────────────────
  function startTest() { testStartRef.current = Date.now(); setTestPhase('reading') }
  function recordWander() {
    const secs = Math.round((Date.now() - testStartRef.current) / 1000)
    setAttentionResult({ seconds: secs, ...categoriseAttention(secs) })
    setTestPhase('done')
  }
  function recordFinished() {
    const secs = Math.round((Date.now() - testStartRef.current) / 1000)
    setAttentionResult({ seconds: secs, ...categoriseAttention(secs + 9999) })
    setTestPhase('done')
  }

  // ── Email submit ──────────────────────────────────────────────────────────
  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email.trim() || saving) return
    setSaving(true)

    const finalAnswers = { ...answers, auditData: auditFilled ? { hours: auditHours, pickups: auditPickups } : null }
    const radarScores  = computeRadarScores(finalAnswers)
    const primaryMagnet = answers.q2_ranked?.[0] ?? null

    const { error } = await supabase.from('quiz_submissions').insert({
      email:                  email.trim().toLowerCase(),
      primary_magnet:         primaryMagnet,
      profile_type:           primaryMagnet,
      radar_scores:           radarScores,
      audit_data:             finalAnswers.auditData,
      newsletter_subscribed:  newsletter,
    })
    if (error) console.error('quiz_submissions insert error:', error)

    setSaving(false)
    setEmailSent(true)
  }

  // ── Derived result data ───────────────────────────────────────────────────
  const { q1, q2_ranked, q4, q5, attentionSec } = answers
  const topCategory  = q2_ranked?.[0]
  const attentionCat = attentionSec != null ? categoriseAttention(attentionSec) : null
  const today        = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const subCatData   = topCategory ? SUBCATEGORIES[topCategory] : null
  const radarScores  = isResults ? computeRadarScores({ ...answers, auditData: auditFilled ? { hours: auditHours, pickups: auditPickups } : null }) : null

  // ── Shared styles ─────────────────────────────────────────────────────────
  function optionClass(active) {
    return [
      'w-full text-left px-5 py-3.5 border text-sm font-sans font-light',
      'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500',
      active
        ? 'border-emerald-600 bg-emerald-50 text-neutral-900'
        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900',
    ].join(' ')
  }

  function RadioDot({ active }) {
    return (
      <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center
                        transition-colors duration-150 ${active ? 'border-emerald-600' : 'border-neutral-300'}`}>
        {active && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
      </span>
    )
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
         role="dialog" aria-modal="true" aria-label="Digital Health Assessment">
      <div className="absolute inset-0 bg-[#1A1A1A]/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className={`relative bg-[#F2F0ED] w-full shadow-2xl flex flex-col overflow-hidden border border-neutral-300
                       ${isResults ? 'max-w-2xl max-h-[92vh]' : 'max-w-lg'}`}>

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

        <div className={`${isResults ? 'overflow-y-auto overscroll-contain' : ''} flex-1`}>

          {/* ═══════════════════════════  INTRO  ════════════════════════════ */}
          {isIntro && (
            <div className="px-10 py-12 space-y-5">
              <div className="space-y-1">
                <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">
                  Basic Assessment
                </p>
                <p className="text-xs text-neutral-400 font-light">8 questions · ~5 minutes</p>
              </div>

              <h2 className="font-display font-black text-3xl text-neutral-900 leading-tight tracking-tight">
                Your Digital Health Profile
              </h2>

              <p className="text-sm text-neutral-500 font-light leading-relaxed">
                Answer honestly — there are no right or wrong answers. The more accurate
                your responses, the more useful your personalised profile will be.
              </p>

              <div className="bg-white border border-neutral-200 px-5 py-4 space-y-1">
                <p className="text-xs font-bold text-neutral-500">Coming soon: Advanced Assessment</p>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  Upload a screenshot of your iOS Screen Time or Android Digital Wellbeing
                  report for a deeper, data-driven analysis — no manual input required.
                </p>
              </div>

              <button onClick={() => setStep(1)}
                className="w-full bg-[#1A1A1A] text-white text-sm font-bold tracking-widest uppercase py-4 hover:bg-black transition-colors mt-2">
                Start Assessment
              </button>
            </div>
          )}

          {/* ═══════════════════════════  DATA AUDIT  ═══════════════════════ */}
          {isAudit && (
            <div className="px-10 py-10 space-y-6">
              <div className="space-y-1">
                <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Phase 01 · Optional</p>
                <h2 className="font-display font-black text-2xl text-neutral-900 leading-snug tracking-tight">
                  Data Audit
                </h2>
                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                  If you have your Screen Time data handy, enter it below for a more accurate
                  analysis. This skips the usage estimate question.
                </p>
              </div>

              {/* How to find screen time — help note */}
              <div className="bg-white border border-neutral-200 px-5 py-4 space-y-2">
                <p className="text-xs font-bold text-neutral-500">How to find your data</p>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  <strong className="text-neutral-600">iOS:</strong> Settings → Screen Time → See All Activity.<br />
                  <strong className="text-neutral-600">Android:</strong> Settings → Digital Wellbeing &amp; Parental Controls.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs tracking-widest uppercase text-neutral-400 font-light">Daily hours</label>
                  <input
                    type="number" min="0" max="24" placeholder="e.g. 5"
                    value={auditHours} onChange={e => setAuditHours(e.target.value)}
                    className="w-full bg-white border border-neutral-200 px-4 py-3 text-sm font-sans text-neutral-900
                               placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs tracking-widest uppercase text-neutral-400 font-light">Daily pickups</label>
                  <input
                    type="number" min="0" max="999" placeholder="e.g. 80"
                    value={auditPickups} onChange={e => setAuditPickups(e.target.value)}
                    className="w-full bg-white border border-neutral-200 px-4 py-3 text-sm font-sans text-neutral-900
                               placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <button
                  onClick={() => {
                    setAnswers(prev => ({ ...prev, auditData: auditFilled ? { hours: auditHours, pickups: auditPickups } : null }))
                    // If audit filled → skip Q1 (step 2), go straight to Q2 (step 3)
                    setStep(auditFilled ? 3 : 2)
                  }}
                  className="w-full bg-[#1A1A1A] text-white text-sm font-bold tracking-widest uppercase py-4 hover:bg-black transition-colors">
                  {auditFilled ? 'Continue with my data' : 'Continue'}
                </button>
                <button onClick={() => setStep(2)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors underline underline-offset-2 font-light">
                  Skip — I'll answer manually
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════  Q1 — Usage  ═══════════════════════ */}
          {step === 2 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={1} total={MAX_STEPS} />
              <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                On average, how many hours does your screen time report show per day?
              </h2>
              <ul className="space-y-2" role="radiogroup">
                {Q1_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button role="radio" aria-checked={tempSingle === opt.key}
                      onClick={() => setTempSingle(opt.key)}
                      className={optionClass(tempSingle === opt.key)}>
                      <span className="flex items-center gap-3">
                        <RadioDot active={tempSingle === opt.key} />
                        {opt.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  Q2 — Ranked  ══════════════════════ */}
          {step === 3 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 1 : 2} total={MAX_STEPS} />
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  What draws you to your phone most?
                </h2>
                <p className="text-sm text-neutral-400 font-light">Click to rank from most to least — your top choice first.</p>
              </div>
              <ul className="space-y-2">
                {Q2_OPTIONS.map(opt => {
                  const rank   = tempRanked.indexOf(opt.key)
                  const ranked = rank !== -1
                  return (
                    <li key={opt.key}>
                      <button onClick={() => toggleRank(opt.key)}
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
              {tempRanked.length > 0 && (
                <p className="text-xs text-neutral-400 font-light">
                  {tempRanked.length === Q2_OPTIONS.length ? 'All ranked — click any to reorder.' : `${tempRanked.length} ranked. Keep going or tap Next.`}
                </p>
              )}
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  Q2b — Sub-categories  ═════════════ */}
          {step === 4 && subCatData && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 2 : 3} total={MAX_STEPS} />
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  {subCatData.question}
                </h2>
                <p className="text-sm text-neutral-400 font-light">Select up to two.</p>
              </div>
              <ul className="space-y-2" role="group">
                {subCatData.options.map(opt => {
                  const active   = tempMulti.includes(opt.key)
                  const disabled = !active && tempMulti.length >= 2
                  return (
                    <li key={opt.key}>
                      <button onClick={() => toggleMultiMax2(opt.key)} disabled={disabled}
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
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  Q3a — When  ═══════════════════════ */}
          {step === 5 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 3 : 4} total={MAX_STEPS} />
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  When during the day is your phone most glued to your hand?
                </h2>
                <p className="text-sm text-neutral-400 font-light">Tick all that apply.</p>
              </div>
              <ul className="space-y-2" role="group">
                {Q3A_OPTIONS.map(opt => {
                  const active = tempMulti.includes(opt.key)
                  return (
                    <li key={opt.key}>
                      <button onClick={() => toggleMulti(opt.key)} className={optionClass(active)}>
                        <span className="flex items-center gap-3"><CheckBox active={active} />{opt.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  Q3b — Where  ══════════════════════ */}
          {step === 6 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 4 : 5} total={MAX_STEPS} />
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                  Where does the habit kick in most?
                </h2>
                <p className="text-sm text-neutral-400 font-light">Tick all that apply.</p>
              </div>
              <ul className="space-y-2" role="group">
                {Q3B_OPTIONS.map(opt => {
                  const active = tempMulti.includes(opt.key)
                  return (
                    <li key={opt.key}>
                      <button onClick={() => toggleMulti(opt.key)} className={optionClass(active)}>
                        <span className="flex items-center gap-3"><CheckBox active={active} />{opt.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  Q4 — Impact  ══════════════════════ */}
          {step === 7 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 5 : 6} total={MAX_STEPS} />
              <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                What part of your non-phone life is feeling the most neglected?
              </h2>
              <ul className="space-y-2" role="radiogroup">
                {Q4_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button role="radio" aria-checked={tempSingle === opt.key}
                      onClick={() => setTempSingle(opt.key)} className={optionClass(tempSingle === opt.key)}>
                      <span className="flex items-center gap-3"><RadioDot active={tempSingle === opt.key} />{opt.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  Q5 — Severity  ════════════════════ */}
          {step === 8 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 6 : 7} total={MAX_STEPS} />
              <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                How severe is this problem for you, honestly?
              </h2>
              <ul className="space-y-2" role="radiogroup">
                {Q5_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button role="radio" aria-checked={tempSingle === opt.key}
                      onClick={() => setTempSingle(opt.key)} className={optionClass(tempSingle === opt.key)}>
                      <span className="flex items-center gap-3"><RadioDot active={tempSingle === opt.key} />{opt.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <NavRow onBack={handleBack} onNext={handleNext} canNext={canProceed()} />
            </div>
          )}

          {/* ═══════════════════════════  ATTENTION TEST  ════════════════════ */}
          {step === 9 && (
            <div className="px-10 py-10 space-y-6">
              <StepHeader step={auditFilled ? 7 : 8} total={MAX_STEPS} />

              {testPhase === 'idle' && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">Attention span check</h2>
                    <p className="text-sm text-neutral-400 font-light leading-relaxed">
                      Read the passage below. The moment you notice your mind wandering — even slightly — hit the button. We'll time it. No judgment, just data.
                    </p>
                  </div>
                  <div className="bg-white border border-neutral-200 px-6 py-5 text-sm text-neutral-500 font-light leading-relaxed whitespace-pre-line">
                    {ATTENTION_PASSAGE}
                  </div>
                  <button onClick={startTest}
                    className="w-full bg-[#1A1A1A] text-white text-sm font-bold tracking-widest uppercase py-4 hover:bg-black transition-colors">
                    I'm ready — start the clock
                  </button>
                </div>
              )}

              {testPhase === 'reading' && (
                <div className="space-y-5">
                  <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                    Reading… hit the button the moment your mind drifts.
                  </h2>
                  <div className="bg-white border border-neutral-200 px-6 py-5 text-sm text-neutral-500 font-light leading-relaxed whitespace-pre-line">
                    {ATTENTION_PASSAGE}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={recordWander}
                      className="flex-1 bg-[#1A1A1A] text-white px-6 py-4 text-sm tracking-widest uppercase font-bold hover:bg-black transition-colors">
                      My mind just wandered
                    </button>
                    <button onClick={recordFinished}
                      className="flex-1 border border-neutral-300 bg-white text-neutral-600 px-6 py-4 text-xs tracking-widest uppercase font-bold hover:border-neutral-600 transition-colors">
                      I finished reading
                    </button>
                  </div>
                </div>
              )}

              {testPhase === 'done' && attentionResult && (
                <div className="space-y-5">
                  <h2 className="font-display font-bold text-2xl text-neutral-900">Your attention result</h2>
                  <div className="border border-emerald-200 bg-emerald-50 px-6 py-5 space-y-1">
                    <p className="font-display font-bold text-xl text-emerald-700">{attentionResult.label}</p>
                    <p className="text-sm text-neutral-500 font-light">{attentionResult.detail}</p>
                    {attentionResult.seconds < 9000 && (
                      <p className="text-xs text-neutral-400 font-mono mt-1">Time to distraction: {attentionResult.seconds}s</p>
                    )}
                  </div>
                  <NavRow onBack={handleBack} onNext={handleNext} canNext={true} nextLabel="See My Profile" />
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════  RESULTS  ══════════════════════════ */}
          {isResults && (
            <div className="divide-y divide-neutral-200">

              {/* Letterhead */}
              <div className="px-10 py-8 flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs tracking-widest uppercase text-neutral-400 font-light mb-1.5">Mind Sovereignty</p>
                  <h2 className="font-display font-black text-2xl text-neutral-900 tracking-tight">Your Digital Health Profile</h2>
                  <p className="text-sm text-emerald-600 font-medium mt-1">
                    {Q2_LABEL[topCategory] || 'Personalised Plan'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-neutral-300 font-light">{today}</p>
                  <p className="text-xs text-neutral-200 font-mono mt-0.5">{refNum}</p>
                </div>
              </div>

              {/* Profile summary */}
              <div className="px-10 py-7">
                <p className="text-xs tracking-widest uppercase text-neutral-400 font-light mb-5">Your Profile</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  {auditFilled
                    ? <ProfileField label="Daily Usage (reported)" value={`${auditHours}h · ${auditPickups} pickups`} wide />
                    : <ProfileField label="Daily Usage"     value={Q1_LABEL[q1]} />
                  }
                  <ProfileField label="Primary Driver"  value={Q2_LABEL[topCategory]} />
                  <ProfileField label="Neglected Area"  value={Q4_LABEL[q4]} />
                  <ProfileField label="Severity"        value={Q5_LABEL[q5]} />
                  {attentionCat && <ProfileField label="Attention Span" value={attentionCat.label} wide />}
                </div>
              </div>

              {/* Sovereignty Radar */}
              <div className="px-10 py-7 space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">01</span>
                  <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Sovereignty Profile</p>
                </div>
                <SovereigntyRadar scores={radarScores} />
              </div>

              {/* Key Insight */}
              <div className="px-10 py-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">02</span>
                  <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Key Insight</p>
                </div>
                <p className="text-base text-neutral-600 font-light leading-relaxed">
                  {BRIEF_INSIGHT[topCategory]}
                </p>
                {q4 && IMPACT_SUPPLEMENT[q4] && (
                  <p className="text-base text-neutral-600 font-light leading-relaxed">
                    {IMPACT_SUPPLEMENT[q4]}
                  </p>
                )}
                <div className="bg-white border border-neutral-200 px-5 py-4 space-y-1 mt-2">
                  <p className="text-xs font-bold text-neutral-500">Your full neurological report includes:</p>
                  <ul className="text-xs text-neutral-400 font-light space-y-0.5 list-disc list-inside">
                    <li>Identified neurological mechanism & how to reset it</li>
                    <li>Personalised 4-week recovery programme</li>
                    <li>Tool recommendations specific to your profile</li>
                    <li>Attention span training protocol</li>
                  </ul>
                </div>
              </div>

              {/* Email capture */}
              <div className="px-10 py-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-neutral-300">03</span>
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
                    {/* Newsletter checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span
                        onClick={() => setNewsletter(n => !n)}
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
                    <p className="text-base font-display font-bold text-white">Sovereignty Plan Secured.</p>
                    <p className="text-xs text-white/55 font-light leading-relaxed">
                      Your 4-week recovery roadmap — Intent Audit, Sovereignty Gates,
                      System Blackout, and Sovereignty Architecture — is on its way to your inbox.
                    </p>
                  </div>
                )}
              </div>

              {/* Retake */}
              <div className="px-10 py-7">
                <button
                  onClick={() => {
                    setStep(0)
                    setAnswers({ q1: null, q2_ranked: [], q2b: [], q3a: [], q3b: [], q4: null, q5: null, attentionSec: null, auditData: null })
                    setEmailSent(false); setEmail(''); setSaving(false); setNewsletter(false)
                    setAuditHours(''); setAuditPickups('')
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
        className="text-xs tracking-widest uppercase text-neutral-400 hover:text-neutral-900 transition-colors
                   font-bold flex items-center gap-1.5">
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

function ProfileField({ label, value, wide = false }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs tracking-widest uppercase text-neutral-400 font-light mb-0.5">{label}</p>
      <p className="text-sm text-neutral-900 font-light">{value || '—'}</p>
    </div>
  )
}
