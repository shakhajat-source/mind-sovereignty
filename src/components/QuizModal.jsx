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
   4  → Attention   (Radio: 4 options)                [ATTENTION axis]
   5  → Impact      (Sliders: 6 options — positive)   [IMPACT axis]
   6  → Interests   (Open text)
   7  → Results     (Radar Chart + Report + CTA)
───────────────────────────────────────────────────────────────────────────── */

const MAX_STEPS = 6

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

/* ── Step 4: Attention (moved up) ────────────────────────────────────────── */
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

/* ── Step 5: Impact (positive framing, sliders) ─────────────────────────── */
const IMPACT_OPTIONS = [
  { key: 'focus',    label: 'Improve my ability to focus',                  subLabel: 'Struggling to concentrate or get things done'         },
  { key: 'time',     label: 'Have more free time in my day',                subLabel: 'Losing hours to scrolling without meaning to'          },
  { key: 'impulse',  label: 'Break the habit of reaching for my phone',     subLabel: 'Picking it up automatically without thinking'          },
  { key: 'emotions', label: 'Feel more emotionally balanced',               subLabel: 'Mood swings, feeling flat or overstimulated'           },
  { key: 'people',   label: 'Be more present with the people I care about', subLabel: 'Phone getting in the way of real-life connection'      },
  { key: 'energy',   label: 'Feel less drained after using my phone',       subLabel: 'Finishing a scroll session feeling worse than before'   },
]

/* ─────────────────────────────────────────────────────────────────────────────
   SCORING
───────────────────────────────────────────────────────────────────────────── */
function computeScores(answers) {
  const hScore = HOURS_OPTIONS.find(o => o.key === answers.hours)?.score ?? 0
  const zScore = ZOMBIE_OPTIONS.find(o => o.key === answers.zombie)?.score ?? 0
  const pScore = PICKUP_OPTIONS.find(o => o.key === answers.pickups)?.score ?? 0
  const usage  = Math.max(hScore, zScore, pScore)

  const content = Math.min(100, (answers.content.social ?? 0) + (answers.content.notSure ?? 0))

  const situation = Math.min(100, answers.situation.length * 25)

  // IMPACT: highest slider value
  const impact = Math.max(0, ...Object.values(answers.impact))

  const attention = ATTENTION_OPTIONS.find(o => o.key === answers.attention)?.score ?? 0

  return { usage, content, situation, impact, attention }
}

/* ─────────────────────────────────────────────────────────────────────────────
   INSIGHT MESSAGES — plain, accessible language
───────────────────────────────────────────────────────────────────────────── */
function getUsageInsight(answers) {
  const hScore = HOURS_OPTIONS.find(o => o.key === answers.hours)?.score ?? 0
  const zScore = ZOMBIE_OPTIONS.find(o => o.key === answers.zombie)?.score ?? 0
  const pScore = PICKUP_OPTIONS.find(o => o.key === answers.pickups)?.score ?? 0
  const max = Math.max(hScore, zScore, pScore)

  if (max === hScore) {
    return "You're spending a lot of time on your phone — at this level, it's become a significant part of your day rather than something you dip in and out of. The plan focuses on reducing total time first, because everything else gets easier once that comes down."
  }
  if (max === zScore) {
    return "A big portion of your phone time is happening on autopilot — you're picking it up without really deciding to. That's not a willpower problem, it's a habit that's become automatic. The plan is designed specifically to interrupt those unconscious loops."
  }
  return "How often you reach for your phone is the biggest concern here. Picking it up dozens of times a day breaks your train of thought each time, even if only briefly — and those interruptions add up to a lot of lost focus across the day."
}

function getContentInsight(content) {
  if (content.social > 50) {
    return "Social media makes up most of your phone time. These apps are built to keep you coming back — unpredictable likes, comments, and new posts create a loop that's genuinely hard to step away from. It's not a lack of discipline; it's the design."
  }
  if (content.notSure > 25) {
    return "A lot of your phone time is unaccounted for, which usually means it's happening on autopilot. Usage you can't easily explain is often the hardest to change, because you haven't quite noticed the pattern yet — awareness is the first step."
  }
  if (content.comm > 40) {
    return "Messaging apps are where a lot of your time goes. The feeling that you need to always be available keeps you checking in more than you probably need to — and that low-level alertness is tiring even when you're not actively using your phone."
  }
  if (content.utility > 50) {
    return "Most of your usage falls under practical tasks, but high volumes of 'useful' phone time can still become habitual. It's worth asking whether every check is genuinely necessary — sometimes utility is a cover for something more automatic."
  }
  return "Your phone time is fairly spread across different types of use. There's no single obvious culprit, which means the focus should be on overall volume and building in more phone-free time rather than targeting one specific app."
}

function getSituationInsight(situation) {
  const score = situation.length * 25
  if (score >= 75) {
    return "Your phone is present in almost every part of your day — there aren't many gaps where it isn't in the picture. Building in a few proper phone-free periods will make a real difference, and those gaps will start to feel normal quite quickly."
  }
  if (situation.includes('morning')) {
    return "Starting the day on your phone sets the tone for everything that follows. It's one of the most impactful habits to change — even just pushing back that first check by 30 minutes can shift how the whole day feels."
  }
  if (situation.includes('bed')) {
    return "Using your phone before sleep makes it genuinely harder to wind down and affects how rested you feel the next day. It's one of the clearest links between phone habits and how you feel — and one of the most straightforward things to change."
  }
  if (situation.includes('work')) {
    return "Phone use during work hours is costly — not just for the time it takes, but because switching back to what you were doing takes longer than most people realise. Cutting this down tends to have a big impact on how productive and less stressed you feel."
  }
  return "Evening scrolling is one of the most common ways phone time creeps up without you noticing. It's easy to lose an hour or two, and it often pushes back sleep without feeling like it."
}

function getImpactInsight(impact) {
  // impact is now { focus: 0-100, time: 0-100, ... }
  const entries = Object.entries(impact).filter(([, v]) => v > 0)
  if (!entries.length) {
    return "Move the sliders to show what you'd most like to improve — that'll help us tailor your plan."
  }
  const [topKey] = entries.sort((a, b) => b[1] - a[1])[0]
  const msgs = {
    focus:    "Improving your focus is your top priority — and it's one of the areas that responds fastest to reduced phone use. Most people notice a real difference within the first two weeks.",
    time:     "Getting more free time back is one of the most motivating things about this process. Even small daily reductions add up to a surprising amount of time over four weeks.",
    impulse:  "Breaking the automatic habit of reaching for your phone is one of the most powerful things you can work on — because once that reflex changes, everything else tends to follow.",
    emotions: "Feeling more emotionally balanced is something many people notice quite quickly when they cut back. The restlessness and mood swings tend to settle as your brain adjusts to less stimulation.",
    people:   "Being more present with the people around you is one of the most meaningful things you can get back — and people around you will notice the difference too.",
    energy:   "Feeling less drained after phone use is very real and very fixable. That post-scroll tiredness tends to improve quite quickly once you start pulling back.",
  }
  return msgs[topKey] ?? "You've identified some clear goals — the plan ahead is built around helping you get them back."
}

function getAttentionInsight(attention) {
  if (attention === 'reset') {
    return "You're finding it very hard to stay on task — most attempts at focused work get interrupted before you can really get going. This is genuinely common with heavy phone use, and it does get better. Most people notice an improvement within the first two weeks of cutting back."
  }
  if (attention === 'fragmentation') {
    return "You're getting some work done but spending a lot of time drifting between your task and your phone. That divided attention is tiring and means you rarely do either thing fully — and it tends to leave you feeling like the day wasn't productive even when you were busy."
  }
  if (attention === 'itch') {
    return "You feel the pull to check your phone but can mostly resist it. Your focus is still fairly intact — the habit is there, but it hasn't taken over completely. That's a good position to work from."
  }
  if (attention === 'flow') {
    return "Your focus is largely holding up, which is a good position to be in. The aim of the plan is to protect and extend that, and make sure it doesn't gradually erode the way it does for most people over time."
  }
  return "Attention state not recorded."
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONTENT SLIDER ADJUSTMENT (always sums to 100)
───────────────────────────────────────────────────────────────────────────── */
function adjustContentSliders(prev, key, rawVal) {
  const clamped   = Math.max(0, Math.min(100, Math.round(rawVal)))
  const others    = CONTENT_KEYS.filter(k => k !== key)
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
    attention: null,
    impact:    { focus: 0, time: 0, impulse: 0, emotions: 0, people: 0, energy: 0 },
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

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

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

  function setImpact(key, val) {
    setAnswers(prev => ({
      ...prev,
      impact: { ...prev.impact, [key]: Number(val) },
    }))
  }

  /* ── Validation ────────────────────────────────────────────────────────── */
  function canAdvance() {
    switch (step) {
      case 1: return !!(answers.hours && answers.zombie && answers.pickups)
      case 2: return true
      case 3: return answers.situation.length >= 1
      case 4: return !!answers.attention
      case 5: return Object.values(answers.impact).some(v => v > 0)
      case 6: return answers.interests.trim().length > 0
      default: return false
    }
  }

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
        attention: answers.attention,
        impact:    answers.impact,
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

      {/* Backdrop — no click-to-close */}
      <div className="absolute inset-0 bg-[#1A1A1A]/75 backdrop-blur-sm" aria-hidden="true" />

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
                  <div className="space-y-3 text-sm text-neutral-600 font-light leading-relaxed">
                    <p>
                      Complete this assessment to unlock your results and start your customised 4-week recovery plan.
                    </p>
                    <p>
                      Try to be as accurate as you can — we need reliable data to give us the best chance at building a recovery plan that works for you.
                    </p>
                    <p>
                      Remember, there should be zero shame in your results. Modern tech is designed to bypass human willpower. And we're here to give you the right science-backed tools to fight back against that engineering.
                    </p>
                  </div>
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

              {/* ══════════════════════  STEP 4: ATTENTION  ══════════════════ */}
              {step === 4 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={4} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 4: Attention</p>
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

              {/* ══════════════════════  STEP 5: IMPACT  ════════════════════ */}
              {step === 5 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={5} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 5: What You Want to Improve</p>
                  <div className="space-y-1">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                      Which of these would you most like to improve?
                    </h2>
                    <p className="text-sm text-neutral-400 font-light">
                      Slide each one to show how important it is to you — 0 means it's not a concern, 100 means it's a top priority.
                    </p>
                  </div>
                  <div className="space-y-6">
                    {IMPACT_OPTIONS.map(opt => {
                      const val = answers.impact[opt.key] ?? 0
                      return (
                        <div key={opt.key} className="space-y-1.5">
                          <div className="flex justify-between items-baseline">
                            <label className="text-sm font-semibold text-neutral-800">{opt.label}</label>
                            <span className="text-xs font-mono text-neutral-400 ml-2 flex-shrink-0">{val}</span>
                          </div>
                          <p className="text-xs text-neutral-400 font-light">{opt.subLabel}</p>
                          <input
                            type="range" min={0} max={100} value={val}
                            onChange={e => setImpact(opt.key, e.target.value)}
                            className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
                            style={{
                              background: `linear-gradient(to right, #5c8260 ${val}%, #e5e7eb ${val}%)`,
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <NavRow onBack={retreat} onNext={advance} canNext={canAdvance()} />
                </div>
              )}

              {/* ══════════════════════  STEP 6: INTERESTS  ══════════════════ */}
              {step === 6 && (
                <div className="px-10 py-10 space-y-6">
                  <StepHeader step={6} total={MAX_STEPS} />
                  <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold">Section 6: Your Time</p>
                  <div className="space-y-2">
                    <h2 className="font-display font-bold text-2xl text-neutral-900 leading-snug tracking-tight">
                      If you had an extra hour of calm each day, what would you do with it?
                    </h2>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      Think about a hobby, skill, or activity you've been meaning to get back to — or something
                      you've always wanted to try. Even a vague answer is useful here.
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
    { label: 'Usage',     score: scores.usage,     text: getUsageInsight(answers)               },
    { label: 'Content',   score: scores.content,   text: getContentInsight(answers.content)     },
    { label: 'Situation', score: scores.situation,  text: getSituationInsight(answers.situation) },
    { label: 'Attention', score: scores.attention, text: getAttentionInsight(answers.attention) },
    { label: 'Impact',    score: scores.impact,    text: getImpactInsight(answers.impact)       },
  ]

  return (
    <div className="divide-y divide-neutral-200">

      {/* Letterhead */}
      <div className="px-10 py-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs tracking-widest uppercase text-neutral-400 font-light mb-1.5">Mind Sovereignty</p>
          <h2 className="font-display font-black text-2xl text-neutral-900 tracking-tight">
            Your Results
          </h2>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-neutral-300 font-light">{today}</p>
          <p className="text-xs text-neutral-200 font-mono mt-0.5">{refNum}</p>
        </div>
      </div>

      {/* Radar Chart — diagram only, no score pills */}
      <div className="px-10 py-8 space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-neutral-300">01</span>
          <div>
            <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Your Profile</p>
            <p className="text-xs text-neutral-300 font-light mt-0.5">Further out = higher concern (0–100)</p>
          </div>
        </div>
        <AssessmentRadar data={radarData} />
      </div>

      {/* What your results mean */}
      <div className="px-10 py-8 space-y-6">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-neutral-300">02</span>
          <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">What This Means</p>
        </div>

        {report.map(({ label, score, text }) => (
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-widest uppercase text-neutral-500">{label}</p>
              <span className={[
                'text-xs font-mono font-bold px-2 py-0.5',
                score >= 75 ? 'bg-red-900/10 text-red-700'    :
                score >= 50 ? 'bg-amber-900/10 text-amber-700' :
                              'bg-neutral-100 text-neutral-500',
              ].join(' ')}>{score}/100</span>
            </div>
            <p className="text-sm text-neutral-600 font-light leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* What you want to get back */}
      {answers.interests && (
        <div className="px-10 py-7 space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-mono text-neutral-300">03</span>
            <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Your Goal</p>
          </div>
          <div className="bg-white border border-neutral-200 px-5 py-4">
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              You want to spend more time on{' '}
              <span className="text-neutral-700 font-medium italic">"{answers.interests}"</span>.
              {' '}That's what the time you get back goes towards — and having something specific makes the plan much more likely to work.
            </p>
          </div>
        </div>
      )}

      {/* CTA / Email Capture */}
      <div className="px-10 py-7 space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono text-neutral-300">0{answers.interests ? '4' : '3'}</span>
          <div>
            <p className="text-xs tracking-widest uppercase text-neutral-400 font-light">Get Your 4-Week Plan</p>
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
                {saving ? 'Saving…' : 'Send My Plan'}
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
                Subscribe to research updates on attention, habit, and focus.
              </span>
            </label>
          </form>
        ) : (
          <div className="bg-[#1A1A1A] px-6 py-5 space-y-1">
            <p className="text-base font-display font-bold text-white">Your plan is on its way.</p>
            <p className="text-xs text-white/55 font-light leading-relaxed">
              Check your inbox for your personalised 4-week recovery plan. It includes a full breakdown of your
              results and a practical week-by-week guide to get started.
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
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={84}
                dataKey="value"
                startAngle={90} endAngle={-270}
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-lg font-bold font-mono text-neutral-800">100</p>
              <p className="text-[10px] text-neutral-400 font-light leading-none">%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {CONTENT_KEYS.map(key => {
          const { label, chartColor, textColor } = CONTENT_META[key]
          const val = content[key]
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" style={{ color: textColor }}>{label}</label>
                <span className="text-sm font-mono text-neutral-500">{val}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={val}
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
   ASSESSMENT RADAR — diagram only, no score pills
───────────────────────────────────────────────────────────────────────────── */
function AssessmentRadar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart
        cx="50%" cy="50%" outerRadius="72%"
        data={data}
        startAngle={90} endAngle={90 - 360}
      >
        <PolarGrid gridType="polygon" stroke="rgba(44,44,44,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={<RadarAxisTick />}
          axisLine={false}
          tickLine={false}
        />
        <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
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
  )
}

function RadarAxisTick({ x, y, payload }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif', fill: 'rgba(44,44,44,0.50)', fontWeight: 400 }}>
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
