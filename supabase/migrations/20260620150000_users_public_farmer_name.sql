-- GroWise — fix RLS gap blocking farmer-name embedded joins
--
-- Problem: app/consumer/shop/page.tsx and app/consumer/qr/page.tsx both do
-- crops.select("...,users:farmer_id(name)") — a PostgREST embedded resource
-- join. PostgREST enforces the JOINED table's RLS per row, with no exception
-- for embeds. The only existing SELECT policy on public.users is
-- "users: read own profile" (auth.uid() = id), so this join returns null for
-- every farmer who isn't the viewing user. Confirmed by the app's own
-- "?? 'Local Farmer'" fallback already masking the null result.
--
-- Fix: add a SELECT policy scoped to farmers who currently have at least one
-- active crop listing (not all users).
--
-- KNOWN LIMITATION (documented, not silently accepted): Postgres RLS is
-- row-level, not column-level. This policy makes the matched farmer's FULL
-- ROW selectable (id, role, name, email, location), not just `name` — it only
-- restricts WHICH ROWS are visible, not which columns. In practice, the app's
-- own query only ever requests the `name` column via the embed, so the actual
-- HTTP response stays minimal — but a user who deliberately queries
-- public.users directly via the REST API for a farmer_id with an active
-- listing could read that farmer's email/location too, not just their name.
-- Closing that fully requires moving this query to a SECURITY DEFINER
-- view/RPC that returns only (id, name) and updating the app to query it
-- instead of the embedded join — a larger change, out of scope for this fix.
-- Flagging as a follow-up, not implementing here per "least disruption."

CREATE POLICY "users: name visible for active-listing farmers"
  ON public.users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.crops
      WHERE crops.farmer_id = users.id AND crops.status = 'Active'
    )
  );
