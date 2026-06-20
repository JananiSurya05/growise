-- GroWise — Supabase Row Level Security Policies
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- IMPORTANT: Run each block and verify no errors before running the next.
-- After applying, use the RLS Tester below each table to confirm.

-- ─────────────────────────────────────────────────
-- 1. Enable RLS on all tables
-- ─────────────────────────────────────────────────
ALTER TABLE public.users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────
-- 2. users table
-- ─────────────────────────────────────────────────
-- Each user can only read, update, and create their own profile.
-- There is no service-role key in this app — /auth/complete upserts the profile
-- row using the anon-key browser client, so authenticated users need an explicit
-- INSERT policy to create their own row (RLS denies INSERT by default otherwise).

CREATE POLICY "users: read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Lets a newly authenticated user create their own profile row (id must match
-- their own auth UID). Does not restrict which columns they set on insert —
-- see KNOWN ISSUES at the bottom of this file re: role self-assignment.
CREATE POLICY "users: insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────
-- 3. crops table
-- ─────────────────────────────────────────────────
-- All authenticated users can view active crops (marketplace).
-- Only the owning farmer can insert/update/delete their crops.

CREATE POLICY "crops: anyone authenticated can view active"
  ON public.crops FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'Active');

CREATE POLICY "crops: farmers can view own inactive crops"
  ON public.crops FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "crops: farmer insert own"
  ON public.crops FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "crops: farmer update own"
  ON public.crops FOR UPDATE
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "crops: farmer delete own"
  ON public.crops FOR DELETE
  USING (auth.uid() = farmer_id);

-- ─────────────────────────────────────────────────
-- 4. orders table
-- ─────────────────────────────────────────────────
-- Consumers see orders they placed.
-- Farmers see orders placed for their crops.
-- Government role sees all orders (analytics).

CREATE POLICY "orders: consumer reads own"
  ON public.orders FOR SELECT
  USING (auth.uid() = consumer_id);

CREATE POLICY "orders: farmer reads own"
  ON public.orders FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "orders: government reads all"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'government'
    )
  );

CREATE POLICY "orders: consumer insert own"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "orders: consumer delete own"
  ON public.orders FOR DELETE
  USING (auth.uid() = consumer_id);

-- Only system/service role can update order status (no anon UPDATE).
-- If you add a status-update endpoint using the service role key, it bypasses RLS.

-- ─────────────────────────────────────────────────
-- 5. order_items table
-- ─────────────────────────────────────────────────
-- Accessible only through the parent order's access rights.

CREATE POLICY "order_items: consumer reads via order"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.consumer_id = auth.uid()
    )
  );

CREATE POLICY "order_items: farmer reads via order"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.farmer_id = auth.uid()
    )
  );

CREATE POLICY "order_items: government reads all"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'government'
    )
  );

CREATE POLICY "order_items: consumer insert via own order"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.consumer_id = auth.uid()
    )
  );

CREATE POLICY "order_items: consumer delete via own order"
  ON public.order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.consumer_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────
-- RLS VERIFICATION QUERIES
-- Run these after applying the policies to confirm behavior.
-- Replace <user_a_id> and <user_b_id> with real UUIDs from your users table.
-- ─────────────────────────────────────────────────

-- Test 1: User A should NOT see User B's profile
-- SELECT * FROM public.users WHERE id = '<user_b_id>';
-- Expected: 0 rows (when authenticated as user_a)

-- Test 2: Farmer A should NOT be able to delete Farmer B's crops
-- DELETE FROM public.crops WHERE id = '<crop_owned_by_farmer_b>';
-- Expected: 0 rows deleted (RLS blocks it)

-- Test 3: Consumer A should NOT see Consumer B's orders
-- SELECT * FROM public.orders WHERE consumer_id = '<user_b_id>';
-- Expected: 0 rows

-- Test 4: Government user should see ALL orders
-- SELECT COUNT(*) FROM public.orders;
-- Expected: full count (when authenticated as government user)

-- ─────────────────────────────────────────────────
-- KNOWN ISSUES / TECHNICAL DEBT
-- ─────────────────────────────────────────────────

-- Role self-assignment (users.role column is not restricted by RLS):
-- Both "users: insert own profile" and "users: update own profile" check row
-- ownership (auth.uid() = id) but not column values. An authenticated user
-- can call the Supabase REST/JS client directly (bypassing the app's
-- sanitizeRole()/ALLOWED_ROLES logic in app/login and app/auth/callback) and
-- set role = 'government' on their own row, granting themselves access to
-- government-only views once proxy.ts permits the role match.
-- Not fixed in this change — out of scope for the INSERT-policy fix. Mitigation
-- options for a future pass: a CHECK constraint limiting role transitions, a
-- BEFORE UPDATE/INSERT trigger that ignores client-supplied role changes after
-- first insert, or moving role assignment to a service-role-only RPC.
