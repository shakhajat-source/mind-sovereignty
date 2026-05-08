import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DAY_0,
  buildEmailHtml,
  FROM,
} from '../_shared/emailTemplates.ts'

const SIGNUP_URL = 'https://dopamine-heroo.vercel.app/signup'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ─────────────────────────────────────────────────────────────────────────────
   HANDLER
   Called directly from the frontend when the user clicks "Start My Journey".
   1. Inserts a new row into user_journeys
   2. Sends the Day 0 pre-recovery email immediately via Resend
   3. Returns { success, journeyId }
───────────────────────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── Parse and validate body ───────────────────────────────────────────────
  let body: { email?: string; goal?: string | null; userId?: string | null }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const email  = typeof body.email  === 'string' ? body.email.trim().toLowerCase() : ''
  const goal   = typeof body.goal   === 'string' ? body.goal.trim() || null : null
  const userId = typeof body.userId === 'string' ? body.userId : null

  if (!email) {
    return new Response(JSON.stringify({ error: 'email is required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Supabase service-role client (bypasses RLS) ───────────────────────────
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

  // ── 1. Insert new journey row ─────────────────────────────────────────────
  const { data: journey, error: insertErr } = await supabase
    .from('user_journeys')
    .insert({ email, target_goal: goal, user_id: userId })
    .select('id, start_date')
    .single()

  if (insertErr) {
    console.error('Failed to insert journey:', insertErr)
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Build Day 0 email ──────────────────────────────────────────────────
  const html = buildEmailHtml({
    day:      0,
    subject:  DAY_0.subject,
    bodyText: DAY_0.body(goal),
    goal,
    ctaButton: {
      text:        'Begin My Recovery',
      url:         SIGNUP_URL,
      description: 'Join our 4-week email programme and receive guided, tailored advice to redefine your relationship with your phone over the next 4 weeks.',
    },
  })

  // ── 3. Send via Resend ────────────────────────────────────────────────────
  try {
    const resResp = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM,
        to:      [email],
        subject: DAY_0.subject,
        html,
      }),
    })

    if (!resResp.ok) {
      const errBody = await resResp.json()
      console.error('Resend error (Day 0):', errBody)
      // Journey row was created — still return success so the user isn't blocked.
      // The cron will pick up from Day 1 regardless.
      return new Response(
        JSON.stringify({ success: true, journeyId: journey.id, emailSent: false }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`✓ Day 0 pre-recovery email → ${email}`)
  } catch (err) {
    console.error('Unexpected Resend error:', err)
    // Same as above: don't block on email failure
    return new Response(
      JSON.stringify({ success: true, journeyId: journey.id, emailSent: false }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ success: true, journeyId: journey.id, emailSent: true }),
    { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
