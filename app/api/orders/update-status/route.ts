import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase-server";
import { rateLimit, getClientIp } from "../../../lib/rateLimit";
import { isAllowedOrigin } from "../../../lib/csrf";
import { logger } from "../../../lib/logger";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

// Sequential forward-only transitions. "Placed" is never a stored value —
// the consumer UI treats it as an implicit first rung satisfied the moment
// an order exists with status "Processing" or later.
const ALLOWED_TRANSITIONS: Record<string, string> = {
  Processing: "On the way",
  "On the way": "Delivered",
};

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "orders/update-status", origin: req.headers.get("origin") });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.security("auth:missing", { ip, endpoint: "orders/update-status" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetIn } = rateLimit(`orders-status:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many status updates. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  let body: { orderId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, status: requestedStatus } = body;
  if (!orderId || typeof orderId !== "string" || !requestedStatus || typeof requestedStatus !== "string") {
    return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
  }

  // Authoritative current status — never trust a client-supplied "from" state.
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, status, farmer_id, payment_status")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // RLS ("orders: farmer reads own") already scopes the SELECT above to this
  // farmer's own orders, but double-check explicitly so the error message is
  // accurate rather than a generic "not found".
  if (order.farmer_id !== user.id) {
    return NextResponse.json({ error: "You do not own this order." }, { status: 403 });
  }

  const expectedNext = ALLOWED_TRANSITIONS[order.status];
  if (expectedNext !== requestedStatus) {
    return NextResponse.json(
      { error: `Cannot move from "${order.status}" to "${requestedStatus}". Next allowed status: ${expectedNext ?? "none — order is already in its final state"}.` },
      { status: 409 }
    );
  }

  // Processing -> On the way is the fulfillment step that ships the order —
  // require a captured payment first. Orders stuck at payment_status
  // 'pending'/'failed' stay inert at "Processing" (no auto-cancellation;
  // that's a deliberate scope decision, not an oversight).
  if (order.status === "Processing" && order.payment_status !== "paid") {
    return NextResponse.json(
      { error: `Cannot ship this order — payment status is "${order.payment_status}", not "paid".` },
      { status: 409 }
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("orders")
    .update({ status: requestedStatus, updated_at: new Date().toISOString() } as never)
    .eq("id", orderId)
    .eq("farmer_id", user.id)
    .select("id, status, updated_at")
    .single();

  if (updateErr || !updated) {
    logger.warn("orders:status_update_failed", { user_id: user.id, order_id: orderId, error: updateErr?.message });
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }

  logger.info("orders:status_updated", { user_id: user.id, order_id: orderId, status: requestedStatus });
  return NextResponse.json({ order: updated });
}
