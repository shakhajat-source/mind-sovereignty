import { supabase } from './supabase'

/**
 * Start a new 28-day journey for the user.
 *
 * Calls the `start-journey` edge function which:
 *   1. Inserts a row into user_journeys
 *   2. Sends the Day 0 pre-recovery email immediately via Resend
 *
 * @param {string}      email  - The user's email address
 * @param {string|null} goal   - Their target_goal (from Step 6 of the quiz)
 * @returns {{ data: { journeyId, emailSent } | null, error: Error | null }}
 */
export async function startJourney(email, goal = null) {
  const { data, error } = await supabase.functions.invoke('start-journey', {
    body: { email, goal },
  })

  if (error) {
    console.error('startJourney error:', error)
  }

  return { data, error }
}
