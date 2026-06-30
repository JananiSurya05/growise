import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — set them in the environment before starting the app."
  );
}

// Plain anon-key client with no cookie/session handling — for server-to-server
// callers that have no Supabase user session at all (e.g. the Razorpay
// webhook). Distinct from supabase.ts (browser, cookie-backed session) and
// supabase-server.ts (reads the caller's session from request cookies).
export const supabaseAnon = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});
