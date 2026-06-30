-- GroWise — add missing foreign key crops.farmer_id -> users.id
--
-- Confirmed live via direct query (user-supplied):
--   SELECT conname, conrelid::regclass, confrelid::regclass
--   FROM pg_constraint WHERE conrelid = 'public.crops'::regclass AND contype = 'f';
--   -> 0 rows. No foreign keys exist on crops at all.
--
-- This is why PostgREST's embedded-join syntax users:farmer_id(name) fails
-- with PGRST200 "Could not find a relationship between 'crops' and
-- 'farmer_id'" on every request, in app/consumer/shop/page.tsx:48 and
-- app/consumer/qr/page.tsx:19 — the request fails before RLS is ever
-- evaluated, so no RLS policy change can fix this; the relationship has to
-- be declared at the schema level for PostgREST to resolve it at all.
--
-- NOT APPLIED — review and run manually.

ALTER TABLE public.crops
  ADD CONSTRAINT crops_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.users(id);

-- ─── ROLLBACK ───────────────────────────────────────────────────────────────
-- ALTER TABLE public.crops DROP CONSTRAINT IF EXISTS crops_farmer_id_fkey;

-- ─── VALIDATION ─────────────────────────────────────────────────────────────
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE conrelid = 'public.crops'::regclass AND contype = 'f';
-- -> should now return 1 row: crops_farmer_id_fkey | crops | users
