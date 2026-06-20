import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — set them in the environment before starting the app."
  );
}

// createBrowserClient stores the session and PKCE code verifier in cookies
// (not localStorage), so cookies are sent with every server request and
// visible to proxy.ts middleware.
// It is a singleton internally — multiple imports return the same cached client.
//
// detectSessionInUrl is disabled: app/auth/complete/page.tsx exchanges the
// PKCE code explicitly and deliberately. Leaving the default (true) makes the
// SDK auto-detect the same ?code= param on that page during client init and
// race its own internal exchange against the explicit one — the loser sees
// the verifier already deleted (AuthPKCECodeVerifierMissingError).
export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  auth: { detectSessionInUrl: false },
});