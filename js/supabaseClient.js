// js/supabaseClient.js — 14 Jul 2026 v1
// Single shared Supabase client. Created once, imported everywhere else.
// No bundler in this build, so the client library is loaded from a pinned
// ESM CDN URL rather than installed as a dependency — this is a locked
// decision for Phase 2 (flagged in the handoff), not left open.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
