import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeStorage } from '../utils/storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'CRITICAL CONFIGURATION ERROR: Supabase environment variables EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are missing. Please configure them in your .env file.',
  );
}

declare global {
  var __FILMLY_SUPABASE_CLIENT__: SupabaseClient | undefined;
}

function createFilmlySupabaseClient() {
  console.log('[AUTH] SUPABASE_CLIENT_CREATED');

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    },
  );
}

export const supabase = globalThis.__FILMLY_SUPABASE_CLIENT__ ?? createFilmlySupabaseClient();

globalThis.__FILMLY_SUPABASE_CLIENT__ = supabase;

export default supabase;
