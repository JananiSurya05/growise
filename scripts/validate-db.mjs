#!/usr/bin/env node
// Read-only DB validation CLI — runs catalog/RLS/grant checks directly
// against Postgres (pg_catalog / information_schema aren't reachable via
// the Supabase REST API, only via a direct Postgres connection).
//
// Plain .mjs, not .ts: running TypeScript directly would need ts-node/tsx
// as a new devDependency just for this one script — Node runs .mjs with
// zero extra tooling, so that's what this is.
//
// No table/color libraries either — both are ~15 lines of plain code below,
// not worth a dependency for a single internal CLI.

import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log("  (no rows)");
    return;
  }
  // Union of keys across all rows, not just rows[0] — checks that combine
  // heterogeneously-shaped result sets (e.g. webhook-function's function
  // row + grant rows) would otherwise silently drop columns that don't
  // appear on the first row.
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length))
  );
  const line = (cells) =>
    "  " + cells.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join(" | ");
  console.log(line(cols));
  console.log("  " + widths.map((w) => "-".repeat(w)).join("-+-"));
  for (const r of rows) console.log(line(cols.map((c) => r[c])));
}

const CORE_TABLES = ["users", "crops", "orders", "order_items"];

const CHECKS = {
  "rls-status": {
    description: "RLS enabled/disabled on the 4 core tables",
    async run(client) {
      const { rows } = await client.query(
        `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = ANY($1)
         ORDER BY c.relname`,
        [CORE_TABLES]
      );
      const missing = CORE_TABLES.filter((t) => !rows.some((r) => r.table_name === t));
      const disabled = rows.filter((r) => !r.rls_enabled).map((r) => r.table_name);
      const failures = [
        ...missing.map((t) => `table "${t}" not found`),
        ...disabled.map((t) => `RLS disabled on "${t}"`),
      ];
      return { rows, failures };
    },
  },

  policies: {
    description: "All RLS policies on the 4 core tables",
    async run(client) {
      const { rows } = await client.query(
        `SELECT tablename AS table_name, policyname, cmd, roles, qual, with_check
         FROM pg_policies
         WHERE schemaname = 'public' AND tablename = ANY($1)
         ORDER BY tablename, policyname`,
        [CORE_TABLES]
      );
      // Informational only — there's no fixed "correct" policy count to
      // assert against generically, so this check never fails on its own.
      return { rows, failures: [] };
    },
  },

  "fk-check": {
    description: "Foreign keys on orders and order_items",
    async run(client) {
      const { rows } = await client.query(
        `SELECT tc.table_name, tc.constraint_name, kcu.column_name,
                ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
           AND tc.table_name IN ('orders', 'order_items')
         ORDER BY tc.table_name, tc.constraint_name`
      );
      return { rows, failures: rows.length === 0 ? ["no foreign keys found on orders/order_items"] : [] };
    },
  },

  "payment-columns": {
    description: "payment_status / razorpay_* columns on orders",
    async run(client) {
      const expected = ["payment_status", "razorpay_order_id", "razorpay_payment_id", "razorpay_signature"];
      const { rows } = await client.query(
        `SELECT column_name, data_type, column_default, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = ANY($1)
         ORDER BY column_name`,
        [expected]
      );
      const missing = expected.filter((c) => !rows.some((r) => r.column_name === c));
      return { rows, failures: missing.map((c) => `column "${c}" missing on orders`) };
    },
  },

  "webhook-function": {
    description: "apply_razorpay_webhook exists, SECURITY DEFINER, EXECUTE granted to anon",
    async run(client) {
      const { rows: fnRows } = await client.query(
        `SELECT p.proname AS function_name, p.prosecdef AS security_definer,
                pg_get_function_identity_arguments(p.oid) AS args
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'apply_razorpay_webhook'`
      );
      const { rows: grantRows } = await client.query(
        `SELECT grantee, privilege_type
         FROM information_schema.routine_privileges
         WHERE routine_name = 'apply_razorpay_webhook'
         ORDER BY grantee`
      );
      const rows = [...fnRows.map((r) => ({ check: "function", ...r })), ...grantRows.map((r) => ({ check: "grant", ...r }))];
      const failures = [];
      if (fnRows.length === 0) failures.push("apply_razorpay_webhook function not found");
      else if (!fnRows[0].security_definer) failures.push("apply_razorpay_webhook is not SECURITY DEFINER");
      if (!grantRows.some((r) => r.grantee === "anon" && r.privilege_type === "EXECUTE")) {
        failures.push("EXECUTE not granted to anon");
      }
      // postgres (owner) and service_role (Supabase's RLS-bypass role) having
      // EXECUTE is expected and not a new exposure. authenticated is not —
      // the design intent is anon-only; Supabase's default privilege rule
      // (ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO anon,
      // authenticated, service_role) grants it automatically on every
      // CREATE FUNCTION in public, and a plain REVOKE ALL FROM PUBLIC
      // doesn't undo a grant made directly to a named role.
      if (grantRows.some((r) => r.grantee === "authenticated" && r.privilege_type === "EXECUTE")) {
        failures.push("EXECUTE also granted to authenticated (intent is anon-only — see migration comments)");
      }
      return { rows, failures };
    },
  },

  "webhook-sanity": {
    description: "apply_razorpay_webhook rejects a forged call (no crash, no false accept)",
    async run(client) {
      const { rows } = await client.query(
        `SELECT public.apply_razorpay_webhook('{"event":"payment.captured"}', 'not-a-real-signature') AS result`
      );
      const result = rows[0]?.result;
      const acceptable = ["config_missing", "invalid_signature"];
      const failures = acceptable.includes(result)
        ? []
        : [`unexpected result "${result}" — expected one of: ${acceptable.join(", ")}`];
      return { rows, failures };
    },
  },
};

async function main() {
  loadEnvLocal();

  const requested = process.argv.slice(2);
  const names = requested.length > 0 ? requested : Object.keys(CHECKS);
  const unknown = names.filter((n) => !CHECKS[n]);
  if (unknown.length > 0) {
    console.error(`${RED}Unknown check(s): ${unknown.join(", ")}${RESET}`);
    console.error(`Available checks: ${Object.keys(CHECKS).join(", ")}`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${RED}DATABASE_URL is not set.${RESET}`);
    console.error("");
    console.error("This script needs a direct Postgres connection (not the anon key) because");
    console.error("it queries pg_catalog / information_schema, which PostgREST doesn't expose.");
    console.error("");
    console.error("To get it: Supabase Dashboard -> your project -> Settings -> Database ->");
    console.error("Connection string -> URI. Copy it, substitute your database password, and");
    console.error("add it to .env.local (gitignored) as:");
    console.error("  DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@...supabase.co:5432/postgres");
    console.error("");
    console.error("Either the direct connection (port 5432) or the session pooler (port 6543)");
    console.error("works for this script — both expose the same catalogs. This is available on");
    console.error("the free tier; there is no plan restriction on the connection string itself.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    // Supabase's managed Postgres terminates TLS with a cert chain that
    // node's default CA bundle doesn't always validate cleanly in local
    // dev environments. Connection is still encrypted; this only relaxes
    // chain verification, the same trade-off Supabase's own quick-start
    // snippets for node-postgres use.
    ssl: { rejectUnauthorized: false },
  });

  let exitCode = 0;
  try {
    await client.connect();
  } catch (err) {
    console.error(`${RED}Could not connect to the database: ${err.message}${RESET}`);
    process.exit(1);
  }

  try {
    for (const name of names) {
      const check = CHECKS[name];
      console.log(`\n${YELLOW}=== ${name} ${RESET}- ${check.description}`);
      try {
        const { rows, failures } = await check.run(client);
        printTable(rows);
        if (failures.length === 0) {
          console.log(`${GREEN}PASS${RESET}`);
        } else {
          exitCode = 1;
          for (const f of failures) console.log(`${RED}FAIL: ${f}${RESET}`);
        }
      } catch (err) {
        exitCode = 1;
        console.log(`${RED}ERROR running "${name}": ${err.message}${RESET}`);
      }
    }
  } finally {
    await client.end();
  }

  console.log("");
  if (exitCode === 0) {
    console.log(`${GREEN}All checks passed.${RESET}`);
  } else {
    console.log(`${RED}One or more checks failed — see above.${RESET}`);
  }
  process.exit(exitCode);
}

main();
