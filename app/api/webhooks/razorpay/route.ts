import { NextResponse } from "next/server";
import { supabaseAnon } from "../../../lib/supabase-anon";
import { rateLimit, getClientIp } from "../../../lib/rateLimit";
import { logger } from "../../../lib/logger";

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

// No CSRF/origin check and no Supabase session here on purpose — this is a
// server-to-server callback from Razorpay, not a browser request. It has no
// Origin header to validate and no cookies to read a session from. Its only
// authentication is the HMAC signature, which is verified inside
// public.apply_razorpay_webhook() (Postgres), not in this route — see
// 20260622090000_razorpay_webhook_security_definer.sql for why the check
// has to live there rather than here.
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const { allowed } = rateLimit(`razorpay-webhook:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    logger.warn("webhook:razorpay:missing_signature", { ip });
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw text, not req.json() — the signature is computed over the exact
  // bytes Razorpay sent. Parsing and re-serializing can reorder keys or
  // change whitespace and silently invalidate the signature check.
  const rawBody = await req.text();

  const { data, error } = await supabaseAnon.rpc("apply_razorpay_webhook", {
    p_payload: rawBody,
    p_signature: signature,
  });

  if (error) {
    logger.error("webhook:razorpay:rpc_error", { ip, error: error.message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  switch (data) {
    case "updated":
      logger.info("webhook:razorpay:updated", { ip });
      return NextResponse.json({ ok: true });

    case "no_matching_order":
      // Acknowledge with 200 — retrying won't change the outcome, but this
      // is worth investigating (e.g. /api/orders/place failed after
      // creating the Razorpay order but before the insert completed).
      logger.warn("webhook:razorpay:no_matching_order", { ip });
      return NextResponse.json({ ok: true });

    case "unrecognized_event":
      // Razorpay sends many event types we don't act on (e.g. order.paid,
      // refund.created) — not an error, just nothing for us to do yet.
      logger.info("webhook:razorpay:unrecognized_event", { ip });
      return NextResponse.json({ ok: true });

    case "invalid_payload":
      logger.warn("webhook:razorpay:invalid_payload", { ip });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    case "invalid_signature":
      logger.security("webhook:razorpay:invalid_signature", { ip });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

    case "config_missing":
      logger.error("webhook:razorpay:config_missing", { ip });
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

    default:
      logger.error("webhook:razorpay:unexpected_result", { ip, result: String(data) });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
