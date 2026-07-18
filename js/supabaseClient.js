// js/supabaseClient.js — 18 Jul 2026 v2
// Single shared Supabase client. Created once, imported everywhere else.
// No bundler in this build, so previously the client library was loaded
// from a pinned esm.sh CDN URL. That broke the app entirely when offline —
// esm.sh pulls in several more cross-origin sub-files at import time that
// a service worker can't reliably intercept, and since ES modules resolve
// their whole graph before running, a single failed fetch meant app.js
// never executed at all offline. Now imports the vendored, self-contained
// bundle at js/vendor/supabase-js.js instead (see that file's header for
// how it was built) — same-origin, precached like any other shell file.
import { createClient } from './vendor/supabase-js.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
