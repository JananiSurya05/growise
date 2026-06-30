-- GroWise - Razorpay webhook write path (Phase 3 of payment integration)
--
-- PROBLEM: the Razorpay webhook is server-to-server with no Supabase user
-- session - it can only reach Postgres as the `anon` role via PostgREST,
-- using the same anon key that's public in every browser bundle. Any
-- EXECUTE grant to `anon` is therefore callable by anyone on the internet,
-- not just our webhook route. Verifying Razorpay's HMAC signature in the
-- Next.js route and only *then* calling an unguarded RPC would NOT be safe:
-- an attacker could skip the Next.js layer entirely and call
-- rest/v1/rpc/apply_razorpay_webhook directly with a forged order id.
--
-- FIX: same SECURITY DEFINER pattern as public.is_government() in
-- 20260621100000_fix_users_crops_orders_rls_recursion.sql, but here the
-- definer function does a WRITE, so the safety property is different:
-- is_government() is safe to expose because it's a side-effect-free read;
-- apply_razorpay_webhook() is safe to expose ONLY because the HMAC check
-- happens *inside* the function, before any write - a forged direct call
-- fails the signature check regardless of what it claims.
--
-- OBJECTS CREATED:
--   private.webhook_secrets   - single-row secrets table. Lives in the
--     `private` schema, which PostgREST never serves (only `public` is
--     exposed) - unreachable via the API regardless of grants. RLS is
--     additionally enabled with zero policies as a second, redundant gate:
--     even a direct psql connection as anon/authenticated sees no rows.
--     Only the table owner (and SECURITY DEFINER functions owned by it)
--     can read it, the same mechanism that lets is_government() read
--     public.users without re-entering its RLS policies.
--
--   public.apply_razorpay_webhook(p_payload text, p_signature text)
--     SECURITY DEFINER. Recomputes HMAC-SHA256 of the raw webhook body
--     using the stored secret and compares it to p_signature BEFORE
--     touching public.orders. p_payload must be the exact raw request
--     body Razorpay signed - re-serializing parsed JSON can reorder keys
--     or change whitespace and silently break the signature.
--
--     Residual trade-off, same spirit as the column-level note in
--     20260621150000_orders_razorpay_columns.sql: the signature comparison
--     uses plain text equality, not a constant-time compare. Postgres has
--     no cheap constant-time text compare; the realistic exposure is
--     network jitter masking microsecond differences in a single string
--     compare, which is a low-value timing channel compared to the secret
--     being a 32+ byte HMAC key. Not engineering around it now.
--
--     Once a webhook event passes the signature check, it can only move
--     payment_status pending -> paid (payment.captured) or
--     pending -> failed (payment.failed) - paid is sticky and is never
--     downgraded by a late/out-of-order failed retry, and a stale captured
--     retry on an already-paid row is a no-op (idempotent under Razorpay's
--     webhook retry-on-non-2xx behavior).
--
--   GRANT EXECUTE ... TO anon - this is the only role that will ever call
--   it (the webhook route has no session), and is safe per the comment
--   above. NOT granted to authenticated/public beyond that.
--
-- NOT INCLUDED HERE: the actual secret value. Insert it manually, once,
-- after this migration is applied - see VALIDATION section below. Never
-- commit the real secret to a migration file.
--
-- NOT APPLIED - review and apply manually.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE TABLE private.webhook_secrets (
  service text PRIMARY KEY,
  secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.webhook_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally zero policies - RLS with no policies denies all access to
-- every role except the table owner. Belt-and-suspenders alongside the
-- schema not being exposed by PostgREST at all.

REVOKE ALL ON private.webhook_secrets FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.apply_razorpay_webhook(p_payload text, p_signature text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_secret text;
  v_expected text;
  v_json jsonb;
  v_event text;
  v_order_id text;
  v_payment_id text;
  v_rows int;
BEGIN
  SELECT secret INTO v_secret FROM private.webhook_secrets WHERE service = 'razorpay';
  IF v_secret IS NULL THEN
    RETURN 'config_missing';
  END IF;

  v_expected := encode(hmac(p_payload, v_secret, 'sha256'), 'hex');
  IF v_expected IS DISTINCT FROM p_signature THEN
    RETURN 'invalid_signature';
  END IF;

  BEGIN
    v_json := p_payload::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'invalid_payload';
  END;

  v_event := v_json->>'event';
  v_order_id := v_json->'payload'->'payment'->'entity'->>'order_id';
  v_payment_id := v_json->'payload'->'payment'->'entity'->>'id';

  IF v_order_id IS NULL OR v_payment_id IS NULL THEN
    RETURN 'missing_fields';
  END IF;

  IF v_event = 'payment.captured' THEN
    UPDATE public.orders
      SET payment_status = 'paid',
          razorpay_payment_id = v_payment_id,
          razorpay_signature = p_signature
      WHERE razorpay_order_id = v_order_id
        AND payment_status <> 'paid';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSIF v_event = 'payment.failed' THEN
    UPDATE public.orders
      SET payment_status = 'failed',
          razorpay_payment_id = v_payment_id,
          razorpay_signature = p_signature
      WHERE razorpay_order_id = v_order_id
        AND payment_status = 'pending';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSE
    RETURN 'unrecognized_event';
  END IF;

  IF v_rows = 0 THEN
    RETURN 'no_matching_order';
  END IF;

  RETURN 'updated';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_razorpay_webhook(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_razorpay_webhook(text, text) TO anon;

-- --- ROLLBACK ---
-- REVOKE ALL ON FUNCTION public.apply_razorpay_webhook(text, text) FROM anon;
-- DROP FUNCTION IF EXISTS public.apply_razorpay_webhook(text, text);
-- DROP TABLE IF EXISTS private.webhook_secrets;
-- DROP SCHEMA IF EXISTS private;

-- --- VALIDATION ---
-- 1. After applying, insert the real webhook secret (generate it in
--    Razorpay Dashboard -> Settings -> Webhooks -> Add New Webhook, copy
--    the "Secret" shown there - NOT your RAZORPAY_KEY_SECRET, this is a
--    separate value):
--      INSERT INTO private.webhook_secrets (service, secret)
--      VALUES ('razorpay', 'PASTE_THE_REAL_WEBHOOK_SECRET_HERE');
--
-- 2. Confirm the table is unreachable via the API (expect 404/empty, not data):
--      curl https://YOUR_PROJECT.supabase.co/rest/v1/webhook_secrets \
--           -H "apikey: YOUR_ANON_KEY"
--
-- 3. Confirm the function exists and is owned correctly:
--      SELECT proname, prosecdef FROM pg_proc WHERE proname = 'apply_razorpay_webhook';
--      -- prosecdef should be true (SECURITY DEFINER)
--
-- 4. Confirm the grant:
--      SELECT grantee, privilege_type FROM information_schema.routine_privileges
--      WHERE routine_name = 'apply_razorpay_webhook';
--      -- expect exactly one row: grantee = anon, privilege_type = EXECUTE
--
-- 5. Sanity-check the signature gate directly (should return 'invalid_signature'):
--      SELECT public.apply_razorpay_webhook('{"event":"payment.captured"}', 'not-a-real-signature');
