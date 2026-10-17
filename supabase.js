/* Digi Aura — Supabase client
   ------------------------------------------------------------------------
   Paste your project's URL and PUBLIC anon (publishable) key below.
   (Dashboard > Project Settings > API.)

   The anon key is designed to be public: it is safe in browser code ONLY
   because Row Level Security (supabase/schema.sql) limits what it can do.
   NEVER put the service_role / secret key in this file or anywhere in the
   browser.
   ------------------------------------------------------------------------ */
const SUPABASE_URL = "https://bfowivsnhbcofqeqzvuh.supabase.co";           // e.g. https://abcdxyz.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_1lis6aL-i8YruGCwtG3vWA_Zkv3qV3Y"; // public anon / publishable key

const DigiAuraSupabase = (function () {
  "use strict";
  let client = null;

  function isConfigured() {
    return (
      typeof SUPABASE_URL === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(SUPABASE_URL.trim()) &&
      typeof SUPABASE_ANON_KEY === "string" && SUPABASE_ANON_KEY.length > 40 &&
      !SUPABASE_ANON_KEY.startsWith("YOUR_")
    );
  }

  function getClient() {
    if (client) return client;
    if (!isConfigured()) return null;
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    client = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  return { isConfigured, getClient };
})();
