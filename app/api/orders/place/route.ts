import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase-server";
import { rateLimit, getClientIp } from "../../../lib/rateLimit";
import { isAllowedOrigin } from "../../../lib/csrf";
import { logger } from "../../../lib/logger";
import { computeMarketPrice } from "../../../lib/pricing";
import { getRazorpay } from "../../../lib/razorpay";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 100_000;

interface CartItemInput {
  cropId: string;
  qty: number;
}

interface CropRow {
  id: string;
  name: string;
  price: number;
  farmer_id: string;
  status: string;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "orders/place", origin: req.headers.get("origin") });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.security("auth:missing", { ip, endpoint: "orders/place" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetIn } = rateLimit(`orders-place:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many order attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `items must be a non-empty array of at most ${MAX_ITEMS}` }, { status: 400 });
  }

  const items: CartItemInput[] = [];
  for (const raw of body.items) {
    const item = raw as Partial<CartItemInput>;
    if (
      typeof item.cropId !== "string" ||
      !item.cropId ||
      typeof item.qty !== "number" ||
      !Number.isFinite(item.qty) ||
      item.qty <= 0 ||
      item.qty > MAX_QTY_PER_ITEM
    ) {
      return NextResponse.json({ error: "Each item needs a valid cropId and a qty between 1 and " + MAX_QTY_PER_ITEM }, { status: 400 });
    }
    items.push({ cropId: item.cropId, qty: item.qty });
  }

  // Authoritative crop data — price/farmer_id come ONLY from this query, never
  // from the client payload. RLS scopes this to Active crops (or the caller's
  // own, irrelevant here since consumers don't own crops).
  const cropIds = [...new Set(items.map((i) => i.cropId))];
  const { data: cropsData, error: cropsErr } = await supabase
    .from("crops")
    .select("id, name, price, farmer_id, status")
    .in("id", cropIds);

  if (cropsErr) {
    logger.warn("orders:place:crops_fetch_failed", { user_id: user.id, error: cropsErr.message });
    return NextResponse.json({ error: "Could not verify crop prices." }, { status: 500 });
  }

  const crops = (cropsData ?? []) as CropRow[];
  const cropById = new Map(crops.map((c) => [c.id, c]));

  for (const item of items) {
    const crop = cropById.get(item.cropId);
    if (!crop || crop.status !== "Active") {
      return NextResponse.json(
        { error: `Crop ${item.cropId} is no longer available. Please refresh your cart.` },
        { status: 409 }
      );
    }
  }

  // Group by the crop's REAL farmer_id — never the client's claim.
  const farmerGroups = new Map<string, Array<CartItemInput & { crop: CropRow }>>();
  for (const item of items) {
    const crop = cropById.get(item.cropId)!;
    const group = farmerGroups.get(crop.farmer_id) ?? [];
    group.push({ ...item, crop });
    farmerGroups.set(crop.farmer_id, group);
  }

  // One combined Razorpay order for the whole cart, even when it spans
  // multiple farmers — the consumer pays once. Each per-farmer order row
  // below carries the same razorpay_order_id so the verify-payment step can
  // mark every row from this checkout as paid in one update.
  const grandTotal = [...farmerGroups.values()]
    .flat()
    .reduce((sum, i) => sum + i.crop.price * i.qty, 0);

  let razorpayOrderId: string;
  try {
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(grandTotal * 100), // paise
      currency: "INR",
      receipt: `growise_${user.id.slice(0, 8)}_${Date.now()}`,
    });
    razorpayOrderId = razorpayOrder.id;
  } catch (err) {
    logger.error("orders:place:razorpay_order_failed", { user_id: user.id, error: String(err) });
    return NextResponse.json({ error: "Could not initiate payment. Please try again." }, { status: 502 });
  }

  const createdOrders: Array<{ id: string; farmerId: string; total: number; amountSaved: number; quantity: number }> = [];

  for (const [farmerId, groupItems] of farmerGroups) {
    const groupTotal = groupItems.reduce((sum, i) => sum + i.crop.price * i.qty, 0);
    const groupSaved = groupItems.reduce(
      (sum, i) => sum + (computeMarketPrice(i.crop.price) - i.crop.price) * i.qty,
      0
    );
    const groupQty = groupItems.reduce((sum, i) => sum + i.qty, 0);

    const orderResult = await supabase
      .from("orders")
      .insert([{
        consumer_id: user.id,
        farmer_id: farmerId,
        crop_id: groupItems[0].cropId,
        quantity: groupQty,
        total: groupTotal,
        amount_saved: groupSaved,
        status: "Processing",
        razorpay_order_id: razorpayOrderId,
      }] as never[])
      .select("id")
      .single();

    if (orderResult.error || !orderResult.data) {
      logger.warn("orders:place:order_insert_failed", { user_id: user.id, farmer_id: farmerId, error: orderResult.error?.message });
      return NextResponse.json({ error: "Failed to create order. Please try again." }, { status: 500 });
    }

    const orderId = (orderResult.data as { id: string }).id;

    const itemsPayload = groupItems.map((i) => ({
      order_id: orderId,
      crop_id: i.cropId,
      crop_name: i.crop.name,
      quantity: i.qty,
      price: i.crop.price,
      total: i.crop.price * i.qty,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload as never[]);

    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", orderId);
      logger.warn("orders:place:items_insert_failed", { user_id: user.id, order_id: orderId, error: itemsErr.message });
      return NextResponse.json({ error: "Failed to add order items. Please try again." }, { status: 500 });
    }

    createdOrders.push({ id: orderId, farmerId, total: groupTotal, amountSaved: groupSaved, quantity: groupQty });
  }

  logger.info("orders:placed", { user_id: user.id, order_count: createdOrders.length });
  return NextResponse.json({
    orders: createdOrders,
    payment: { razorpayOrderId, amount: Math.round(grandTotal * 100), currency: "INR" },
  });
}
