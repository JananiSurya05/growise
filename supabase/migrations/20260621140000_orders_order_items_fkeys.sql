-- GroWise — add missing foreign keys (I7), same pattern as crops_farmer_id_fkey
--
-- Confirmed live via direct relationship probing (PGRST200 on embedded-join
-- attempts), same method that found crops.farmer_id missing:
--   orders.consumer_id   -> no relationship found
--   orders.farmer_id     -> no relationship found
--   order_items.crop_id  -> no relationship found
--
-- Orphan check run by user in Supabase SQL Editor before this migration was
-- written, three separate queries, all "Success. No rows returned":
--   orders.consumer_id referencing a nonexistent users.id   -> 0 rows
--   orders.farmer_id referencing a nonexistent users.id     -> 0 rows
--   order_items.crop_id referencing a nonexistent crops.id  -> 0 rows
-- Safe to add NOT VALID-free (no existing row violates any of these).
--
-- NOT APPLIED — review and run manually.

ALTER TABLE public.orders
  ADD CONSTRAINT orders_consumer_id_fkey
  FOREIGN KEY (consumer_id) REFERENCES public.users(id);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.users(id);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_crop_id_fkey
  FOREIGN KEY (crop_id) REFERENCES public.crops(id);

-- ─── ROLLBACK ───────────────────────────────────────────────────────────────
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_consumer_id_fkey;
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_farmer_id_fkey;
-- ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_crop_id_fkey;

-- ─── VALIDATION ─────────────────────────────────────────────────────────────
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE contype = 'f'
--   AND conrelid IN ('public.orders'::regclass, 'public.order_items'::regclass)
-- ORDER BY conrelid::regclass::text, conname;
-- -> should include:
--    orders_consumer_id_fkey    | orders      | users
--    orders_farmer_id_fkey      | orders      | users
--    order_items_crop_id_fkey   | order_items | crops
--    (plus the pre-existing orders_crop_id_fkey and order_items_order_id_fkey,
--     already confirmed present before this migration)
