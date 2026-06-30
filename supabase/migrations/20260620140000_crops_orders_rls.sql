-- GroWise — Enable RLS on public.crops and public.orders
--
-- Schema/columns referenced below were inferred from application code
-- (app/lib/types.ts, and every from("crops")/from("orders") call site under
-- app/), not from a live schema pull — this environment had no Supabase
-- access token / linked project to run `supabase db pull`. Verify column
-- names match the live schema before applying.
--
-- DO NOT run `supabase db push` — review and apply manually after approval.
--
-- This file enables RLS and creates policies for the SAME table in the SAME
-- statement block, per the no-RLS-without-policies constraint: each table's
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is immediately followed by all of
-- that table's CREATE POLICY statements, with no other table's ALTER in
-- between. Supabase CLI runs each migration file in a single transaction by
-- default, so there is no window where RLS is enabled with zero policies.

-- ─────────────────────────────────────────────────
-- 1. crops
-- ─────────────────────────────────────────────────
-- Usage found in code:
--   SELECT (status='Active' filter)   → consumer/shop, consumer/qr,
--                                        market-intelligence API, consumer/personalized API
--   SELECT (own, incl. inactive)      → farmer/crops, farmer dashboard
--   SELECT (all rows, no filter)      → government dashboard
--   INSERT (farmer_id = auth.uid())   → farmer/crops addCrop()
--   DELETE (farmer_id = auth.uid())   → farmer/crops deleteCrop()
--   UPDATE                            → not called anywhere in current app code;
--                                        policy included anyway (least-privilege,
--                                        owner-scoped) so a future edit-listing
--                                        feature doesn't silently get RLS-blocked.

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crops: active visible to authenticated"
  ON public.crops FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'Active');

CREATE POLICY "crops: farmer reads own (incl. inactive)"
  ON public.crops FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "crops: government reads all"
  ON public.crops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'government'
    )
  );

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
-- 2. orders
-- ─────────────────────────────────────────────────
-- Usage found in code:
--   SELECT (consumer_id = auth.uid()) → consumer/orders, consumer dashboard,
--                                        consumer/personalized API
--   SELECT (farmer_id = auth.uid())   → farmer/sales, farmer dashboard, insights API
--   SELECT (all rows, no filter)      → government dashboard
--   INSERT (consumer_id = auth.uid()) → consumer/shop placeOrder()
--   DELETE (consumer_id = auth.uid()) → consumer/shop rollback, consumer/orders deleteOrder()
--   UPDATE                            → no endpoint exists in the app today (no
--                                        service-role key in this codebase — order
--                                        status changes are not currently
--                                        implemented at all). No UPDATE policy
--                                        added; matches current functionality
--                                        exactly. Add one when a status-update
--                                        path is built.
--
-- NOTE (not enforced here — flagging only): placeOrder() lets the client supply
-- farmer_id directly in the INSERT payload from cart data, with nothing
-- checking it actually matches the crop's real owner. RLS below restricts WHO
-- can insert (the consumer must own the row), but not whether farmer_id is
-- truthful. Out of scope for "restrict writes to the resource owner" as
-- literally asked — call out separately if you want a CHECK tying farmer_id to
-- crops.farmer_id for the given crop_id.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

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

-- ─────────────────────────────────────────────────
-- 3. order_items — OPTIONAL, not explicitly in scope ("crops and orders" only)
-- ─────────────────────────────────────────────────
-- Included because order_items is currently presumed equally exposed (same
-- "no RLS" state as crops/orders), and app/consumer/orders/page.tsx deletes
-- order_items rows by order_id with NO ownership filter on that call —
-- correctness depends entirely on RLS to stop a consumer deleting another
-- consumer's order_items. Remove this section if you want order_items handled
-- in a separate migration/review.
--
-- Usage found in code:
--   SELECT (via parent order, consumer)  → consumer/orders (in_(order_ids) batch fetch)
--   SELECT (via parent order, farmer)    → farmer/sales (embedded join on orders)
--   SELECT (all, no filter)              → not found in current app code (no
--                                           government order_items view exists
--                                           today — omitted; add if needed later)
--   INSERT (via parent order, consumer)  → consumer/shop placeOrder()
--   DELETE (via parent order, consumer)  → consumer/shop rollback, consumer/orders deleteOrder()

-- ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "order_items: consumer reads via order"
--   ON public.order_items FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.orders
--       WHERE orders.id = order_items.order_id
--         AND orders.consumer_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "order_items: farmer reads via order"
--   ON public.order_items FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.orders
--       WHERE orders.id = order_items.order_id
--         AND orders.farmer_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "order_items: consumer insert via own order"
--   ON public.order_items FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.orders
--       WHERE orders.id = order_items.order_id
--         AND orders.consumer_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "order_items: consumer delete via own order"
--   ON public.order_items FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.orders
--       WHERE orders.id = order_items.order_id
--         AND orders.consumer_id = auth.uid()
--     )
--   );
