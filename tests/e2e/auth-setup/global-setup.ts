import type { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Known values — safe to embed (NEXT_PUBLIC_ keys are public by definition)
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://egpifbzkdrhezeyjpgmb.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVncGlmYnprZHJoZXpleWpwZ21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjE3NzYsImV4cCI6MjA5NTA5Nzc3Nn0._FOOdQjgx3nEyqgiDaZ1tjEzcK4l7o_Nq8erK6l_N4k";
const PROJECT_REF = "egpifbzkdrhezeyjpgmb";
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

interface TestUser {
  role: string;
  email: string;
  password: string;
  name: string;
  stateFile: string;
}

const TEST_USERS: TestUser[] = [
  {
    role: "farmer",
    email: process.env.TEST_FARMER_EMAIL ?? "test-farmer@growise.test",
    password: process.env.TEST_FARMER_PASSWORD ?? "TestGroWise2024!",
    name: "Test Farmer",
    stateFile: path.join("tests", "storageState", "farmer.json"),
  },
  {
    role: "consumer",
    email: process.env.TEST_CONSUMER_EMAIL ?? "test-consumer@growise.test",
    password: process.env.TEST_CONSUMER_PASSWORD ?? "TestGroWise2024!",
    name: "Test Consumer",
    stateFile: path.join("tests", "storageState", "consumer.json"),
  },
  {
    role: "government",
    email: process.env.TEST_GOVT_EMAIL ?? "test-govt@growise.test",
    password: process.env.TEST_GOVT_PASSWORD ?? "TestGroWise2024!",
    name: "Test Government",
    stateFile: path.join("tests", "storageState", "government.json"),
  },
];

const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] }, null, 2);

// Encode a Supabase session object into the cookie value format used by
// @supabase/auth-helpers-nextjs createBrowserClient. The format is:
//   base64-<base64url(JSON.stringify(session))>
// Node.js Buffer.from(..., 'utf8').toString('base64url') produces the same
// base64url alphabet (A-Za-z0-9-_, no padding) as the helpers' stringToBase64URL.
function encodeSession(session: object): string {
  const b64 = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `base64-${b64}`;
}

function buildStorageState(session: object): string {
  const cookieValue = encodeSession(session);
  // maxAge mirrors DEFAULT_COOKIE_OPTIONS in @supabase/auth-helpers-nextjs
  const expires = Math.floor(Date.now() / 1000) + 400 * 24 * 3600;
  return JSON.stringify(
    {
      cookies: [
        {
          name: COOKIE_NAME,
          value: cookieValue,
          domain: "localhost",
          path: "/",
          expires,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
    null,
    2
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrCreateSession(supabase: any, user: TestUser): Promise<object | null> {
  // Try sign-in first; fall back to sign-up when user doesn't exist yet.
  // eslint-disable-next-line prefer-const
  let { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid_credentials") ||
      msg.includes("user not found")
    ) {
      const { data: up, error: ue } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: { data: { full_name: user.name } },
      });
      if (ue) {
        console.warn(`  ⚠ [${user.role}] sign-up error: ${ue.message}`);
        return null;
      }
      if (!up.session) {
        console.warn(
          `  ⚠ [${user.role}] signed up but got no session — email confirmation likely required.`
        );
        console.warn(
          `    Fix: Supabase Dashboard → Authentication → Providers → Email → disable "Confirm email"`
        );
        return null;
      }
      data = up;
    } else {
      console.warn(`  ⚠ [${user.role}] sign-in error: ${error.message}`);
      return null;
    }
  }

  if (!data?.session) {
    console.warn(`  ⚠ [${user.role}] no session returned.`);
    return null;
  }

  // Ensure the users table has a role record so the proxy can enforce routes.
  // This uses the anon key and relies on RLS not yet being applied (or INSERT
  // policy for authenticated users). Without this, the proxy defaults all
  // users to "consumer" and farmer/government tests will land on /consumer.
  const { error: upsertErr } = await supabase.from("users").upsert(
    {
      id: data.session.user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    { onConflict: "id" }
  );

  if (upsertErr) {
    console.warn(
      `  ⚠ [${user.role}] users table upsert failed: ${upsertErr.message}`
    );
    console.warn(
      `    Proxy will default this user to "consumer" — farmer/gov tests may redirect unexpectedly.`
    );
  }

  return data.session;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const stateDir = path.join(process.cwd(), "tests", "storageState");
  fs.mkdirSync(stateDir, { recursive: true });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n[Auth Setup] Creating test user sessions...");
  let ok = 0;

  for (const user of TEST_USERS) {
    const statePath = path.join(process.cwd(), user.stateFile);
    const session = await getOrCreateSession(supabase, user);

    if (session) {
      fs.writeFileSync(statePath, buildStorageState(session));
      console.log(`  ✓ [${user.role}] session saved → ${user.stateFile}`);
      ok++;
    } else {
      fs.writeFileSync(statePath, EMPTY_STATE);
      console.log(`  ✗ [${user.role}] unavailable → auth tests will self-skip`);
    }
  }

  if (ok === 0) {
    console.log(
      "\n  To enable authenticated tests, configure Email auth in Supabase:\n" +
        "  Dashboard → Authentication → Providers → Email → enable, disable Confirm email\n"
    );
  } else {
    console.log(`\n  ${ok}/3 sessions ready.\n`);
  }
}
