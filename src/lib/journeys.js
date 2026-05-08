import { supabase } from './supabase'

export async function startJourney(email, goal = null, userId = null) {
  const { data, error } = await supabase.functions.invoke('start-journey', {
    body: { email, goal, userId },
  })

  if (error) {
    // supabase.functions.invoke wraps non-2xx responses as a generic
    // FunctionsHttpError. error.context is the raw Response — read the
    // actual JSON body from the edge function so the real message surfaces.
    let message = error.message ?? 'Edge function error'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch { /* context not readable — keep original message */ }

    console.error('startJourney error:', message)
    return { data: null, error: { message } }
  }

  return { data, error }
}
