import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This client connects your frontend to the pkiviewfgzspwzpvazjm project
export const supabase = createClient(supabaseUrl, supabaseKey)