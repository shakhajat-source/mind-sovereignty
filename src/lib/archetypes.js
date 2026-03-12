/* ─────────────────────────────────────────────────────────────────────────────
   Archetype & Cognitive Leakage computation
   Used by QuizModal (results) and the email edge function (via audit_data).
───────────────────────────────────────────────────────────────────────────── */

function clamp(v) {
  return Math.max(5, Math.min(95, Math.round(v)))
}

/* ── Archetype assignment ─────────────────────────────────────────────────── */
export function computeArchetype(topApp, topMotives = []) {
  const m1 = topMotives[0] ?? null

  // Hyper-Vigilant: work/news-driven or information/professional obligation motive
  if (topApp === 'work_admin' || m1 === 'information' || m1 === 'professional') {
    return 'hyper_vigilant'
  }
  // Numb Scroller: doomscrolling app or emotional numbing motive
  if (topApp === 'social_doom' || m1 === 'emotional_buffer' || m1 === 'avoidance' || m1 === 'gap_filler') {
    return 'numb_scroller'
  }
  // Stimulation Junkie: games/video app or dopamine-seeking motive
  if (topApp === 'games_videos' || m1 === 'high_stimulation' || m1 === 'rabbit_hole') {
    return 'stimulation_junkie'
  }
  // Validation Chaser: own social app or validation/connection motive
  if (topApp === 'own_social' || m1 === 'validation' || m1 === 'connection') {
    return 'validation_chaser'
  }
  // Restless Operator: utility/fallback, or tactile/background-noise motive
  return 'restless_operator'
}

/* ── Archetype display data ───────────────────────────────────────────────── */
export const ARCHETYPES = {
  hyper_vigilant: {
    name: 'The Hyper-Vigilant',
    subtitle:
      "Your nervous system is stuck in an 'always-on' state. You treat your device as a threat-detection tool, resulting in chronic low-grade stress.",
  },
  numb_scroller: {
    name: 'The Numb Scroller',
    subtitle:
      "You use your device as a frictionless escape hatch. It isn't about the content; it's about muting the discomfort of reality, boredom, or pressure.",
  },
  stimulation_junkie: {
    name: 'The Stimulation Junkie',
    subtitle:
      "Your dopamine baselines are calibrated to high-velocity novelty. Your brain is accustomed to such a high velocity of stimulation that the analog world now feels painfully slow.",
  },
  validation_chaser: {
    name: 'The Validation Chaser',
    subtitle:
      "Your habits are driven by social survival and variable rewards. The unpredictable hits of likes and messages keep you trapped in a checking loop.",
  },
  restless_operator: {
    name: 'The Restless Operator',
    subtitle:
      "Your device is a digital pacifier. It provides background noise and a tactile habit for restless hands, fragmenting your focus by proxy.",
  },
}

/* ── Cognitive Leakage scores (0–100 each, independent) ──────────────────── */
export function computeCognitiveLeakage(topApp, topMotives = []) {
  let stimulation = 15
  let vigilance   = 15
  let avoidance   = 15

  // App contributions
  if (['games_videos', 'own_social', 'social_doom'].includes(topApp)) stimulation += 30
  if (topApp === 'work_admin')  vigilance   += 35
  if (topApp === 'social_doom') avoidance   += 25

  // Motive contributions, weighted by rank position
  const weights = [20, 12, 6]
  topMotives.slice(0, 3).forEach((m, i) => {
    const w = weights[i] ?? 5
    if (['high_stimulation', 'rabbit_hole', 'gap_filler', 'secondary_screen', 'tactile'].includes(m)) {
      stimulation += w
    }
    if (['information', 'professional'].includes(m)) {
      vigilance += w
    }
    if (['emotional_buffer', 'avoidance', 'gap_filler'].includes(m)) {
      avoidance += w
    }
    if (['validation', 'connection'].includes(m)) {
      stimulation += Math.round(w * 0.6)
    }
  })

  return {
    stimulation: clamp(stimulation),
    vigilance:   clamp(vigilance),
    avoidance:   clamp(avoidance),
  }
}
