import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ── Pillar labels ─────────────────────────────────────────────────────────── */
const PILLAR_LABELS: Record<string, string> = {
  focus_endurance:     'Focus Endurance',
  digital_autonomy:    'Digital Autonomy',
  boundary_integrity:  'Boundary Integrity',
  emotional_stability: 'Emotional Stability',
  utility_efficiency:  'Utility Efficiency',
}

/* ── Profile display name ─────────────────────────────────────────────────── */
const PROFILE_NAME: Record<string, string> = {
  work_admin:   'The Productive Procrastinator',
  social_doom:  'The Passive Consumer',
  own_social:   'The Social Validator',
  games_videos: 'The Escape Artist',
  utility:      'The Utility User',
  fomo:         'The FOMO Reactor',
}

/* ── Radar score rows — clean text fallback if scores are empty ───────────── */
function radarBars(scores: Record<string, number>): string {
  const entries = Object.entries(scores).filter(([key]) => key in PILLAR_LABELS)

  if (entries.length === 0) {
    return `<tr><td style="font-size:12px;color:#aaa;font-family:Inter,sans-serif;">
      No score data available.</td></tr>`
  }

  return entries
    .map(([key, rawVal]) => {
      const val    = Math.min(100, Math.max(0, Number(rawVal) || 0))
      const label  = PILLAR_LABELS[key]
      const colour = val >= 65 ? '#5c8260' : val >= 45 ? '#b8860b' : '#b03a2e'
      const barW   = Math.round(val * 1.8) // max 180px at 100

      return `
        <tr>
          <td style="padding:5px 0;width:150px;font-size:12px;color:#888;
                     font-family:Inter,sans-serif;vertical-align:middle;">${label}</td>
          <td style="padding:5px 10px;vertical-align:middle;">
            <div style="background:#eeece9;border-radius:2px;height:6px;width:180px;">
              <div style="background:${colour};height:6px;width:${barW}px;
                          border-radius:2px;"></div>
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
  toEmail: string,
  profileType: string,
  scores: Record<string, number>,
): string {
  const profileName = PROFILE_NAME[profileType] ?? 'Digital Sovereignty Seeker'
  const year        = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Sovereignty Recovery Plan</title>
</head>
<body style="margin:0;padding:0;background:#f2f0ed;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#f2f0ed;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="padding:40px 48px 28px;border-bottom:1px solid #eeece9;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;
                      text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Mind Sovereignty
            </p>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#2c2c2c;
                       font-family:Outfit,Inter,sans-serif;line-height:1.15;">
              Your Sovereignty Recovery Plan
            </h1>
            <p style="margin:6px 0 0;font-size:13px;color:#5c8260;
                      font-family:Inter,sans-serif;font-weight:500;">
              ${profileName}
            </p>
          </td>
        </tr>

        <!-- Sovereignty Scores -->
        <tr>
          <td style="padding:32px 48px;border-bottom:1px solid #eeece9;">
            <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.18em;
                      text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Your Sovereignty Scores
            </p>
            <table cellpadding="0" cellspacing="0">
              ${radarBars(scores)}
            </table>
            <p style="margin:14px 0 0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;">
              Scores range 0–100. Higher = healthier digital relationship.
            </p>
          </td>
        </tr>

        <!-- Week 1: Intent Audit -->
        <tr>
          <td style="padding:32px 48px 0;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;
                      text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 01
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;
                       font-family:Outfit,Inter,sans-serif;">
              The Intent Audit
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;
                      font-family:Inter,sans-serif;">
              Every time you pick up your phone this week, pause for two seconds and ask:
              <em>"What was my intent?"</em> You'll be surprised how often the answer is
              "I don't know." This is the foundation of Sovereignty — converting unconscious
              reach into deliberate choice. Log your audit in a notes app: just write
              <strong>Intent: [reason]</strong> or <strong>Intent: none</strong>.
              Seven days of this data will reveal your true trigger patterns.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#7a9e7e;font-family:Inter,sans-serif;">
              <strong>Your target:</strong> 80% intentional picks by end of week one.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;">
          <hr style="border:none;border-top:1px solid #eeece9;" />
        </td></tr>

        <!-- Week 2: Sovereignty Gates -->
        <tr>
          <td style="padding:0 48px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;
                      text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 02
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;
                       font-family:Outfit,Inter,sans-serif;">
              Sovereignty Gates
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;
                      font-family:Inter,sans-serif;">
              Install friction at the moments your Intent Audit revealed are most vulnerable.
              Sovereignty Gates are simple rules that create a decision point before you enter
              a high-risk context: no phone at the dinner table, phone face-down during the
              first 30 minutes of work, screen off at 10 PM. Choose three gates specific to
              your profile and treat each gate as a locked door you have to consciously
              unlock — not a rule you have to follow.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#7a9e7e;font-family:Inter,sans-serif;">
              <strong>Tool:</strong> Our Browser Focus Plugin can automate your digital gates
              on desktop — free to install.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;">
          <hr style="border:none;border-top:1px solid #eeece9;" />
        </td></tr>

        <!-- Week 3: System Blackout -->
        <tr>
          <td style="padding:0 48px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;
                      text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 03
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;
                       font-family:Outfit,Inter,sans-serif;">
              System Blackout
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;
                      font-family:Inter,sans-serif;">
              A 48-hour phone fast — with a plan. The System Blackout is not about willpower;
              it's about proving to your nervous system that you can survive disconnection.
              Choose a weekend, inform three people, keep a notepad nearby, and observe what
              happens to your anxiety, attention span, and quality of thought. Most people
              report the first four hours are the hardest, then something shifts. What you
              notice after the blackout reveals what the phone was masking.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#7a9e7e;font-family:Inter,sans-serif;">
              <strong>Optional:</strong> Our Phone Lockbox makes this physically effortless.
            </p>
          </td>
        </tr>

        <tr><td style="padding:20px 48px;">
          <hr style="border:none;border-top:1px solid #eeece9;" />
        </td></tr>

        <!-- Week 4: Sovereignty Architecture -->
        <tr>
          <td style="padding:0 48px 32px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;
                      text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">
              Week 04
            </p>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#2c2c2c;
                       font-family:Outfit,Inter,sans-serif;">
              Sovereignty Architecture
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#555;
                      font-family:Inter,sans-serif;">
              Redesign your environment so that the default is presence, not scrolling.
              Sovereignty Architecture means every room, routine, and relationship in your
              life is deliberately organised to make deep attention the path of least
              resistance. Charge your phone outside the bedroom. Delete the apps that failed
              your Intent Audit. Replace them with a physical book, a journal, or simply
              nothing. Architecture beats willpower every time.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#7a9e7e;font-family:Inter,sans-serif;">
              <strong>Next level:</strong> Our Dopamine Recovery Retreat puts Sovereignty
              Architecture into practice over an immersive weekend.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 48px 40px;background:#2c2c2c;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.18em;
                      text-transform:uppercase;color:rgba(255,255,255,0.35);
                      font-family:Inter,sans-serif;">
              Ready to go deeper?
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);
                      font-family:Inter,sans-serif;line-height:1.6;">
              Your basic report is a starting point. The Deep Psychological Assessment goes
              further — reviewed by a trained psychologist and tailored to your exact profile.
            </p>
            <a href="https://mindsovereignty.com/#tools"
               style="display:inline-block;background:#5c8260;color:#fff;
                      font-family:Outfit,Inter,sans-serif;font-size:12px;font-weight:700;
                      letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;
                      padding:14px 28px;">
              Explore Our Tools
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 48px;border-top:1px solid #eeece9;">
            <p style="margin:0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;">
              &copy; ${year} Mind Sovereignty &middot; You received this because you completed
              our Digital Health Assessment.<br />
              No spam, ever.
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
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

    // ── 2. Extract record from Supabase webhook payload ────────────────────
    const { record } = body as { record?: Record<string, unknown> }
    console.log('Received record:', JSON.stringify(record ?? null))

    if (!record) {
      console.error('Catch Error — no record in payload. Body keys:', Object.keys(body))
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Validate email ──────────────────────────────────────────────────
    const email       = typeof record.email === 'string' ? record.email.trim() : ''
    const profileType = typeof record.profile_type === 'string' ? record.profile_type : ''
    const rawScores   = record.radar_scores

    if (!email) {
      console.error('Catch Error — record.email is missing or empty. Record:', record)
      return new Response(JSON.stringify({ error: 'Missing email in record' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. Safely parse radar_scores into Record<string, number> ──────────
    let scores: Record<string, number> = {}
    if (rawScores && typeof rawScores === 'object' && !Array.isArray(rawScores)) {
      scores = rawScores as Record<string, number>
    } else if (typeof rawScores === 'string') {
      try {
        scores = JSON.parse(rawScores)
      } catch {
        console.error('Catch Error — could not parse radar_scores string:', rawScores)
      }
    }
    console.log('Parsed radar_scores:', JSON.stringify(scores))

    // ── 5. Check Resend key ────────────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('Catch Error — RESEND_API_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 6. Send email via Resend ───────────────────────────────────────────
    console.log('Attempting Resend with email:', email)

    const html    = buildEmail(email, profileType, scores)
    const resResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Mind Sovereignty <onboarding@resend.dev>',
        to:      [email],
        subject: 'Your 4-Week Sovereignty Recovery Plan',
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
