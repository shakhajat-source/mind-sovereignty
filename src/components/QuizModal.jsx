import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────────────────────────────────────────
   STEP MAP
   0  → Intro
   1  → Usage       (Hours · Zombie% · Pickups)      [USAGE axis]
   2  → Content     (Donut + 4 linked sliders)        [CONTENT axis]
   3  → Situation   (Checkboxes: 4 options)           [SITUATION axis]
   4  → Impact      (Checkboxes: 5 options)           [IMPACT axis]
   5  → Attention   (Radio: 4 options)                [ATTENTION axis]
   6  → Interests   (Open text — Rat Park Strategy)
   7  → Results     (Radar Chart + Dynamic Report + CTA)
───────────────────────────────────────────────────────────────────────────── */

const MAX_STEPS = 6 // displayed steps 1–6

/* ── Step 1: Usage ───────────────────────────────────────────────────────── */
const HOURS_OPTIONS = [
  { key: '0to2',   label: '0–2 h',   score: 10  },
  { key: '2to4',   label: '2–4 h',   score: 30  },
  { key: '4to6',   label: '4–6 h',   score: 50  },
  { key: '6to8',   label: '6–8 h',   score: 70  },
  { key: '8to10',  label: '8–10 h',  score: 90  },
  { key: 'gt10',   label: '10+ h',   score: 100 },
]
const ZOMBIE_OPTIONS = [
  { key: '0to20',  label: '0–20%',  score: 10  },
  { key: '20to40', label: '20–40%', score: 30  },
  { key: '40to60', label: '40–60%', score: 60  },
  { key: '60to80', label: '60–80%', score: 80  },
  { key: 'gt80',   label: '80%+',   score: 100 },
]
const PICKUP_OPTIONS = [
  { key: '0to50',   label: '0–50',   score: 20  },
  { key: '51to100', label: '51–100', score: 60  },
  { key: 'gt100',   label: '101+',   score: 100 },
]

/* ── Step 2: Content ─────────────────────────────────────────────────────── */
const CONTENT_KEYS = ['social', 'notSure', 'comm', 'utility']
const CONTENT_META = {
  social:  { label: 'Social',   chartColor: '#C0392B', textColor: '#C0392B' },
  notSure: { label: 'Not Sure', chartColor: '#7F8C8D', textColor: '#5a6060' },
  comm:    { label: 'Comm',     chartColor: '#2980B9', textColor: '#2980B9' },
  utility: { label: 'Utility',  chartColor: '#F39C12', textColor: '#b87800' },
}

/* ── Step 3: Situation ───────────────────────────────────────────────────── */
const SITUATION_OPTIONS = [
  { key: 'morning', label: 'Morning'      },
  { key: 'work',    label: 'Work / Study' },
  { key: 'evening', label: 'Evening'      },
  { key: 'bed',     label: 'Before Bed'   },
]

/* ── Step 4: Impact ──────────────────────────────────────────────────────── */
const IMPACT_OPTIONS = [
  { key: 'focus',         label: 'Eroded Focus'        },
  { key: 'time',          label: 'Time Frustration'    },
  { key: 'numbing',       label: 'Emotional Numbing'   },
  { key: 'relationships', label: 'Relationship Strain' },
  { key: 'fatigue',       label: 'Post-Scroll Fatigue' },
]

/* ── Step 5: Attention ───────────────────────────────────────────────────── */
const ATTENTION_OPTIONS = [
  {
    key: 'flow', label: 'Flow State', score: 0,
    desc: "I enter a deep focus and work through the hour without noticing distractions. My phone stays untouched and I finish what I started.",
  },
  {
    key: 'itch', label: 'The Itch', score: 33,
    desc: "I feel a pull to check my phone every 10–15 minutes but can resist it. The urge is there — I'm aware of it — but I stay on task most of the time.",
  },
  {
    key: 'fragmentation', label: 'The Fragmentation', score: 66,
    desc: "I regularly switch between the task and my phone or other tabs. I never fully disconnect. By the end of the hour I've done some work but lost significant time to drift.",
  },
  {
    key: 'reset', label: 'The Reset', score: 100,
    desc: "I can't sustain focus for more than a few minutes. Each time I try to re-engage I get pulled away again. The hour ends with little meaningful progress.",
  },
]

/* ─────────────────────────────────────────────────────────────────────────────
   SCORING
───────────────────────────────────────────────────────────────────────────── */
function computeScores(answers) {
  // USAGE: MAX(hours, zombie, pickups)
  const hScore = HOURS_OPTIONS.find(o => o.key === answers.hours)?.score ?? 0
  const zScore = ZOMBIE_OPTIONS.find(o => o.key === answers.zombie)?.score ?? 0
  const pScore = PICKUP_OPTIONS.find(o => o.key === answers.pickups)?.score ?? 0
  const usage  = Math.max(hScore, zScore, pScore)

  // CONTENT: social% + notSure% (cap 100)
  const content = Math.min(100, (answers.content.social ?? 0) + (answers.content.notSure ?? 0))

  // SITUATION: checkedCount × 25
  const situation = Math.min(100, answers.situation.length * 25)

  // IMPACT: checkedCount × 20
  const impact = Math.min(100, answers.impact.length * 20)

  // ATTENTION: from radio selection
  const attention = ATTENTION_OPTIONS.find(o => o.key === answers.attention)?.score ?? 0

  return { usage, content, situation, impact, attention }
}

/* ─────────────────────────────────────────────────────────────────────────────
   COACHING INSIGHT GENERATORS
───────────────────────────────────────────────────────────────────────────── */
function getUsageInsight(answers) {
  const hScore = HOURS_OPTIONS.find(o => o.key === answers.hours)?.score ?? 0
  const zScore = ZOMBIE_OPTIONS.find(o => o.key === answers.zombie)?.score ?? 0
  const pScore = PICKUP_OPTIONS.find(o => o.key === answers.pickups)?.score ?? 0
  const max = Math.max(hScore, zScore, pScore)
  // Priority: hours → zombie → pickups
  if (max === hScore) {
    return "Your raw exposure duration is the primary load on your attention architecture. At this volume, device use is not supplementing your life — it has become the primary activity structuring your waking hours."
  }
  if (max === zScore) {
    return "The majority of your screen time is classified as unintentional. You are not directing your device — the device is summoning you. This is the structural definition of a conditioned behavior loop, not a choice."
  }
  return "Your pickup frequency is the dominant risk signal. Each unlock event disrupts your cognitive state and initiates a full attention reset — a cost that compounds across hundreds of daily interruptions."
}

function getContentInsight(content) {
  if (content.social > 50) {
    return "Social content constitutes the majority of your consumption profile. Algorithmic feeds operate on variable-ratio reinforcement — the most powerful conditioning schedule in behavioral psychology. Your dopamine baseline has been recalibrated to engineered novelty."
  }
  if (content.notSure > 25) {
    return "A significant portion of your usage cannot be categorized. Unconscious consumption is operationally more dangerous than deliberate use — you cannot interrupt a pattern you have not yet identified. Awareness is the first required intervention."
  }
  if (content.comm > 40) {
    return "Communication apps are your primary content vector. The social contract of instant availability creates a state of chronic low-grade vigilance that is neurologically equivalent to a sustained, low-intensity threat response."
  }
  if (content.utility > 50) {
    return "High utility usage often masks compulsive checking behavior. Legitimate functional needs rarely require this volume of device interaction. The device has likely colonized the utility frame to justify non-functional use."
  }
  return "Your content profile is distributed across multiple categories with no single dominant vector. Your risk is driven by aggregate volume rather than a specific content dependency — a pattern that requires scheduling intervention rather than app removal."
}

function getSituationInsight(situation) {
  const score = situation.length * 25
  if (score >= 75) {
    return "Your device has colonized nearly every temporal context of your day. There are no protected cognitive windows remaining. Recovery requires deliberate architectural changes to your daily schedule before any behavioral intervention can hold."
  }
  if (situation.includes('morning')) {
    return "Morning phone use is the highest-leverage intervention point on this profile. The first cortisol wave of the day sets your neurological operating state. Initiating with a stimulus-rich screen establishes fragmentation as your cognitive baseline before the day has begun."
  }
  if (situation.includes('bed')) {
    return "Pre-sleep device use is measurably degrading your sleep architecture. Blue light suppresses melatonin synthesis, and social stimulation activates the default mode network precisely when it needs to be deactivating. This compounds every other cognitive deficit on this report."
  }
  if (situation.includes('work')) {
    return "Device interruptions during productive hours produce an average 23-minute recovery cost per episode. At your reported frequency, this is not distraction — it is the structural elimination of deep work capacity."
  }
  return "Evening usage is the most common entry point for compulsive loops. Reduced cognitive control in the evening hours combined with lower-stakes time perception creates optimal conditions for extended unintentional sessions."
}

function getImpactInsight(impact) {
  const score = impact.length * 20
  if (score >= 80) {
    return "Device use is producing cascading damage across multiple life domains simultaneously. When the impact profile extends this broadly, the device is no longer a tool being misused — it has become the organizing principle of dysfunction."
  }
  if (impact.includes('numbing')) {
    return "Emotional numbing is the most diagnostically significant item on this profile. Using the device as an affect-regulation mechanism prevents natural emotional processing and creates a feedback loop where authentic experience becomes intolerable by comparison."
  }
  if (impact.includes('fatigue')) {
    return "Post-scroll fatigue indicates your reward circuitry is running at a deficit. You are completing consumption sessions more depleted than when you began — a reliable marker of dopaminergic depletion, not fulfillment."
  }
  if (impact.includes('relationships')) {
    return "Reported relationship strain is the leading behavioral indicator that usage has crossed into measurable life damage. Social bonds require presence; consistent device use signals to the people around you — and to your own nervous system — that the device is the priority relationship."
  }
  return "The impacts you have identified represent direct cognitive and behavioral costs of your current usage pattern. Each area flagged is a concrete levy on your time and attentional capacity."
}

function getAttentionInsight(attention) {
  if (attention === 'reset') {
    return "Critically fragmented. Your attention architecture has adapted to constant interruption as its baseline state. Sustained focus now produces discomfort — a neurological withdrawal response. Restoration requires deliberate, progressive re-exposure to uninterrupted cognitive work."
  }
  if (attention === 'fragmentation') {
    return "Continuous partial attention. You are operating in a state of permanent semi-engagement — simultaneously present everywhere and nowhere. This is neurologically more costly than full focus or full rest, and is the chronic operating mode of cognitive depletion."
  }
  if (attention === 'itch') {
    return "The Itch phase. You retain structural capacity for focus but experience compulsive pull-away urges. The attentional architecture is intact; the conditioning is not. This is the most recoverable position on the attention spectrum — the intervention window is open."
  }
  if (attention === 'flow') {
    return "Resilient focus. Your attentional capacity is largely preserved. Your risk profile is concentrated in other domains on this assessment. Protecting this capacity should be treated as a priority asset — it is the first thing lost and the last thing recovered."
  }
  return "Attention state unrecorded."
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONTENT SLIDER ADJUSTMENT (always sums to 100)
───────────────────────────────────────────────────────────────────────────── */
function adjustContentSliders(prev, key, rawVal) {
  const clamped = Math.max(0, Math.min(100, Math.round(rawVal)))
  const others  = CONTENT_KEYS.filter(k => k !== key)
  const remaining = 100 - clamped

  if (remaining <= 0) {
    const result = { social: 0, notSure: 0, comm: 0, utility: 0 }
    result[key] = 100
    return result
  }

  const nonZero    = others.filter(k => prev[k] > 0)
  const result     = { ...prev, [key]: clamped }

  if (nonZero.length === 0) {
    const share = Math.floor(remaining / others.length)
    others.forEach((k, i) => {
      result[k] = i === others.length - 1
        ? remaining - share * (others.length - 1)
        : share
    })
    return result
  }

  const nonZeroSum = nonZero.reduce((s, k) => s + prev[k], 0)
  let distributed  = 0
  nonZero.forEach((k, i) => {
    if (i < nonZero.length - 1) {
      const share = Math.round((prev[k] / nonZeroSum) * remaining)
      result[k]    = Math.max(0, share)
      distributed += result[k]
    } else {
      result[k] = Math.max(0, remaining - distributed)
    }
  })
  others.filter(k => prev[k] === 0).forEach(k => { result[k] = 0 })

  return result
}

/* ─────────────────────────────────────────────────────────────────────────────
   MISC HELPERS
───────────────────────────────────────────────────────────────────────────── */
function generateRef() {
  return `MSA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function initAnswers() {
  return {
    hours:     null,
    zombie:    null,
    pickups:   null,
    content:   { social: 25, notSure: 25, comm: 25, utility: 25 },
    situation: [],
    impact:    [],
    attention: null,
    interests: '',
  }
}

const STEP_VARIANTS = {
  enter:  dir => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:   dir => ({ x: dir > 0 ? -30 : 30, opacity: 0, transition: { duration: 0.14, ease: 'easeIn' } }),
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function QuizModal({ isOpen, onClose }) {
  const [step,       setStep]       = useState(0)
  const [dir,        setDir]        = useState(1)
  const [answers,    setAnswers]    = useState(initAnswers)
  const [email,      setEmail]      = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [emailSent,  setEmailSent]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [refNum]                    = useState(generateRef)

  /* body scroll lock */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  /* reset on close */
  useEffect(() => {
    if (!isOpen) {
      setStep(0); setDir(1); setAnswers(initAnswers())
      setEmail(''); setNewsletter(false); setEmailSent(false); setSaving(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isIntro   = step === 0
  const isResults = step === 7
  const progress  = isIntro ? 0 : isResults ? 100 : (step / MAX_STEPS) * 100
  const scores    = computeScores(answers)

  /* ── State helpers ─────────────────────────────────────────────────────── */
  function set(key, val) {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }

  function toggleCheck(arr, val) {
    return arr.includes(val) ? arr.filter(k => k !== val) : [...arr, val]
  }

  function adjustContent(key, val) {
    setAnswers(prev => ({
      ...prev,
      content: adjustContentSliders(prev.content, key, val),
    }))
  }

  /* ── Validation ────────────────────────────────────────────────────────── */
  function canAdvance() {
    switch (step) {
      case 1: return !!(answers.hours && answers.zombie && answers.pickups)
      case 2: return true // sliders always sum to 100
      case 3: return answers.situation.length >= 1
      case 4: return answers.impact.length >= 1
      case 5: return !!answers.attention
      case 6: return answers.interests.trim().length > 0
      default: return false
    }
  }

  /* ── Navigation ────────────────────────────────────────────────────────── */
  function advance() {
    if (!canAdvance()) return
    setDir(1)
    setStep(s => s + 1)
  }

  function retreat() {
    if (step <= 0) return
    setDir(-1)
    setStep(s => s - 1)
  }

  /* ── Email submit ──────────────────────────────────────────────────────── */
  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email.trim() || saving) return
    setSaving(true)

    const primaryContent = Object.entries(answers.content)
      .sort((a, b) => b[1] - a[1])[0][0]

    const { error } = await supabase.from('quiz_submissions').insert({
      email:                email.trim().toLowerCase(),
      primary_magnet:       primaryContent,
      profile_type:         null,
      radar_scores:         scores,
      audit_data: {
        hours:     answers.hours,
        zombie:    answers.zombie,
        pickups:   answers.pickups,
        content:   answers.content,
        situation: answers.situation,
        impact:    answers.impact,
        attention: answers.attention,
        interests: answers.interests,
        refNum,
      },
      newsletter_subscribed: newsletter,
    })
    if (error) console.error('quiz_submissions error:', error)

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

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
         role="dialog" aria-modal="true" aria-label="Digital Health Assessment">

      <div className="absolute inset-0 bg-[#1A1A1A]/75 backdrop-blur-sm"
           onClick={onClose} aria-hidden="true" />

      <div className={[
        'relative bg-[#F2F0ED] w-full shadow-2xl flex flex-col overflow-hidden',
        'border border-neutral-300 max-h-[92vh]',
        isResults ? 'max-w-2xl' : 'max-w-lg',
      ].join(' ')}>

        {/* Progress bar */}
        <div className="h-1 bg-neutral-200 flex-shrink-0">
          <div className="h-full bg-emerald-600 transition-all duration-500 ease-out"
               style={{ width: `${progress}%` }} />
        </div>

        {/* Close button */}
        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-5 z-10 text-neutral-400 hover:text-neutral-900 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="overflow-y-auto overscroll-contain flex-1">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={STEP_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
            >

              {/* ══════════════════════  INTRO  ══════════════════════════════ */}
              {step === 0 && (
                <div className="px-10 py-12 space-y-5">
                  <div className="space-y-1">
                    <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Free Assessment</p>
                    <p className="text-xs text-neutral-400 font-light">6 sections · ~3 minutes</p>
                  </div>
                  <h2 className="font-display font-black text-3xl text-neutral-900 leading-tight tracking-tight">
                    Your Digital Health Profile
                  </h2>
                  <p className="text-sm text-neutral-600 font-light leading-relaxed">
                    Complete this assessment to unlock your results and start your customised 4-week recovery
                    plan. Be honest — we need accurate data to build your exit strategy. There is zero shame
                    in your results. Modern tech is designed to bypass human willpower. This is a conflict of
                    biology, not a failure of character.
                  </p>
                  <button onClick={() => { setDir(1); setStep(1) }}
                    className="w-full bg-[#1A1A1A] text-white text-sm font-bold tracking-widest uppercase py-4 hover:bg-black transition-colors mt-2">
                    Start Assessment
                  </button>
                </div>
              )}

              {/* ══════════════════════  STEP 1: USAGE  ══════════════════════ */}
              {step === 1 && (
                <div className="px-10 py-10 space-y-8">
                  <StepHeader step={1} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 1: Usage</p>

                  <div className="space-y-3">
                    <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                      Average daily screen time:
                    </h3>
                    <p className="text-xs text-neutral-400 font-light">
                      iOS: Settings → Screen Time. Android: Settings → Digital Wellbeing.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {HOURS_OPTIONS.map(opt => (
                        <button key={opt.key} onClick={() => set('hours', opt.key)}
                          className={chipClass(answers.hours === opt.key)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                      What percentage of that time feels like unconscious 'zombie' usage?
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {ZOMBIE_OPTIONS.map(opt => (
                        <button key={opt.key} onClick={() => set('zombie', opt.key)}
                          className={chipClass(answers.zombie === opt.key)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-display font-bold text-lg text-neutral-900 leading-snug">
                      Estimated daily phone pickups:
                    </h3>
                    <p className="text-xs text-neutral-400 font-light">
                      iOS: Screen Time → Pickups. Android: Digital Wellbeing → Unlocks.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PICKUP_OPTIONS.map(opt => (
                        <button key={opt.key} onClick={() => set('pickups', opt.key)}
                          className={chipClass(answers.pickups === opt.key)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
                </div>
              )}

              {/* ══════════════════════  STEP 2: CONTENT  ════════════════════ */}
              {step === 2 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={2} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 2: Content</p>
                  <div className="space-y-1">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                      What does your screen time consist of?
                    </h2>
                    <p className="text-sm text-neutral-400 font-light">
                      Adjust the sliders to reflect your breakdown — they always sum to 100%.
                    </p>
                  </div>
                  <ContentSliders content={answers.content} onChange={adjustContent} />
                  <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
                </div>
              )}

              {/* ══════════════════════  STEP 3: SITUATION  ══════════════════ */}
              {step === 3 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={3} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 3: Situation</p>
                  <div className="space-y-1">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                      When does the usage typically occur?
                    </h2>
                    <p className="text-sm text-neutral-400 font-light">Select all that apply.</p>
                  </div>
                  <ul className="space-y-2">
                    {SITUATION_OPTIONS.map(opt => {
                      const active = answers.situation.includes(opt.key)
                      return (
                        <li key={opt.key}>
                          <button onClick={() => set('situation', toggleCheck(answers.situation, opt.key))}
                            className={optionClass(active)}>
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

              {/* ══════════════════════  STEP 4: IMPACT  ═════════════════════ */}
              {step === 4 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={4} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 4: Impact</p>
                  <div className="space-y-1">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                      What impact are you noticing?
                    </h2>
                    <p className="text-sm text-neutral-400 font-light">Select all that apply.</p>
                  </div>
                  <ul className="space-y-2">
                    {IMPACT_OPTIONS.map(opt => {
                      const active = answers.impact.includes(opt.key)
                      return (
                        <li key={opt.key}>
                          <button onClick={() => set('impact', toggleCheck(answers.impact, opt.key))}
                            className={optionClass(active)}>
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

              {/* ══════════════════════  STEP 5: ATTENTION  ══════════════════ */}
              {step === 5 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={5} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 5: Attention</p>
                  <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                    When working on a project for an hour, which best describes your experience?
                  </h2>
                  <ul className="space-y-2" role="radiogroup">
                    {ATTENTION_OPTIONS.map(opt => {
                      const active = answers.attention === opt.key
                      return (
                        <li key={opt.key}>
                          <button role="radio" aria-checked={active}
                            onClick={() => set('attention', opt.key)}
                            className={optionClass(active)}>
                            <span className="flex items-start gap-3">
                              <RadioDot active={active} />
                              <span className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-neutral-800">{opt.label}</span>
                                <span className="text-xs font-light text-neutral-500 leading-relaxed">{opt.desc}</span>
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
                </div>
              )}

              {/* ══════════════════════  STEP 6: INTERESTS  ══════════════════ */}
              {step === 6 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={6} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 6: Interests</p>
                  <div className="space-y-2">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                      If you had an extra hour of calm, what is one hobby or skill you'd enjoy?
                    </h2>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      The 'Rat Park' Strategy — behavioral substitution, not willpower, is the mechanism of
                      recovery. Think of what you enjoyed before the smartphone colonised your time.
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
                  <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} nextLabel="View Results" />
                </div>
              )}

              {/* ══════════════════════  STEP 7: RESULTS  ════════════════════ */}
              {isResults && (
                <ResultsScreen
                  answers={answers}
                  scores={scores}
                  refNum={refNum}
                  email={email}
                  setEmail={setEmail}
                  newsletter={newsletter}
                  setNewsletter={setNewsletter}
                  emailSent={emailSent}
                  saving={saving}
                  onEmailSubmit={handleEmailSubmit}
                  onRetake={() => {
                    setDir(-1); setStep(0); setAnswers(initAnswers())
                    setEmailSent(false); setEmail(''); setSaving(false); setNewsletter(false)
                  }}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESULTS SCREEN
───────────────────────────────────────────────────────────────────────────── */
function ResultsScreen({
  answers, scores, refNum,
  email, setEmail, newsletter, setNewsletter,
  emailSent, saving, onEmailSubmit, onRetake,
}) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const radarData = [
    { subject: 'Usage',     value: scores.usage     },
    { subject: 'Content',   value: scores.content   },
    { subject: 'Situation', value: scores.situation },
    { subject: 'Impact',    value: scores.impact    },
    { subject: 'Attention', value: scores.attention },
  ]

  const report = [
    { label: 'Usage',     score: scores.usage,     text: getUsageInsight(answers)              },
    { label: 'Content',   score: scores.content,   text: getContentInsight(answers.content)    },
    { label: 'Situation', score: scores.situation,  text: getSituationInsight(answers.situation) },
    { label: 'Impact',    score: scores.impact,    text: getImpactInsight(answers.impact)      },
    { label: 'Attention', score: scores.attention, text: getAttentionInsight(answers.attention) },
  ]

  const sectionOffset = answers.interests ? 1 : 0

  return (
    <div className="divide-y divide-neutral-200">

      {/* Letterhead */}
      <div className="px-10 py-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs tracking-widest uppercase text-neutral-400 font-light mb-1.5">Mind Sovereignty</p>
          <h2 className="font-display font-black text-2xl text-neutral-900 tracking-tight">
            Digital Health Assessment
          </h2>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-neutral-300 font-light">{today}</p>
          <p className="text-xs text-neutral-200 font-mono mt-0.5">{refNum}</p>
        </div>
      </div>

      {/* 5-Axis Radar Chart */}
      <div className="px-10 py-8 space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-neutral-300">01</span>
          <div>
            <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Risk Profile</p>
            <p className="text-xs text-neutral-300 font-light mt-0.5">Outer perimeter = higher risk exposure (0–100)</p>
          </div>
        </div>
        <AssessmentRadar data={radarData} />
      </div>

      {/* Clinical Assessment Report */}
      <div className="px-10 py-8 space-y-6">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-neutral-300">02</span>
          <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Clinical Assessment</p>
        </div>

        {report.map(({ label, score, text }) => (
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-widest uppercase text-neutral-500">{label}</p>
              <span className={[
                'text-xs font-mono font-bold px-2 py-0.5',
                score >= 75 ? 'bg-red-900/10 text-red-700'     :
                score >= 50 ? 'bg-amber-900/10 text-amber-700' :
                              'bg-neutral-100 text-neutral-500',
              ].join(' ')}>{score}/100</span>
            </div>
            <p className="text-sm text-neutral-600 font-light leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Rat Park Protocol (interests) */}
      {answers.interests && (
        <div className="px-10 py-7 space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-mono text-neutral-300">03</span>
            <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Rat Park Protocol</p>
          </div>
          <div className="bg-white border border-neutral-200 px-5 py-4">
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              Your identified replacement activity —{' '}
              <span className="text-neutral-700 font-medium italic">"{answers.interests}"</span>
              {' '}— is the behavioral anchor of your recovery plan. Willpower is not the mechanism.
              Environmental redesign and substitution are. This is what fills the space.
            </p>
          </div>
        </div>
      )}

      {/* CTA / Email Capture */}
      <div className="px-10 py-7 space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-neutral-300">0{3 + sectionOffset}</span>
          <div>
            <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Initiate Your Protocol</p>
            <p className="text-xs text-neutral-300 font-light mt-0.5">Free · Delivered to your inbox · No spam</p>
          </div>
        </div>

        {!emailSent ? (
          <form onSubmit={onEmailSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" required placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-white border border-neutral-200 px-4 py-3.5 text-sm font-sans
                           text-neutral-900 placeholder:text-neutral-300
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button type="submit" disabled={saving}
                className={[
                  'bg-[#1A1A1A] text-white whitespace-nowrap text-xs font-bold tracking-widest',
                  'uppercase px-6 py-3.5 hover:bg-black transition-colors',
                  saving ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}>
                {saving ? 'Saving…' : 'Initiate My 4-Week Protocol'}
              </button>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span onClick={() => setNewsletter(n => !n)}
                className={[
                  'w-4 h-4 border flex-shrink-0 flex items-center justify-center',
                  'transition-colors duration-150 cursor-pointer',
                  newsletter
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'border-neutral-300 group-hover:border-emerald-400',
                ].join(' ')}>
                {newsletter && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="text-xs text-neutral-400 font-light" onClick={() => setNewsletter(n => !n)}>
                Subscribe to science-backed research on attention, habit, and focus.
              </span>
            </label>
          </form>
        ) : (
          <div className="bg-[#1A1A1A] px-6 py-5 space-y-1">
            <p className="text-base font-display font-bold text-white">Protocol Initiated.</p>
            <p className="text-xs text-white/55 font-light leading-relaxed">
              Your personalised 4-week recovery plan is heading to your inbox. Phase 1 starts the moment
              you close this window.
            </p>
          </div>
        )}
      </div>

      {/* Retake */}
      <div className="px-10 py-7">
        <button onClick={onRetake}
          className="w-full border border-neutral-300 bg-white text-neutral-600 text-xs font-bold
                     tracking-widest uppercase py-3.5 hover:border-neutral-600 hover:text-neutral-900
                     transition-colors">
          Retake Assessment
        </button>
      </div>

    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONTENT SLIDERS — Donut chart + 4 linked range inputs
───────────────────────────────────────────────────────────────────────────── */
function ContentSliders({ content, onChange }) {
  const pieData = CONTENT_KEYS.map(k => ({
    name:  CONTENT_META[k].label,
    value: content[k],
    color: CONTENT_META[k].chartColor,
  }))

  return (
    <div className="space-y-6">
      {/* Donut chart */}
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-lg font-bold font-mono text-neutral-800">100</p>
              <p className="text-[10px] text-neutral-400 font-light leading-none">%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {CONTENT_KEYS.map(key => {
          const { label, chartColor, textColor } = CONTENT_META[key]
          const val = content[key]
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" style={{ color: textColor }}>
                  {label}
                </label>
                <span className="text-sm font-mono text-neutral-500">{val}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={val}
                onChange={e => onChange(key, Number(e.target.value))}
                className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
                style={{
                  background: `linear-gradient(to right, ${chartColor} ${val}%, #e5e7eb ${val}%)`,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   ASSESSMENT RADAR — 5-axis risk chart
───────────────────────────────────────────────────────────────────────────── */
function AssessmentRadar({ data }) {
  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="72%"
          data={data}
          startAngle={90}
          endAngle={90 - 360}
        >
          <PolarGrid gridType="polygon" stroke="rgba(44,44,44,0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={<RadarAxisTick />}
            axisLine={false}
            tickLine={false}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={5}
            tick={false}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="#c0614e"
            fill="#c0614e"
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={{ r: 3, fill: '#c0614e', strokeWidth: 0 }}
          />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score pills */}
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {data.map(({ subject, value }) => (
          <div key={subject} className="space-y-0.5">
            <div className={[
              'text-base font-display font-bold',
              value >= 75 ? 'text-red-700'    :
              value >= 50 ? 'text-amber-600'  :
                            'text-neutral-500',
            ].join(' ')}>{value}</div>
            <div className="text-[10px] text-neutral-400 font-sans font-light leading-tight">
              {subject}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RadarAxisTick({ x, y, payload }) {
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: '11px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: 'rgba(44,44,44,0.50)',
        fontWeight: 400,
      }}
    >
      {payload.value}
    </text>
  )
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { subject, value } = payload[0].payload
  return (
    <div className="bg-[#1A1A1A] text-white text-xs font-sans font-light px-3 py-2 shadow-lg">
      <span className="font-semibold">{subject}</span>
      <span className="ml-2 font-mono">{value}</span>
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
          <div key={i} className={[
            'h-1 w-5 transition-colors duration-300',
            i < step ? 'bg-emerald-500' : 'bg-neutral-200',
          ].join(' ')} />
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
        className={[
          'bg-[#1A1A1A] text-white text-xs font-bold tracking-widest uppercase py-3 px-6',
          'hover:bg-black transition-colors',
          !canNext ? 'opacity-25 cursor-not-allowed' : '',
        ].join(' ')}>
        {nextLabel}
      </button>
    </div>
  )
}

function RadioDot({ active }) {
  return (
    <span className={[
      'w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors duration-150',
      active ? 'border-emerald-600' : 'border-neutral-300',
    ].join(' ')}>
      {active && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
    </span>
  )
}

function CheckBox({ active }) {
  return (
    <span className={[
      'w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors duration-150',
      active ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-300',
    ].join(' ')}>
      {active && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  )
}
