import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ── Display maps ─────────────────────────────────────────────────────────── */
const ARCHETYPE_NAME: Record<string, string> = {
  hyper_vigilant:    'The Hyper-Vigilant',
  numb_scroller:     'The Numb Scroller',
  stimulation_junkie:'The Stimulation Junkie',
  validation_chaser: 'The Validation Chaser',
  restless_operator: 'The Restless Operator',
  // Legacy
  work_admin: 'The Productive Procrastinator', social_doom: 'The Passive Consumer',
  own_social: 'The Social Validator', games_videos: 'The Escape Artist',
  utility: 'The Utility User', fomo: 'The FOMO Reactor',
}

const LEAKAGE_LABELS: Record<string, string> = {
  stimulation: 'Stimulation Tax', vigilance: 'Vigilance Tax', avoidance: 'Avoidance Tax',
}

const HOURS_MAP: Record<string, number> = {
  '0to2': 1, '2to4': 3, '4to6': 5, '6to8': 7, '8to10': 9, 'gt10': 11,
  lt2: 1, gt8: 9, not_sure: 5,
}
const PCT_MAP: Record<string, number> = {
  '10to20': 15, '20to30': 25, '30to40': 35, gt40: 45, not_sure: 25,
}
const HOURS_LABEL: Record<string, string> = {
  '0to2': '0–2 hours', '2to4': '2–4 hours', '4to6': '4–6 hours',
  '6to8': '6–8 hours', '8to10': '8–10 hours', gt10: '10+ hours',
}
const Q5_LABEL: Record<string, string> = {
  mild: 'Mild', moderate: 'Moderate', severe: 'Severe', crisis: 'Crisis',
}

/* ── Hobby tips ───────────────────────────────────────────────────────────── */
function getHobbyTips(interests: string): string[] {
  const t = interests.toLowerCase()
  if (/read|book|novel/.test(t)) return [
    'Start with 15-minute sessions rather than forcing hour-long reads — this rebuilds the focus muscle gradually.',
    'Keep a physical book on your pillow or beside your bed as a visual cue to replace the phone-before-sleep habit.',
    'Join a local book club or reading group to add social accountability and a recurring in-person commitment.',
  ]
  if (/guitar|piano|music|instrument|sing/.test(t)) return [
    'Schedule a specific daily practice window — even 10 minutes. Consistency matters more than length.',
    'Place your instrument visibly in your living space, not in a case, so it invites you rather than requiring effort.',
    'Record yourself once a week. Hearing your own progress is one of the most powerful motivators for continued practice.',
  ]
  if (/paint|draw|art|sketch|creat/.test(t)) return [
    'Keep your materials out and accessible. The friction of setting up is the biggest barrier — remove it.',
    'Set a timer for 20 minutes and commit only to that. You\'ll often continue naturally past the alarm.',
    'Use your phone\'s camera as a reference tool only: photograph subjects, then put it face-down.',
  ]
  if (/walk|run|hike|exercise|gym|sport|yoga/.test(t)) return [
    'Go phone-free or use a simple watch for timing. Absence of the screen makes movement feel restorative rather than stimulating.',
    'Build a consistent daily window — morning movement before checking your phone is particularly powerful for cortisol regulation.',
    'Use the time as deliberate thinking space. Bring a problem you\'ve been stuck on and let your mind work without input.',
  ]
  if (/cook|bak|food|recipe/.test(t)) return [
    'Cook from a physical cookbook rather than your phone screen — the constraint forces full engagement with the recipe.',
    'Schedule one experimental cook per week where you improvise. This builds genuine skill and keeps the practice stimulating.',
    'Invite someone to share the meal. Cooking for others transforms a solo activity into a social anchor.',
  ]
  if (/writ|journal|diary/.test(t)) return [
    'Use a physical notebook rather than a digital app. The tactile act of writing by hand is itself a form of decompression.',
    'Write freely for 10 minutes without editing. Volume over quality builds the habit; perfectionism kills it.',
    'Keep your journal where your phone usually lives. The location cue redirects the reach-reflex naturally.',
  ]
  return [
    'Start with the smallest possible version — even 10 minutes. The goal is to build the neural pathway, not achieve mastery.',
    'Place a physical reminder of your hobby where your phone usually lives. Environmental design beats willpower every time.',
    'Tell one person specifically that you are taking this up. Social commitment dramatically increases follow-through.',
  ]
}

/* ── Archetype loop copy ─────────────────────────────────────────────────── */
const LOOP_COPY: Record<string, string> = {
  hyper_vigilant: `Your results indicate you are caught in the Vigilance Loop. The human nervous system is biologically wired to monitor for threats. When you constantly check the news cycle or remain tethered to work emails after hours, you are signalling to your brain that you are under threat. This prevents your cortisol (stress hormone) levels from dropping. You aren't just 'staying informed' or 'being a dedicated worker' — you are forcing your brain into a state of chronic hyper-vigilance. To fix this, your 4-week plan will implement a strict 'Digital Finish Line' to physically separate you from the threat-detection machine.`,
  numb_scroller: `You are using your device to enter what tech designers call the 'Machine Zone' — a frictionless trance where time disappears and real-world pressures are muted. Reaching for your phone when bored, anxious, or procrastinating is an attempt to soothe your nervous system. However, this is an illusion; it simply pauses the discomfort. When you put the phone down, the anxiety returns, often amplified by a dopamine crash. In Week 2, we will introduce friction. By practising 'Compassionate Observation' — sitting with the urge for 60 seconds without acting on it or judging yourself — you will strip this automatic response of its power.`,
  stimulation_junkie: `Your results point to a hijacked dopamine baseline. Modern apps are designed like slot machines, feeding you unpredictable hits of high-velocity novelty. Because your brain is flooded with easy stimulation, it has down-regulated its own dopamine receptors to protect itself. This is why analog activities — reading, working, or just sitting still — now feel painfully slow or 'boring'. You require a period of Baseline Recalibration. By completely abstaining from your most stimulating apps for 14 days, your receptors will regrow, and your capacity to enjoy normal, everyday life will return.`,
  validation_chaser: `Your phone usage is heavily tied to social survival instincts. Humans evolved to care deeply about their standing in the tribe; social media platforms weaponize this biology through intermittent reinforcement. You never know when the likes, messages, or comments will arrive, creating a compulsive checking loop driven by the fear of missing out or social exclusion. Texting provides a drip-feed of connection without the neurological benefits of a real voice or face. Your plan will shift you from passive checking to intentional, batched connection — upgrading the quality of your interactions so you no longer crave the digital quantity.`,
  restless_operator: `Sometimes addiction isn't about the content; it's about the physical habit. Your results show you are using the device as a physical pacifier to provide background noise or occupy restless hands. Having a screen flashing in your peripheral vision quietly drains your cognitive energy and incurs a Switch-Cost Penalty on your brain, even if you aren't actively looking at it. Over the next 4 weeks, we will separate the audio from the screen (using radios or speakers) and give your hands a non-digital replacement, like a notebook or worry stone, allowing your visual cortex to finally rest.`,
}

/* ── Social copy ─────────────────────────────────────────────────────────── */
const SOCIAL_COPY: Record<string, string> = {
  rarely:      `Your data suggests limited in-person social contact may be amplifying your phone dependency. Digital connection creates the appearance of company without its neurological benefits. Physical co-presence triggers entirely different neurochemical pathways than a text exchange. Your plan includes one concrete step: identify a recurring in-person commitment — a class, a club, a standing dinner — and lock it in before Phase 1 begins. Even one meaningful in-person interaction per week can significantly reduce the emotional gap that drives compulsive scrolling.`,
  once_week:   `You have a functional social foundation. The next step is enriching what you already have. Ask your existing contacts explicitly to try phone-free time together — most people feel the same but haven't said it. A phone-free dinner once a week with people you care about is one of the most reliable antidotes to the checking loop.`,
  '2to3_week': `You have a solid social baseline — use it. The work here is to deepen rather than expand. Fewer screens, more presence. Suggest activities that don't centre on scrolling: walks, cooking together, a sport. The quality of your existing in-person time will increase substantially as your phone's grip loosens.`,
  too_busy:    `A packed schedule is one of the most common rationalisations for emotional isolation. Consider whether 'too busy' is genuinely true, or whether it has become a comfortable buffer. One protected social commitment per week, treated like an unmovable appointment, is enough to begin rebuilding the human connection that makes real life more compelling than the scroll.`,
  online_only: `Your social life being primarily online is one of the most significant risk factors for escalating phone dependency. Online interaction, however meaningful, does not provide the full neurological benefits of physical co-presence. Your plan includes a strong recommendation: identify one recurring in-person activity over the next 4 weeks — a class, a team, a volunteering commitment — and commit to it for the duration. This single change is likely to have an outsized effect on your baseline wellbeing.`,
}

/* ── Severity / impact copy ───────────────────────────────────────────────── */
const SEVERITY_COPY: Record<string, string> = {
  mild:     'You identified your usage as Mild. You are aware of the pattern but it has not yet caused significant disruption. You are ahead of most people in recognising this early — and the earlier the intervention, the easier the reset.',
  moderate: 'You identified your usage as Moderate, noting a noticeable daily impact. This is the most common profile and, crucially, the most responsive to the structured approach in your plan. You have not left this too late.',
  severe:   'You identified your usage as Severe — a real problem that needs addressing. Your honesty here is the first act of sovereignty. Severe patterns respond strongly to the Baseline Recalibration approach in your plan.',
  crisis:   'You identified your usage as Crisis level. This level of honesty requires courage. Your plan prioritises the most impactful structural interventions and we strongly encourage you to supplement this with real-world support.',
}
const IMPACT_COPY: Record<string, string> = {
  sleep:     'The primary area you have identified as neglected is sleep. Disrupted sleep is the fastest route to accelerated cognitive decline. Every night of poor sleep compounds the attention deficit and weakens your resilience to the next day\'s urge to scroll.',
  focus:     'The primary area you have identified as neglected is your ability to focus on deep work. Fragmented focus is not a personality trait — it is a trained response to constant interruption. The good news is that it can be retrained.',
  attention: 'The primary area you have identified as neglected is your attention span and reading ability. The capacity to sustain deep reading is one of the first things phone dependency erodes — and one of the first things to return when you reset.',
  relations: 'The primary area you have identified as neglected is your relationships. Phone use in social settings is one of the most reliable predictors of relationship dissatisfaction. Your plan specifically targets the patterns displacing real human presence.',
  fitness:   'The primary area you have identified as neglected is physical health. Sedentary phone time doesn\'t just displace activity — it displaces the mental state that motivates movement. As your phone usage reduces, energy and motivation return naturally.',
  not_sure:  'You identified impact across multiple areas of your life. Widespread impact is a signal of a systemic problem, not an isolated one. Your plan addresses the root mechanism rather than treating each area separately.',
}
const ATTENTION_COPY: Record<string, string> = {
  flow_state:   'Your reported attention profile shows strong focus endurance — you can enter deep work states without significant disruption. Your plan focuses on protecting and extending this capacity rather than rebuilding it.',
  check_once:   'You reported checking your phone occasionally during focused work but completing the task. This is a recoverable pattern. Even brief checks carry a cognitive switch-cost that fragments the quality of your output over time.',
  switch_tasks: 'You reported frequently switching between tasks before completing them. This reflects what researchers call attention residue — the mental remnant of the previous task clinging to your working memory. Your plan targets this directly.',
  pulled_away:  'You reported that notifications and external sounds completely derail your concentration. This level of distraction sensitivity indicates your brain\'s default mode has been recalibrated toward interruption. Notification silencing and focus blocks are prioritised in your plan.',
  cant_refocus: 'You reported spending more time trying to regain concentration than actually working. This re-entry problem is the most severe form of attentional fragmentation and is strongly associated with heavy dopamine stimulation. Your Baseline Recalibration period is particularly important.',
}

/* ═══════════════════════════════════════════════════════════════════════════
   PDF GENERATION
═══════════════════════════════════════════════════════════════════════════ */
async function buildPDF(
  profileType: string,
  _scores:     Record<string, number>,
  auditData:   Record<string, string>,
): Promise<Uint8Array> {
  const doc  = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reg  = await doc.embedFont(StandardFonts.Helvetica)

  // Colours
  const charcoal  = rgb(0.173, 0.173, 0.173)
  const green     = rgb(0.361, 0.510, 0.376)
  const midGray   = rgb(0.45,  0.45,  0.45)
  const lightGray = rgb(0.75,  0.75,  0.75)

  // Page constants
  const PW = 595.28, PH = 841.89
  const ML = 60, MR = 60, MT = 70, MB = 60
  const CW = PW - ML - MR   // 475.28

  // Mutable layout state
  let page = doc.addPage([PW, PH])
  let y    = PH - MT

  function newPage() {
    page = doc.addPage([PW, PH])
    y    = PH - MT
  }
  function checkSpace(needed: number) {
    if (y - needed < MB) newPage()
  }

  // Draw a string with word-wrap, returns nothing (mutates y)
  function block(
    text: string,
    font: typeof bold,
    size: number,
    color: ReturnType<typeof rgb>,
    indent = 0,
    lhMult = 1.55,
  ) {
    const lh   = size * lhMult
    const maxW = CW - indent
    const words = text.split(/\s+/).filter(Boolean)
    let line = ''

    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        checkSpace(lh)
        page.drawText(line, { x: ML + indent, y, size, font, color })
        y -= lh
        line = word
      } else {
        line = test
      }
    }
    if (line) {
      checkSpace(lh)
      page.drawText(line, { x: ML + indent, y, size, font, color })
      y -= lh
    }
  }

  function gap(pts = 14) { y -= pts }

  function rule(color: ReturnType<typeof rgb> = lightGray) {
    page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 0.5, color })
    y -= 16
  }

  function sectionHead(label: string, num: string) {
    checkSpace(44)
    gap(10)
    page.drawText(num, { x: ML, y, size: 8, font: reg, color: lightGray })
    page.drawText(label.toUpperCase(), { x: ML + 22, y, size: 8, font: bold, color: green })
    y -= 18
    rule()
  }

  // ── Parse audit data ──────────────────────────────────────────────────────
  const archetypeName  = ARCHETYPE_NAME[profileType] ?? 'Sovereignty Seeker'
  const hoursNum       = HOURS_MAP[auditData.usageHours ?? ''] ?? 5
  const pctNum         = PCT_MAP[auditData.unnecessaryPct ?? ''] ?? 25
  const daysPerYear    = Math.round((hoursNum * 365) / 24)
  const yearsLifespan  = Math.round((daysPerYear * 80) / 365)
  const unnecessaryDays = Math.round((daysPerYear * pctNum) / 100)
  const severity       = auditData.severity       ?? ''
  const interests      = auditData.interests      ?? ''
  const social         = auditData.socialConnection ?? ''
  const morning        = auditData.morningUsage    ?? ''
  const workProc       = auditData.workProcrastination ?? ''
  const attentionSpan  = auditData.attentionSpan  ?? ''
  const impactArea     = auditData.impactArea     ?? ''
  const today          = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE BLOCK
  // ═══════════════════════════════════════════════════════════════════════════
  page.drawText('MIND SOVEREIGNTY', { x: ML, y, size: 9, font: bold, color: green })
  y -= 16
  page.drawText('Digital Health Assessment', { x: ML, y, size: 22, font: bold, color: charcoal })
  y -= 28
  page.drawText(archetypeName, { x: ML, y, size: 13, font: reg, color: midGray })
  y -= 14
  page.drawText(today, { x: ML, y, size: 10, font: reg, color: lightGray })
  y -= 24
  rule(green)

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: THE REALITY CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('The Reality Check', '01')

  block(
    `Your reported daily screen time is approximately ${hoursNum} hour${hoursNum !== 1 ? 's' : ''}. Over the course of a year, that translates to around ${daysPerYear} days — over ${Math.round(daysPerYear / 30)} full months — spent looking at your phone. Scaled across an 80-year lifespan, that is roughly ${yearsLifespan} year${yearsLifespan !== 1 ? 's' : ''}. This is not unusual. You sit in the broad middle of smartphone users in developed countries, and the system was designed to get you here.`,
    reg, 10, charcoal,
  )
  gap()
  block(
    `Of that time, you estimated approximately ${pctNum}% — around ${unnecessaryDays} days per year — as unnecessary usage you'd like to recover. That is the specific target of the next 4 weeks. We are not asking you to quit your phone; we are asking you to reclaim those ${unnecessaryDays} days.`,
    reg, 10, charcoal,
  )

  if (morning === 'agree') {
    gap()
    block(
      `You noted that your phone is typically the first thing you reach for in the morning. This is significant: checking your phone before your prefrontal cortex has fully activated sets a neurological template for the rest of the day, priming the brain to expect constant stimulation. Your plan begins with addressing this single habit first.`,
      reg, 10, charcoal,
    )
  }

  if (workProc === 'agree') {
    gap()
    block(
      `You also indicated spending at least one hour procrastinating on your phone during productive hours. This pattern is one of the highest-cost behaviours we address — every hour lost during peak cognitive hours costs not just that hour, but the momentum and flow state you could have built.`,
      reg, 10, charcoal,
    )
  }

  gap()
  block(
    `Over the next 4 weeks, our target is that ${pctNum}% of unnecessary usage. Not perfection — progress.`,
    bold, 10, charcoal,
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: YOUR DIGITAL LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('Your Digital Loop', '02')

  block(
    LOOP_COPY[profileType] ?? LOOP_COPY.restless_operator,
    reg, 10, charcoal,
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: ARCHITECTURE OF HABIT
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('Architecture of Habit', '03')

  block(
    `Addiction is deeply tied to environmental cues. Your phone usage almost certainly spikes in specific locations and at specific times — the same sofa, the same desk, the same moments of transition. These cues are not weaknesses; they are conditioned responses your brain has automated over years of repetition.`,
    reg, 10, charcoal,
  )
  gap()
  block(
    `Your plan begins with one structural change: assigning your phone a dedicated 'home' in a room you don't use for rest or focused work. When you are in the bedroom, or at your desk, the phone is not there. This single environmental adjustment introduces the friction that willpower alone cannot sustain.`,
    reg, 10, charcoal,
  )
  gap()
  block(
    `Reassurance: this is not a permanent ban. It is a 4-week protocol to reset the conditioned triggers that have been running on autopilot. After the plan, you will choose where it lives — but the loop will no longer be making that choice for you.`,
    reg, 10, charcoal,
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: THE TURNING POINT
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('The Turning Point', '05')

  if (severity && SEVERITY_COPY[severity]) {
    block(SEVERITY_COPY[severity], reg, 10, charcoal)
    gap()
  }
  if (impactArea && IMPACT_COPY[impactArea]) {
    block(IMPACT_COPY[impactArea], reg, 10, charcoal)
    gap()
  }
  block(
    `This is your baseline. At the end of Week 4, we use these same markers to measure your progress. Change is not always dramatic — but it is always measurable.`,
    reg, 10, charcoal,
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: ATTENTION SPAN
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('Your Attention Span', '06')

  block(
    attentionSpan && ATTENTION_COPY[attentionSpan]
      ? ATTENTION_COPY[attentionSpan]
      : `Your attention profile reflects the modern norm — an environment optimised for interruption, competing with a brain built for focus.`,
    reg, 10, charcoal,
  )
  gap()
  block(
    `Every interruption carries a cognitive switch-cost. Studies show it takes the brain over 20 minutes to return to deep focus after a single distraction. If you check your phone three times during a work session, you may never reach genuine flow at all. The reassuring truth: your brain retains its neuroplasticity. The capacity for sustained reading, deep thinking, and creative flow can be rebuilt — typically within 2–4 weeks of reduced stimulation.`,
    reg, 10, charcoal,
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: REPLACEMENT STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('Your Replacement Strategy', '07')

  block(
    `You cannot simply 'stop' scrolling without a compelling alternative waiting. In the famous Rat Park experiment, rats placed in an enriched environment with social connection and stimulation voluntarily ignored addictive substances. Your chosen interest is your Rat Park.`,
    reg, 10, charcoal,
  )
  gap()

  if (interests) {
    block(`You told us you'd like to use your recovered time on: ${interests}.`, bold, 10, charcoal)
    gap()
    block(
      `This is not a trivial answer. Research consistently shows that the specificity of the replacement activity is one of the strongest predictors of successful habit change.`,
      reg, 10, charcoal,
    )
    gap()

    const tips = getHobbyTips(interests)
    block('Three tailored suggestions for making this stick:', bold, 10, charcoal)
    gap(8)
    for (let i = 0; i < tips.length; i++) {
      checkSpace(28)
      block(`${i + 1}.  ${tips[i]}`, reg, 10, charcoal, 12)
      gap(4)
    }
  } else {
    block(
      `When you identify your replacement activity, write it somewhere visible. The specificity of what you will do instead is one of the most important factors in successfully breaking a habit loop.`,
      reg, 10, charcoal,
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: THE HUMAN ELEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHead('The Human Element', '08')

  block(
    `"The opposite of addiction is not sobriety — it's connection."  — Johann Hari`,
    bold, 10, charcoal,
  )
  gap()
  block(
    SOCIAL_COPY[social] ?? `Human connection remains the most powerful neurological antidote to compulsive digital behaviour. Whatever your current social situation, your plan will nudge you toward more intentional, phone-free presence with the people in your life.`,
    reg, 10, charcoal,
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER (placed at absolute bottom of final page)
  // ═══════════════════════════════════════════════════════════════════════════
  const footerY = MB - 4
  page.drawLine({ start: { x: ML, y: footerY + 12 }, end: { x: PW - MR, y: footerY + 12 }, thickness: 0.5, color: lightGray })
  page.drawText(
    `© ${new Date().getFullYear()} Mind Sovereignty  ·  Confidential Assessment  ·  mindsovereignty.com`,
    { x: ML, y: footerY, size: 8, font: reg, color: lightGray },
  )

  return doc.save()
}

/* ═══════════════════════════════════════════════════════════════════════════
   HTML EMAIL
═══════════════════════════════════════════════════════════════════════════ */

const RADAR_AXES: { key: string; label: string; colour: string }[] = [
  { key: 'usage',     label: 'Daily Usage',        colour: '#5c8260' },
  { key: 'content',   label: 'Content Mix',         colour: '#7a6b5c' },
  { key: 'situation', label: 'Trigger Situations',  colour: '#5c6b7a' },
  { key: 'attention', label: 'Attention Span',      colour: '#7a5c70' },
  { key: 'impact',    label: 'Life Impact',         colour: '#c17240' },
]

function radarBars(scores: Record<string, number>): string {
  const rows = RADAR_AXES.map(({ key, label, colour }) => {
    const val  = Math.min(100, Math.max(0, Number(scores[key]) || 0))
    const barW = Math.round(val * 1.8)
    return `<tr>
      <td style="padding:6px 0;width:140px;font-size:12px;color:#666;font-family:Inter,sans-serif;vertical-align:middle;">${label}</td>
      <td style="padding:6px 10px;vertical-align:middle;">
        <div style="background:#eeece9;border-radius:2px;height:6px;width:180px;">
          <div style="background:${colour};height:6px;width:${barW}px;border-radius:2px;"></div>
        </div>
      </td>
      <td style="padding:6px 0;font-size:12px;font-family:'Courier New',monospace;color:#2c2c2c;width:32px;vertical-align:middle;">${val}</td>
    </tr>`
  })
  return rows.join('')
}

function buildEmail(
  _toEmail:    string,
  _profileType: string,
  scores:      Record<string, number>,
  auditData:   Record<string, unknown>,
): string {
  const interests  = typeof auditData?.interests === 'string' ? auditData.interests : ''
  const hoursKey   = typeof auditData?.hours === 'string' ? auditData.hours : ''
  const usageHours = HOURS_LABEL[hoursKey] ?? ''
  const year       = new Date().getFullYear()

  const hoursLine     = usageHours ? `Your reported daily screen time is <strong>${usageHours}</strong>. ` : ''
  const interestsLine = interests  ? `You want to use your recovered time on: <em>${interests}</em>. ` : ''

  // Identify the highest-scoring axis for a plain-language headline
  const topAxis = RADAR_AXES.reduce((best, ax) =>
    (scores[ax.key] ?? 0) > (scores[best.key] ?? 0) ? ax : best, RADAR_AXES[0])
  const topScore = scores[topAxis.key] ?? 0

  const topInsight: Record<string, string> = {
    usage:     'Your screen time is one of the main patterns to address — the sheer hours add up fast and crowd out the things that matter more.',
    content:   'The type of content you consume is working against you. High-stimulation feeds keep pulling you back even when you don\'t want them to.',
    situation: 'Specific situations are triggering most of your phone use. Identifying and adding friction in those moments will have an outsized effect.',
    attention: 'Your ability to focus is taking a significant hit. Rebuilding it is the first thing that improves once screen time comes down.',
    impact:    'You feel the effects of phone use across your daily life — your energy, mood, and focus. That is a strong signal that now is the right time to act.',
  }

  const whatThisMeans = topScore > 0
    ? (topInsight[topAxis.key] ?? 'Your results show a clear pattern worth addressing over the next four weeks.')
    : 'Your results give you a clear starting point for the next four weeks.'

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your Recovery Plan — Mind Sovereignty</title></head>
<body style="margin:0;padding:0;background:#f2f0ed;font-family:Inter,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ed;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;">

  <!-- Header -->
  <tr><td style="padding:40px 48px 28px;border-bottom:1px solid #eeece9;">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Mind Sovereignty</p>
    <h1 style="margin:0;font-size:26px;font-weight:900;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;line-height:1.15;">Your Recovery Plan</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#555;font-family:Inter,sans-serif;line-height:1.6;">${hoursLine}${interestsLine}Here is everything you need to get started.</p>
  </td></tr>

  <!-- Radar Scores -->
  <tr><td style="padding:32px 48px;border-bottom:1px solid #eeece9;">
    <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Your Results</p>
    <table cellpadding="0" cellspacing="0">${radarBars(scores)}</table>
    <p style="margin:14px 0 0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;">Each axis scored 0–100. Higher means more pressure in that area.</p>
  </td></tr>

  <!-- What This Means -->
  <tr><td style="padding:32px 48px;border-bottom:1px solid #eeece9;">
    <p style="margin:0 0 12px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">What This Means</p>
    <p style="margin:0 0 12px;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">${whatThisMeans}</p>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">None of this is a personal failing. These patterns are the result of systems engineered to hold your attention. The four weeks ahead are about taking that attention back — one habit at a time.</p>
  </td></tr>

  ${interests ? `<!-- Your Goal -->
  <tr><td style="padding:32px 48px;border-bottom:1px solid #eeece9;">
    <p style="margin:0 0 12px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Your Goal</p>
    <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">You told us you want to use your recovered time on: <strong style="color:#2c2c2c;">${interests}</strong>.</p>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">Keep that front of mind. Every hour you reclaim from the scroll is an hour you can put towards this. Having a specific alternative is one of the most reliable ways to make a habit change stick.</p>
  </td></tr>` : ''}

  <!-- Pre-Recovery Path Activities -->
  <tr><td style="padding:32px 48px 0;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Before You Begin</p>
    <h2 style="margin:0 0 14px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">Pre-Recovery Path Activities</h2>
    <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">Complete these before Week 1 starts. They take less than an hour and dramatically improve your chances of following through.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:7px 0;vertical-align:top;width:20px;font-size:13px;color:#5c8260;">&#9744;</td><td style="padding:7px 0 7px 8px;font-size:13px;color:#555;font-family:Inter,sans-serif;line-height:1.5;">Silence all non-essential notifications on your phone</td></tr>
      <tr><td style="padding:7px 0;vertical-align:top;font-size:13px;color:#5c8260;">&#9744;</td><td style="padding:7px 0 7px 8px;font-size:13px;color:#555;font-family:Inter,sans-serif;line-height:1.5;">Give your phone a dedicated "home" — a spot in a room you don't use for sleep or focused work</td></tr>
      <tr><td style="padding:7px 0;vertical-align:top;font-size:13px;color:#5c8260;">&#9744;</td><td style="padding:7px 0 7px 8px;font-size:13px;color:#555;font-family:Inter,sans-serif;line-height:1.5;">Delete your highest-trigger apps — you can always reinstall them after four weeks</td></tr>
      <tr><td style="padding:7px 0;vertical-align:top;font-size:13px;color:#5c8260;">&#9744;</td><td style="padding:7px 0 7px 8px;font-size:13px;color:#555;font-family:Inter,sans-serif;line-height:1.5;">Tell one person you trust what you're doing — social accountability makes a real difference</td></tr>
      <tr><td style="padding:7px 0;vertical-align:top;font-size:13px;color:#5c8260;">&#9744;</td><td style="padding:7px 0 7px 8px;font-size:13px;color:#555;font-family:Inter,sans-serif;line-height:1.5;">Write down what you want back: time, focus, sleep, relationships — make it specific</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;"/></td></tr>

  <!-- Week 1 -->
  <tr><td style="padding:0 48px;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Week 01</p>
    <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">Battling the Instinct</h2>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">The goal this week is simple: stop picking up your phone without meaning to. Every time you reach for it automatically — out of boredom, habit, or anxiety — pause and ask whether you actually intend to use it. You will be surprised how often the answer is no. That moment of awareness is where the change begins.</p>
  </td></tr>
  <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;"/></td></tr>

  <!-- Week 2 -->
  <tr><td style="padding:0 48px;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Week 02</p>
    <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">Tackling the Withdrawal</h2>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">This is the hardest week for most people. The urge to scroll peaks before it fades — restlessness, low mood, and boredom are all signs your brain is recalibrating to lower stimulation. Sit with the discomfort rather than relieving it. Each time you do, the habit loop loses a little of its grip. It will not always feel this hard.</p>
  </td></tr>
  <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;"/></td></tr>

  <!-- Week 3 -->
  <tr><td style="padding:0 48px;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Week 03</p>
    <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">Setting in Good Habits</h2>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">Most people notice a genuine shift this week. Sleep improves, concentration returns, and things that felt slow or boring — reading, conversation, being outside — start to feel rewarding again. Use this momentum to build the replacement habits you identified. The goal is no longer just to resist the phone, but to build a life that does not need it.</p>
  </td></tr>
  <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;"/></td></tr>

  <!-- Week 4 -->
  <tr><td style="padding:0 48px 32px;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Week 04</p>
    <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">Consolidating and Planning the Post-Recovery Life</h2>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">The final week is about locking in what you have built and deciding how you want to use your phone going forward — on your terms. Revisit your starting intentions. What have you got back? What do you want to protect? Design your environment so that the good habits are the easy habits, and the old loops are the ones with friction.</p>
  </td></tr>

  <!-- Tools link -->
  <tr><td style="padding:0 48px 32px;border-bottom:1px solid #eeece9;">
    <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">Need support along the way? We have a set of practical tools to help you build structure during your recovery — from focus timers to habit trackers. <a href="https://dopamine-hero.vercel.app/tools" style="color:#5c8260;text-decoration:underline;">Explore the tools here</a>.</p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:32px 48px 40px;background:#2c2c2c;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);font-family:Inter,sans-serif;">When you're ready</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);font-family:Inter,sans-serif;line-height:1.6;">Your plan is set. Your tools are waiting. The only thing left is to begin.</p>
    <a href="https://dopamine-hero.vercel.app/tools" style="display:inline-block;background:#5c8260;color:#fff;font-family:Outfit,Inter,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:14px 28px;">Ready to start your journey?</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 48px;border-top:1px solid #eeece9;">
    <p style="margin:0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;">&copy; ${year} Mind Sovereignty &middot; You received this because you completed our quiz.<br/>No spam, ever.</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   HANDLER
═══════════════════════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { record } = body as { record?: Record<string, unknown> }
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const email       = typeof record.email === 'string' ? record.email.trim() : ''
    const profileType = typeof record.profile_type === 'string' ? record.profile_type : ''
    const rawScores   = record.radar_scores
    const rawAudit    = record.audit_data

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Parse scores
    let scores: Record<string, number> = {}
    if (rawScores && typeof rawScores === 'object' && !Array.isArray(rawScores)) {
      scores = rawScores as Record<string, number>
    } else if (typeof rawScores === 'string') {
      try { scores = JSON.parse(rawScores) } catch { /* ignore */ }
    }

    // Parse audit data
    let auditData: Record<string, unknown> = {}
    if (rawAudit && typeof rawAudit === 'object' && !Array.isArray(rawAudit)) {
      auditData = rawAudit as Record<string, unknown>
    } else if (typeof rawAudit === 'string') {
      try { auditData = JSON.parse(rawAudit) } catch { /* ignore */ }
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Generate HTML email
    const html = buildEmail(email, profileType, scores, auditData)

    // Generate PDF — gracefully degrade if it fails
    let attachments: unknown[] = []
    try {
      const pdfBytes  = await buildPDF(profileType, scores, auditData as Record<string, string>)
      const pdfBase64 = btoa(pdfBytes.reduce((s, b) => s + String.fromCharCode(b), ''))
      attachments = [{
        filename: 'mind-sovereignty-assessment.pdf',
        content:  pdfBase64,
      }]
      console.log('PDF generated successfully, size:', pdfBytes.length)
    } catch (pdfErr) {
      console.error('PDF generation failed (email will still send):', pdfErr)
    }

    console.log('Sending email to:', email)

    const resResp = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:        'Mind Sovereignty <onboarding@resend.dev>',
        to:          [email],
        subject:     'Your Recovery Plan — Mind Sovereignty',
        html,
        attachments,
      }),
    })

    const resBody = await resResp.json()
    if (!resResp.ok) {
      console.error('Resend error:', JSON.stringify(resBody))
      return new Response(JSON.stringify({ error: 'Resend API error', detail: resBody }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('Email sent successfully. ID:', resBody.id)
    return new Response(JSON.stringify({ success: true, id: resBody.id }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Unhandled exception:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
