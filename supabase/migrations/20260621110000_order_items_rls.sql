-- GroWise — secure public.order_items
-- Confirmed live: RLS already enabled on order_items, zero policies exist
-- (SELECT FROM pg_policies WHERE tablename='order_items' returns 0 rows;
-- anon-key INSERT returns 42501 "new row violates row-level security policy").
-- NOT APPLIED — review and run manually.

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

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

-- ─── ROLLBACK ───────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "order_items: consumer reads via order" ON public.order_items;
-- DROP POLICY IF EXISTS "order_items: farmer reads via order" ON public.order_items;
-- DROP POLICY IF EXISTS "order_items: consumer insert via own order" ON public.order_items;
-- DROP POLICY IF EXISTS "order_items: consumer delete via own order" ON public.order_items;
-- (RLS left enabled on rollback — reverting to "RLS on, zero policies" is
-- strictly safer than disabling RLS.)

-- ─── VALIDATION ─────────────────────────────────────────────────────────────
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'order_items'
-- ORDER BY cmd;
