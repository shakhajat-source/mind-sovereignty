function clamp(v) {
  return Math.max(8, Math.min(92, Math.round(v)))
}

/* ── Resolve usage hours from either audit data or Q1 key ────────────────── */
function resolveHours(q1, auditData) {
  if (auditData?.hours) {
    const h = parseFloat(auditData.hours)
    if (!isNaN(h)) return h
  }
  return { lt2: 1, '2to4': 3, '4to6': 5, '6to8': 7, gt8: 9, not_sure: 5 }[q1] ?? 5
}

export function computeRadarScores(answers) {
  const { q1, q2_ranked = [], q3a = [], q3b = [], q4, q5, attentionSec, auditData } = answers
  const top   = q2_ranked[0] ?? null
  const hours = resolveHours(q1, auditData)

  /* ── Focus Endurance — attention test is the primary anchor ─────────────── */
  let focus = 55
  if (attentionSec != null) {
    // Real-time test takes precedence: map seconds → score
    if      (attentionSec < 30)  focus = 14
    else if (attentionSec < 60)  focus = 28
    else if (attentionSec < 120) focus = 50
    else if (attentionSec < 300) focus = 72
    else                         focus = 88
  }
  // Secondary modifiers (±10 max) applied after attention anchor
  if (hours > 6)  focus -= 8
  if (hours < 3)  focus += 6
  if (q4 === 'attention') focus -= 8
  if (q4 === 'focus')     focus -= 5

  /* ── Digital Autonomy ───────────────────────────────────────────────────── */
  let autonomy = 60
  if (q5 === 'crisis')   autonomy -= 30
  if (q5 === 'severe')   autonomy -= 18
  if (q5 === 'moderate') autonomy -= 8
  if (top === 'social_doom')  autonomy -= 14
  if (top === 'games_videos') autonomy -= 10
  if (top === 'own_social')   autonomy -= 8
  if (hours > 7) autonomy -= 10
  if (hours < 3) autonomy += 14

  /* ── Boundary Integrity — driven by WHERE and WHEN patterns ─────────────── */
  let boundary = 84
  const highRiskWhere = ['bed', 'bathroom', 'desk', 'social']
  const highRiskWhen  = ['morning', 'night', 'work_hours']
  q3b.forEach(w => { if (highRiskWhere.includes(w)) boundary -= 8 })
  q3a.forEach(w => { if (highRiskWhen.includes(w))  boundary -= 7 })
  if (q5 === 'crisis') boundary -= 10

  /* ── Emotional Stability ────────────────────────────────────────────────── */
  let emotional = 66
  if (q4 === 'relations') emotional -= 18
  if (q4 === 'sleep')     emotional -= 12
  if (top === 'social_doom') emotional -= 12
  if (top === 'own_social')  emotional -= 10
  if (q5 === 'crisis')   emotional -= 16
  if (q5 === 'severe')   emotional -= 8
  if (hours < 3)         emotional += 10

  /* ── Utility Efficiency — are you using it intentionally? ───────────────── */
  let utilEff = 60
  if (top === 'utility')     utilEff += 22
  if (top === 'work_admin')  utilEff += 8
  if (top === 'social_doom') utilEff -= 18
  if (top === 'games_videos') utilEff -= 14
  if (hours < 3)  utilEff += 16
  if (hours > 7)  utilEff -= 12

  return {
    focus_endurance:     clamp(focus),
    digital_autonomy:    clamp(autonomy),
    boundary_integrity:  clamp(boundary),
    emotional_stability: clamp(emotional),
    utility_efficiency:  clamp(utilEff),
  }
}

export const PILLAR_LABELS = {
  focus_endurance:     'Focus Endurance',
  digital_autonomy:    'Digital Autonomy',
  boundary_integrity:  'Boundary Integrity',
  emotional_stability: 'Emotional Stability',
  utility_efficiency:  'Utility Efficiency',
}

export const PILLAR_SHORT = {
  focus_endurance:     'Focus',
  digital_autonomy:    'Autonomy',
  boundary_integrity:  'Boundaries',
  emotional_stability: 'Emotional',
  utility_efficiency:  'Utility',
}
