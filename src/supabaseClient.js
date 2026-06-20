import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(supabaseUrl && supabaseAnonKey);

if (!hasSupabase) {
  console.warn(
    '✨ Her Library: Supabase URL and Anon Key are missing in environment variables. ' +
    'The app will fall back to using LocalStorage for all read/write operations so you can try it out immediately!'
  );
}

export const supabase = hasSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null;
