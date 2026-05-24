import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DAY_0,
  EMAIL_SCHEDULE,
  buildEmailHtml,
  FROM,
} from '../_shared/emailTemplates.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCHEDULE_DAYS = [1, 4, 7, 10, 14, 18, 21, 25, 28] as const
const TEST_SIGNUP_URL = 'https://dopamine-heroo.vercel.app/signup'

async function sendTemplateEmail(
  day:       number,
  email:     string,
  goal:      string | null,
  resendKey: string,
): Promise<{ ok: true } | { ok: false; status: number; detail: unknown }> {
  const isDay0  = day === 0
  const template = isDay0 ? DAY_0 : EMAIL_SCHEDULE[day]
  if (!template) return { ok: false, status: 400, detail: `no template for day ${day}` }

  const html = buildEmailHtml({
    day,
    subject:  template.subject,
    bodyText: template.body(goal),
    goal,
    ctaButton: isDay0
      ? { text: 'Begin My Recovery', url: TEST_SIGNUP_URL, description: 'Join our 4-week email programme and receive guided, tailored advice to redefine your relationship with your phone over the next 4 weeks.' }
      : undefined,
  })

  const resResp = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    FROM,
      to:      [email],
      subject: `[TEST] ${template.subject}`,
      html,
    }),
  })

  if (!resResp.ok) {
    const detail = await resResp.json().catch(() => resResp.statusText)
    return { ok: false, status: 502, detail }
  }
  return { ok: true }
}

/* ─────────────────────────────────────────────────────────────────────────────
   HANDLER
   Triggered daily by a Supabase cron job (see cron setup at the bottom).
   Queries all active journeys, calculates elapsed days, sends the right
   email for each scheduled day, and updates current_day in the DB.
───────────────────────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Test mode: ?test=<TEST_MODE_KEY>&day=N&email=you@x.com[&goal=...] ────
  // Renders + sends one specific day's template, bypasses the DB entirely.
  // Guarded by TEST_MODE_KEY env secret so it can't be triggered publicly.
  const url     = new URL(req.url)
  const testKey = url.searchParams.get('test')
  const expected = Deno.env.get('TEST_MODE_KEY')
  if (testKey && expected && testKey === expected) {
    const day   = Number(url.searchParams.get('day'))
    const email = url.searchParams.get('email')?.trim().toLowerCase()
    const goal  = url.searchParams.get('goal') || null

    if (!email) {
      return new Response(JSON.stringify({ error: 'email query param required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendTemplateEmail(day, email, goal, resendKey)
    if (!result.ok) {
      return new Response(JSON.stringify({ error: 'send failed', detail: result.detail }), {
        status: result.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ success: true, day, email, mode: 'test' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── 1. Fetch all active journeys ──────────────────────────────────────────
  const { data: journeys, error: fetchErr } = await supabase
    .from('user_journeys')
    .select('id, email, target_goal, start_date, current_day')
    .eq('status', 'active')

  if (fetchErr) {
    console.error('Failed to fetch journeys:', fetchErr)
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const results = { sent: 0, skipped: 0, errors: 0, completed: 0 }
  const today   = new Date()

  for (const journey of journeys ?? []) {

    // ── 2. Calculate elapsed days since journey started ─────────────────────
    const msElapsed   = today.getTime() - new Date(journey.start_date).getTime()
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24))

    // Auto-complete once the 28-day window has fully passed
    if (daysElapsed > 28) {
      await supabase
        .from('user_journeys')
        .update({ status: 'completed', current_day: 28 })
        .eq('id', journey.id)
      results.completed++
      continue
    }

    // ── 3. Find the highest scheduled day this user is owed ────────────────
    // Catch-up approach: pick the highest scheduled day ≤ daysElapsed so a
    // single missed cron run doesn't permanently skip a day's email.
    const targetDay = (SCHEDULE_DAYS as readonly number[])
      .filter(d => d <= daysElapsed)
      .reduce((max, d) => Math.max(max, d), 0)

    if (targetDay === 0 || journey.current_day >= targetDay) {
      results.skipped++
      continue
    }

    // ── 4. Build email from shared templates ────────────────────────────────
    const template = EMAIL_SCHEDULE[targetDay]
    if (!template) {
      console.warn(`No template found for day ${targetDay}`)
      results.skipped++
      continue
    }

    const goal = journey.target_goal ?? null
    const html = buildEmailHtml({
      day:      targetDay,
      subject:  template.subject,
      bodyText: template.body(goal),
      goal,
    })

    // ── 5. Send via Resend ─────────────────────────────────────────────────
    try {
      const resResp = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    FROM,
          to:      [journey.email],
          subject: template.subject,
          html,
        }),
      })

      if (!resResp.ok) {
        console.error(`Resend error for ${journey.email}:`, await resResp.json())
        results.errors++
        continue
      }

      // ── 6. Update current_day so this email isn't sent again ──────────────
      await supabase
        .from('user_journeys')
        .update({ current_day: targetDay })
        .eq('id', journey.id)

      console.log(`✓ Day ${targetDay} → ${journey.email} (daysElapsed=${daysElapsed})`)
      results.sent++

    } catch (err) {
      console.error(`Unexpected error for ${journey.email}:`, err)
      results.errors++
    }
  }

  console.log('process-daily-emails complete:', results)
  return new Response(JSON.stringify({ success: true, results }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})

/* ─────────────────────────────────────────────────────────────────────────────
   CRON SETUP — run once in your Supabase SQL editor

   SELECT cron.schedule(
     'process-daily-emails',
     '0 8 * * *',                           -- daily at 08:00 UTC
     $$
       SELECT net.http_post(
         url     := '<SUPABASE_URL>/functions/v1/process-daily-emails',
         headers := '{"Authorization": "Bearer <ANON_KEY>"}'::jsonb
       )
     $$
   );

   Requires pg_cron + pg_net extensions enabled in your Supabase project.
───────────────────────────────────────────────────────────────────────────── */
