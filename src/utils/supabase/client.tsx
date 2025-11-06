import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

// Create a single shared Supabase client instance to avoid multiple GoTrueClient warnings
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
