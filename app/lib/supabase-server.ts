import {
  createServerClient as _createServerClient,
  parseCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — set them in the environment before starting the app."
  );
}

export function createServerClient(
  request: Request,
  setCookie?: (name: string, value: string, options: CookieOptions) => void
) {
  return _createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll: () =>
          parseCookieHeader(request.headers.get("cookie") ?? "")
            .map(({ name, value }) => ({ name, value: value ?? "" })),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie?.(name, value, options);
          });
        },
      },
    }
  );
}