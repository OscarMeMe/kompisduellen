import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY måste anges i .env.local')
}

// worker: anslutningens hjärtslag går i en egen tråd (Web Worker), som webbläsaren inte saktar ner när fliken ligger i
// bakgrunden. Annars kan värden tappa anslutningen efter några minuter i en annan flik.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { realtime: { worker: true } })
