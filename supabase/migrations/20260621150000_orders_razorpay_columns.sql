-- GroWise - Razorpay payment columns on public.orders (Phase 1 of payment integration)
--
-- Columns:
--   payment_status      - lifecycle: pending (default) -> paid | failed | refunded
--   razorpay_order_id    - set server-side right after order creation (Phase 2),
--                          included in the existing consumer INSERT, no new
--                          INSERT policy needed (covered by
--                          "orders: consumer insert own" already in place)
--   razorpay_payment_id  - set after a successful payment (Phase 2/3)
--   razorpay_signature   - stored for audit/reconciliation, set at the same time
--                          as razorpay_payment_id once HMAC-verified (Phase 3)
--
-- RLS:
--   SELECT - no change needed. RLS is row-level; the existing
--   "orders: consumer reads own" / "orders: farmer reads own" /
--   "orders: government reads all" policies already cover these new columns
--   on rows they can already see.
--
--   INSERT - no change needed. razorpay_order_id is set in the same INSERT
--   that creates the order (Phase 2 will create the Razorpay order first,
--   then insert), already covered by "orders: consumer insert own".
--
--   UPDATE (new policy added below) - the consumer needs to write
--   payment_status/razorpay_payment_id/razorpay_signature after their own
--   checkout completes. Same residual trade-off already accepted for
--   "orders: farmer update own" and "users: update own profile" elsewhere in
--   this project: RLS is row-level, not column-level, so this technically
--   permits a consumer to update ANY column on their own order (status,
--   total, etc.), not just payment fields. The actual column restriction is
--   enforced at the application layer (the Phase 2/3 verify-payment
--   endpoint only ever writes payment_status/razorpay_payment_id/
--   razorpay_signature), exactly like "orders: farmer update own" only ever
--   gets called from a route that writes status+updated_at.
--
-- DEFERRED TO PHASE 3, NOT DESIGNED HERE: the Razorpay webhook has no
-- Supabase user session at all (server-to-server, authenticated only by
-- Razorpay's HMAC signature) - it cannot use this consumer-scoped UPDATE
-- policy, and this app has no service-role key anywhere (confirmed
-- repeatedly this engagement). Phase 3 needs to decide how the webhook
-- authenticates its write (most likely a SECURITY DEFINER RPC that validates
-- the Razorpay signature internally before writing, similar in spirit to
-- is_government()) - not designing that now since it's explicitly Phase 3
-- scope and guessing at it here risks the same kind of cross-policy mistake
-- that caused the earlier RLS recursion bug this engagement.
--
-- NOT APPLIED - review and run manually.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Phase 3's webhook will look up an order by Razorpay's order id (not ours),
-- on every event - index it now since the column exists now.
CREATE INDEX IF NOT EXISTS orders_razorpay_order_id_idx
  ON public.orders (razorpay_order_id);

CREATE POLICY "orders: consumer update own payment fields"
  ON public.orders FOR UPDATE
  USING (auth.uid() = consumer_id)
  WITH CHECK (auth.uid() = consumer_id);

-- --- ROLLBACK ---
-- DROP POLICY IF EXISTS "orders: consumer update own payment fields" ON public.orders;
-- DROP INDEX IF EXISTS orders_razorpay_order_id_idx;
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
-- ALTER TABLE public.orders
--   DROP COLUMN IF EXISTS payment_status,
--   DROP COLUMN IF EXISTS razorpay_order_id,
--   DROP COLUMN IF EXISTS razorpay_payment_id,
--   DROP COLUMN IF EXISTS razorpay_signature;

-- --- VALIDATION ---
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'orders'
--   AND column_name IN ('payment_status','razorpay_order_id','razorpay_payment_id','razorpay_signature');
--
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE tablename = 'orders' AND policyname = 'orders: consumer update own payment fields';
--
-- SELECT conname FROM pg_constraint WHERE conname = 'orders_payment_status_check';
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'orders_razorpay_order_id_idx';
