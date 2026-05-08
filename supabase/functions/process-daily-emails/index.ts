import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  EMAIL_SCHEDULE,
  buildEmailHtml,
  FROM,
} from '../_shared/emailTemplates.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCHEDULE_DAYS = [1, 4, 7, 10, 14, 18, 21, 25, 28] as const

/* ─────────────────────────────────────────────────────────────────────────────
   HANDLER
   Triggered daily by a Supabase cron job (see cron setup at the bottom).
   Queries all active journeys, calculates elapsed days, sends the right
   email for each scheduled day, and updates current_day in the DB.
───────────────────────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

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

    // ── 3. Check schedule and guard against double-sends ───────────────────
    const isScheduledDay = (SCHEDULE_DAYS as readonly number[]).includes(daysElapsed)
    const alreadySent    = journey.current_day >= daysElapsed

    if (!isScheduledDay || alreadySent) {
      results.skipped++
      continue
    }

    // ── 4. Build email from shared templates ────────────────────────────────
    const template = EMAIL_SCHEDULE[daysElapsed]
    if (!template) {
      console.warn(`No template found for day ${daysElapsed}`)
      results.skipped++
      continue
    }

    const goal = journey.target_goal ?? null
    const html = buildEmailHtml({
      day:      daysElapsed,
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
        .update({ current_day: daysElapsed })
        .eq('id', journey.id)

      console.log(`✓ Day ${daysElapsed} → ${journey.email}`)
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
