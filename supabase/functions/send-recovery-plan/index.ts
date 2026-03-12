import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ── Archetype display names ─────────────────────────────────────────────── */
const ARCHETYPE_NAME: Record<string, string> = {
  hyper_vigilant:    'The Hyper-Vigilant',
  numb_scroller:     'The Numb Scroller',
  stimulation_junkie:'The Stimulation Junkie',
  validation_chaser: 'The Validation Chaser',
  restless_operator: 'The Restless Operator',
  // Legacy fallbacks
  work_admin:   'The Productive Procrastinator',
  social_doom:  'The Passive Consumer',
  own_social:   'The Social Validator',
  games_videos: 'The Escape Artist',
  utility:      'The Utility User',
  fomo:         'The FOMO Reactor',
}

/* ── Leakage bar labels ──────────────────────────────────────────────────── */
const LEAKAGE_LABELS: Record<string, string> = {
  stimulation: 'Stimulation Tax',
  vigilance:   'Vigilance Tax',
  avoidance:   'Avoidance Tax',
}

/* ── Usage hours display ─────────────────────────────────────────────────── */
const HOURS_LABEL: Record<string, string> = {
  '0to2': '0–2 hours', '2to4': '2–4 hours', '4to6': '4–6 hours',
  '6to8': '6–8 hours', '8to10': '8–10 hours', 'gt10': '10+ hours',
}

/* ── Leakage bars HTML ───────────────────────────────────────────────────── */
function leakageBars(scores: Record<string, number>): string {
  const entries = Object.entries(scores).filter(([key]) => key in LEAKAGE_LABELS)

  if (entries.length === 0) {
    return `<tr><td style="font-size:12px;color:#aaa;font-family:Inter,sans-serif;">No leakage data available.</td></tr>`
  }

  const colours: Record<string, string> = {
    stimulation: '#c17240',
    vigilance:   '#5c7a8c',
    avoidance:   '#8c6b5c',
  }

  return entries
    .map(([key, rawVal]) => {
      const val    = Math.min(100, Math.max(0, Number(rawVal) || 0))
      const label  = LEAKAGE_LABELS[key]
      const colour = colours[key] ?? '#888'
      const barW   = Math.round(val * 1.8) // max 180px at 100

      return `
        <tr>
          <td style="padding:5px 0;width:130px;font-size:12px;color:#888;
                     font-family:Inter,sans-serif;vertical-align:middle;">${label}</td>
          <td style="padding:5px 10px;vertical-align:middle;">
            <div style="background:#eeece9;border-radius:2px;height:6px;width:180px;">
              <div style="background:${colour};height:6px;width:${barW}px;border-radius:2px;"></div>
            </div>
          </td>
          <td style="padding:5px 0;font-size:12px;font-family:'Courier New',monospace;
                     color:#2c2c2c;width:32px;vertical-align:middle;">${val}</td>
        </tr>`
    })
    .join('')
}

/* ── Email template ───────────────────────────────────────────────────────── */
function buildEmail(
  toEmail:     string,
  profileType: string,
  scores:      Record<string, number>,
  auditData:   Record<string, string>,
): string {
  const archetypeName = ARCHETYPE_NAME[profileType] ?? 'Sovereignty Seeker'
  const severity      = auditData?.severity   ?? ''
  const interests     = auditData?.interests  ?? ''
  const usageHours    = HOURS_LABEL[auditData?.usageHours ?? ''] ?? ''
  const year          = new Date().getFullYear()

  const severityLine = severity
    ? `You've identified a <strong>${severity}</strong> level of phone dependency.`
    : ''
  const interestsLine = interests
    ? `You've told us you'd like to spend your extra time on: <em>${interests}</em>.`
    : ''
  const hoursLine = usageHours
    ? `Your reported daily screen time is <strong>${usageHours}</strong>.`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Sovereignty Assessment &amp; 4-Week Roadmap</title>
</head>
<body style="margin:0;padding:0;background:#f2f0ed;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ed;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="padding:40px 48px 28px;border-bottom:1px solid #eeece9;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Mind Sovereignty
            </p>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;line-height:1.15;">
              Your Sovereignty Assessment &amp; 4-Week Roadmap
            </h1>
            <p style="margin:6px 0 0;font-size:13px;color:#5c8260;font-family:Inter,sans-serif;font-weight:500;">
              ${archetypeName}
            </p>
          </td>
        </tr>

        <!-- Brief Summary -->
        <tr>
          <td style="padding:32px 48px;border-bottom:1px solid #eeece9;">
            <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Your Snapshot
            </p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">
              ${hoursLine} ${severityLine} ${interestsLine}
              Here is your personalised roadmap to take back control.
            </p>
          </td>
        </tr>

        <!-- Cognitive Leakage Scores -->
        <tr>
          <td style="padding:32px 48px;border-bottom:1px solid #eeece9;">
            <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Cognitive Leakage
            </p>
            <table cellpadding="0" cellspacing="0">
              ${leakageBars(scores)}
            </table>
            <p style="margin:14px 0 0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;">
              Where your mental energy is being spent. Each score is out of 100.
            </p>
          </td>
        </tr>

        <!-- Pre-Plan Prep -->
        <tr>
          <td style="padding:32px 48px 0;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Before You Begin
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">
              Pre-Plan Preparation
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">
              Gather your necessary tools and read through the solutions ahead. Silence your notifications,
              and define a dedicated "home" for your phone — a specific spot in your living space where it
              stays when not in active use. This single environmental change is one of the highest-leverage
              moves you can make before the plan begins.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;" /></td></tr>

        <!-- Week 1: Phase 1 The Reset -->
        <tr>
          <td style="padding:0 48px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 01
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">
              Phase 1: The Reset
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">
              Start your chosen hobby or interest — even in a small way. Inform friends and family that
              you are taking on this challenge; social accountability dramatically improves follow-through.
              Write down your intentions and the specific outcome you want after 4 weeks.
              Brace yourself: the biological pressure to revert to your phone will be strong in
              the first few days. This is normal, and it is temporary.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;" /></td></tr>

        <!-- Week 2: Phase 2 The Itch -->
        <tr>
          <td style="padding:0 48px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 02
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">
              Phase 2: The Itch
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">
              Fully delete your highest-trigger apps. Not mute — delete. This is the most
              uncomfortable week, often called "living with the gap." The discomfort you feel is
              your dopamine system recalibrating. Sit with the itch rather than scratching it.
              Each time you resist the urge, you are physically rewiring the habit loop.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;" /></td></tr>

        <!-- Week 3: Phase 3 Rebuilding Focus -->
        <tr>
          <td style="padding:0 48px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 03
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">
              Phase 3: Rebuilding Focus
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">
              Most people notice a shift here. Sleep becomes deeper, concentration returns, and
              activities that previously felt boring or slow begin to feel engaging again.
              Concentrate heavily on your chosen hobby and let yourself become absorbed. This is
              your dopamine baseline recalibrating to the real world.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;"><hr style="border:none;border-top:1px solid #eeece9;" /></td></tr>

        <!-- Week 4: Phase 4 The New Normal -->
        <tr>
          <td style="padding:0 48px 32px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 04
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;">
              Phase 4: The New Normal
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Inter,sans-serif;">
              Freedom from compulsive loops and dopamine irregularity. At this stage, your phone
              is a tool again rather than a pull. You are using it with intention. The goal now
              is to make this your permanent baseline — redesigning your environment so that
              presence, not scrolling, becomes the path of least resistance.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 48px 40px;background:#2c2c2c;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
                      color:rgba(255,255,255,0.35);font-family:Inter,sans-serif;">
              Your next step
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);
                      font-family:Inter,sans-serif;line-height:1.6;">
              Your roadmap is ready. Use it alongside our tools to build the friction and
              structure you need to make this permanent.
            </p>
            <a href="https://mindsovereignty.com/#tools"
               style="display:inline-block;background:#5c8260;color:#fff;
                      font-family:Outfit,Inter,sans-serif;font-size:12px;font-weight:700;
                      letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;
                      padding:14px 28px;">
              Ready to Start? Take me to my recovery dashboard.
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 48px;border-top:1px solid #eeece9;">
            <p style="margin:0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;">
              &copy; ${year} Mind Sovereignty &middot; You received this because you completed
              our Digital Health Assessment.<br />No spam, ever.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ── Handler ───────────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (parseErr) {
      console.error('Catch Error — failed to parse request body:', parseErr)
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { record } = body as { record?: Record<string, unknown> }
    console.log('Received record:', JSON.stringify(record ?? null))

    if (!record) {
      console.error('Catch Error — no record in payload. Body keys:', Object.keys(body))
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const email       = typeof record.email === 'string' ? record.email.trim() : ''
    const profileType = typeof record.profile_type === 'string' ? record.profile_type : ''
    const rawScores   = record.radar_scores
    const rawAudit    = record.audit_data

    if (!email) {
      console.error('Catch Error — record.email is missing or empty.')
      return new Response(JSON.stringify({ error: 'Missing email in record' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Parse leakage scores
    let scores: Record<string, number> = {}
    if (rawScores && typeof rawScores === 'object' && !Array.isArray(rawScores)) {
      scores = rawScores as Record<string, number>
    } else if (typeof rawScores === 'string') {
      try { scores = JSON.parse(rawScores) } catch { /* ignore */ }
    }

    // Parse audit data (interests, severity, usageHours, etc.)
    let auditData: Record<string, string> = {}
    if (rawAudit && typeof rawAudit === 'object' && !Array.isArray(rawAudit)) {
      auditData = rawAudit as Record<string, string>
    } else if (typeof rawAudit === 'string') {
      try { auditData = JSON.parse(rawAudit) } catch { /* ignore */ }
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('Catch Error — RESEND_API_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('Attempting Resend with email:', email)

    const html    = buildEmail(email, profileType, scores, auditData)
    const resResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Mind Sovereignty <onboarding@resend.dev>',
        to:      [email],
        subject: 'Your Sovereignty Assessment & 4-Week Roadmap',
        html,
      }),
    })

    const resBody = await resResp.json()

    if (!resResp.ok) {
      console.error('Catch Error — Resend API rejected the request:', JSON.stringify(resBody))
      return new Response(JSON.stringify({ error: 'Resend API error', detail: resBody }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('Resend success. Email ID:', resBody.id)
    return new Response(JSON.stringify({ success: true, id: resBody.id }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Catch Error — unhandled exception:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
