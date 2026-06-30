-- GroWise — order status lifecycle: add updated_at + farmer status-update RLS
--
-- Confirmed: orders.status has been permanently stuck at "Processing" since
-- insert — no UPDATE policy exists on public.orders at all (grep confirms
-- zero .update() calls anywhere in app/ touch orders.status before this
-- change). This migration adds the missing column and the missing policy
-- needed for app/api/orders/update-status/route.ts to work.
--
-- NOT APPLIED — review and run manually.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Farmer can update their own orders. Same column-restriction limitation as
-- every other ownership-scoped policy in this project (crops, users): RLS is
-- row-level, not column-level — this technically permits a farmer to update
-- ANY column on their own order row via a direct REST/supabase-js call, not
-- just status (e.g. total, consumer_id), same residual trade-off already
-- accepted for "crops: farmer update own" and "users: update own profile".
-- The new API route (app/api/orders/update-status/route.ts) is the actual
-- enforcement point that restricts writes to status+updated_at only and
-- validates the transition — this policy just establishes who is allowed to
-- attempt an update at all.
CREATE POLICY "orders: farmer update own"
  ON public.orders FOR UPDATE
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

-- ─── ROLLBACK ───────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "orders: farmer update own" ON public.orders;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS updated_at;

-- ─── VALIDATION ─────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='orders' AND column_name='updated_at';
--
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE tablename = 'orders' AND cmd = 'UPDATE';
