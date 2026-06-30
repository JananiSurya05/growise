-- GroWise — fix infinite RLS recursion between public.users and public.crops/orders
--
-- CONFIRMED LIVE via direct REST calls (anon key, no auth) immediately before
-- writing this migration:
--   GET /rest/v1/users  → 500 {"code":"42P17","message":"infinite recursion
--     detected in policy for relation \"users\""}
--   GET /rest/v1/crops  → 500 {"code":"42P17","message":"... relation \"crops\""}
--   GET /rest/v1/orders → 500 {"code":"42P17","message":"... relation \"users\""}
--
-- Root cause: "crops: government reads all" and "orders: government reads
-- all" (from 20260620140000_crops_orders_rls.sql) each do
--   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'government')
-- which requires evaluating public.users's SELECT policies. One of those is
-- "users: name visible for active-listing farmers" (from
-- 20260620150000_users_public_farmer_name.sql), which does
--   EXISTS (SELECT 1 FROM public.crops WHERE crops.farmer_id = users.id AND crops.status = 'Active')
-- which requires evaluating public.crops's SELECT policies — including the
-- government one above. crops → users → crops → users → ... Postgres detects
-- the cycle and aborts with 42P17. Each migration was correct in isolation;
-- the cycle only exists because both are live simultaneously.
--
-- Fix: move the "is this uid a government user" check into a SECURITY
-- DEFINER function. Such a function runs with its owner's privileges
-- (the table owner in Supabase, which bypasses RLS on public.users by
-- default), so its internal lookup never re-enters public.users's policies —
-- breaking the cycle without changing who can read what.
--
-- DO NOT run `supabase db push` — review and apply manually after approval.
-- Does not touch application code or business logic — RLS only.

CREATE OR REPLACE FUNCTION public.is_government(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = uid AND role = 'government'
  );
$$;

REVOKE ALL ON FUNCTION public.is_government(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_government(uuid) TO authenticated;

DROP POLICY IF EXISTS "crops: government reads all" ON public.crops;
CREATE POLICY "crops: government reads all"
  ON public.crops FOR SELECT
  USING (public.is_government(auth.uid()));

DROP POLICY IF EXISTS "orders: government reads all" ON public.orders;
CREATE POLICY "orders: government reads all"
  ON public.orders FOR SELECT
  USING (public.is_government(auth.uid()));

-- ─────────────────────────────────────────────────
-- ROLLBACK (only if this fix itself needs to be undone — re-applying this
-- recreates the recursion, since it restores the direct cross-table EXISTS
-- that caused it):
-- ─────────────────────────────────────────────────
--
-- DROP POLICY "crops: government reads all" ON public.crops;
-- CREATE POLICY "crops: government reads all"
--   ON public.crops FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE id = auth.uid() AND role = 'government'
--     )
--   );
--
-- DROP POLICY "orders: government reads all" ON public.orders;
-- CREATE POLICY "orders: government reads all"
--   ON public.orders FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE id = auth.uid() AND role = 'government'
--     )
--   );
--
-- DROP FUNCTION IF EXISTS public.is_government(uuid);
