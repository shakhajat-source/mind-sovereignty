import { supabase } from './supabase'

/**
 * Insert a new row into user_journeys to begin the 28-day email programme.
 *
 * @param {string} email       - The user's email address
 * @param {string|null} goal   - Their target_goal (from Step 6 of the quiz)
 * @returns {{ data, error }}  - The inserted row or an error object
 */
export async function startJourney(email, goal = null) {
  const { data, error } = await supabase
    .from('user_journeys')
    .insert({
      email:       email.trim().toLowerCase(),
      target_goal: goal?.trim() || null,
      // start_date, current_day, and status all use their column defaults
    })
    .select('id, start_date')
    .single()

  if (error) {
    console.error('startJourney error:', error)
  }

  return { data, error }
}
