import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase-server";
import { rateLimit, getClientIp } from "../../../lib/rateLimit";
import { isAllowedOrigin } from "../../../lib/csrf";
import { logger } from "../../../lib/logger";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "orders/verify-payment", origin: req.headers.get("origin") });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.security("auth:missing", { ip, endpoint: "orders/verify-payment" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetIn } = rateLimit(`orders-verify:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  let body: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
  if (
    typeof razorpayOrderId !== "string" || !razorpayOrderId ||
    typeof razorpayPaymentId !== "string" || !razorpayPaymentId ||
    typeof razorpaySignature !== "string" || !razorpaySignature
  ) {
    return NextResponse.json({ error: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    logger.error("config:missing", { key: "RAZORPAY_KEY_SECRET", endpoint: "orders/verify-payment" });
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  // Razorpay's documented signature scheme: HMAC-SHA256 of "order_id|payment_id"
  // keyed with the account secret. Constant-time compare to avoid a timing
  // side-channel on the signature check.
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(razorpaySignature, "utf8");
  const signatureValid =
    expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!signatureValid) {
    logger.security("payment:signature_invalid", { ip, user_id: user.id, razorpay_order_id: razorpayOrderId });
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  // RLS ("orders: consumer update own payment fields") scopes this to the
  // caller's own orders; the razorpay_order_id filter also ensures we only
  // ever touch rows created by this exact checkout.
  const { data: updated, error: updateErr } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } as never)
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("consumer_id", user.id)
    .select("id");

  if (updateErr) {
    logger.error("orders:verify_payment:update_failed", { user_id: user.id, razorpay_order_id: razorpayOrderId, error: updateErr.message });
    return NextResponse.json({ error: "Payment verified but order update failed. Contact support." }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    logger.warn("orders:verify_payment:no_matching_orders", { user_id: user.id, razorpay_order_id: razorpayOrderId });
    return NextResponse.json({ error: "No matching order found for this payment." }, { status: 404 });
  }

  logger.info("orders:payment_verified", { user_id: user.id, razorpay_order_id: razorpayOrderId, order_count: updated.length });
  return NextResponse.json({ verified: true, orderCount: updated.length });
}
