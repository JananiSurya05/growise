-- GroWise - close the users.role self-assignment privilege escalation
--
-- THREAT MODEL
-- ------------
-- public.users is the authorization boundary for the whole app: proxy.ts
-- reads users.role (proxy.ts:76-85) to decide whether a session may enter
-- /farmer, /consumer, or /government. There is no service-role key in the
-- app - every browser/native client talks to Postgres as `anon` or
-- `authenticated` via the public anon key.
--
-- The users RLS policies (rls.sql) check row OWNERSHIP (auth.uid() = id) but
-- never the VALUE of the role column:
--   "users: insert own profile"  WITH CHECK (auth.uid() = id)
--   "users: update own profile"  USING/WITH CHECK (auth.uid() = id)
-- So any authenticated user can set role = 'government' on their OWN row and
-- pass RLS. Two ways in, both currently open:
--   1. UPDATE: PATCH /rest/v1/users?id=eq.<self> {"role":"government"} with
--      the anon key, bypassing the app's sanitizeRole() entirely.
--   2. INSERT (the worse one): the signup UI itself renders a "government /
--      Admin Portal" tile (app/login/page.tsx) and sanitizeRole() treats
--      'government' as VALID, so /auth/complete's upsert writes
--      role='government' on the very first INSERT. No PATCH needed - the
--      front door grants it. A fix that only froze UPDATE would be useless.
-- Either path unlocks the government dashboard + every consumer's/farmer's
-- order history and PII (the "orders: government reads all" /
-- "order_items: government reads all" policies in rls.sql).
-- Documented as KNOWN ISSUES in rls.sql; never closed until this migration.
--
-- FIX
-- ---
-- A BEFORE INSERT OR UPDATE row trigger on public.users that constrains the
-- role column for client roles (anon/authenticated) only:
--   * INSERT: 'farmer'/'consumer' are self-service and pass through (normal
--     signup is unchanged - both are scoped to auth.uid() by RLS and carry no
--     cross-user access). 'government', NULL, or any unknown value is coerced
--     to the safe default 'consumer'. This closes self-promotion even via the
--     Admin Portal tile.
--   * UPDATE: role is immutable - any client-supplied change is reset to the
--     stored OLD.role. A returning user re-logging in with a different tile
--     (the upsert in auth/complete + capacitor-auth re-sends role on EVERY
--     login) is silently kept at their real role; email/name still update and
--     the upsert still succeeds, so no login flow breaks.
--
-- Why a trigger and not RLS or an RPC:
--   * RLS WITH CHECK can reject a bad role but cannot COERCE it to a default,
--     so first-signup via the Admin Portal tile would hard-fail instead of
--     degrading to consumer; RLS also has no clean OLD.role reference to
--     "freeze to previous value". A trigger can read OLD and rewrite NEW.
--   * A SECURITY DEFINER RPC owning role assignment is the cleaner long-term
--     design but would require rewriting both upsert call sites
--     (app/auth/complete + app/lib/capacitor-auth) - out of scope for this
--     surgical DB-only fix. Same SECURITY DEFINER spirit as is_government()
--     in 20260621100000, deferred here on purpose.
--
-- PROVISIONING A REAL GOVERNMENT ACCOUNT (the only legitimate path):
--   The trigger checks current_user and SKIPS enforcement for the privileged
--   backend roles - service_role (the service key, which the app does NOT
--   ship) and postgres/supabase_admin (the SQL editor). So an admin mints or
--   promotes a government account by running, as those roles:
--     UPDATE public.users SET role = 'government' WHERE id = '<uuid>';
--   anon/authenticated can never reach that branch. Triggers (unlike RLS) are
--   NOT bypassed by service_role automatically, which is exactly why this
--   explicit allowlist is required - without it, government accounts would
--   become impossible to create at all.
--
-- SCOPE: touches only public.users (one function + one trigger). No other
-- table, policy, or application file is modified. Idempotent / safe to re-run.
--
-- NOT APPLIED - review and apply manually.

-- Guard: fail loudly rather than install a trigger against a missing column
-- (so this migration can never silently no-op).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'public.users.role does not exist - aborting role-guard install';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_user_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER          -- run as the caller so current_user reflects who wrote
SET search_path = public
AS $$
BEGIN
  -- Privileged backend roles are the ONLY legitimate way to assign 'government'.
  -- They bypass the guard entirely. Every browser/native client is anon or
  -- authenticated and falls through to enforcement below.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Self-service signup may claim 'farmer' or 'consumer' only. Anything else
    -- (incl. 'government', NULL, or an unrecognized value) becomes 'consumer'.
    IF NEW.role IS NULL OR NEW.role NOT IN ('farmer', 'consumer') THEN
      RAISE WARNING 'enforce_user_role_guard: coerced INSERT role % -> consumer for id %',
        coalesce(NEW.role, '<null>'), NEW.id;
      NEW.role := 'consumer';
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Role is frozen post-creation for clients. Reset any change to the stored
    -- value (no error: keeps the upsert-on-every-login flow working).
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE WARNING 'enforce_user_role_guard: blocked role change % -> % for id %',
        coalesce(OLD.role, '<null>'), coalesce(NEW.role, '<null>'), NEW.id;
      NEW.role := OLD.role;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- DROP + CREATE (rather than CREATE OR REPLACE TRIGGER) for unambiguous
-- idempotency on every supported Postgres version.
DROP TRIGGER IF EXISTS enforce_user_role_guard ON public.users;
CREATE TRIGGER enforce_user_role_guard
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_role_guard();

-- --- ROLLBACK ---
-- DROP TRIGGER IF EXISTS enforce_user_role_guard ON public.users;
-- DROP FUNCTION IF EXISTS public.enforce_user_role_guard();

-- --- VALIDATION ---
-- Run these in the Supabase SQL editor (you connect as postgres there, so the
-- trigger's privileged bypass applies to YOU - that is expected; the point is
-- to confirm the anon/authenticated paths are now closed).
--
-- 1. Confirm the trigger is installed (expect 1 row):
--      SELECT tgname, tgenabled FROM pg_trigger
--      WHERE tgrelid = 'public.users'::regclass AND NOT tgisinternal
--        AND tgname = 'enforce_user_role_guard';
--
-- 2. Audit any rows that may have self-escalated BEFORE this fix (review
--    manually - this migration does NOT auto-remediate existing data):
--      SELECT id, email, role FROM public.users WHERE role = 'government';
--
-- 3. Prove a CLIENT cannot self-promote. Authenticated as a normal user
--    (anon key, NOT the SQL editor), run against the REST API:
--      PATCH /rest/v1/users?id=eq.<your-own-id>   {"role":"government"}
--    then re-read your row:
--      GET   /rest/v1/users?id=eq.<your-own-id>&select=role
--    Expected: role is still 'consumer'/'farmer' - the PATCH was accepted
--    (200) but the trigger reset role; a WARNING is emitted in the DB logs.
--
-- 4. Prove first-signup self-assignment of government is coerced. As an
--    authenticated brand-new user (or simulate via a SET ROLE test below):
--      BEGIN;
--        SET LOCAL ROLE authenticated;
--        INSERT INTO public.users (id, email, name, role)
--        VALUES (gen_random_uuid(), 'x@example.com', 'X', 'government')
--        RETURNING role;     -- expect 'consumer', not 'government'
--      ROLLBACK;
--
-- 5. Prove an admin CAN still provision government (you are postgres here, so
--    the bypass applies):
--      UPDATE public.users SET role = 'government' WHERE id = '<uuid>';
--      -- succeeds; role becomes 'government'.
