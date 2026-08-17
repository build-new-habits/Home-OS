// js/supabaseClient.js — 17 Aug 2026 v3
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

// v3 — BUG FIX. detectSessionInUrl was false, which broke every email-based
// sign-in path.
//
// supabase-js 2.45.4 defaults to flowType 'implicit', so a magic link or a
// password-reset link returns its tokens in the URL hash:
//   .../Home-OS/#access_token=...&type=magiclink
// The client only reads them when detectSessionInUrl is true. With it false,
// the tokens arrived and were discarded, so the link appeared to "work" and
// then dumped the user back on the sign-in screen with no session and no
// error. It was presumably set false in Phase 2 out of a reasonable fear
// that hash parsing would collide with the app's hash router.
//
// It does not collide. The client only treats a hash as a grant when it
// parses out an access_token or error_description (_isImplicitGrantFlow).
// Our routes parse to a single valueless key — '#/dashboard' yields
// { '/dashboard': '' } — so they are never mistaken for a grant. Verified
// against the vendored bundle before changing this.
//
// After a successful parse the client clears the hash itself, and app.js's
// startRouter() then sets the default route, so the user lands on the
// dashboard rather than on a URL full of credentials.
//
// flowType is pinned explicitly rather than left to the default: implicit
// is what makes `type=recovery` survive the round trip, which is what lets
// app.js tell a password-reset link apart from an ordinary sign-in. Switching
// to 'pkce' here would silently turn every reset link into a plain sign-in.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});
