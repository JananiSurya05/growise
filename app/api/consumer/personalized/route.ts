import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { isAllowedOrigin } from "@/app/lib/csrf";
import { logger } from "@/app/lib/logger";

const SEASONAL_CROPS: Record<string, string[]> = {
  Kharif: ["Rice", "Maize", "Tomato", "Brinjal", "Chilli", "Okra"],
  Rabi: ["Potato", "Onion", "Carrot", "Cabbage", "Cauliflower", "Spinach"],
  Zaid: ["Banana", "Mango", "Cucumber", "Pumpkin", "Watermelon"],
};

const PAIRING_MAP: Record<string, string[]> = {
  Tomato: ["Onion", "Potato", "Chilli"],
  Onion: ["Tomato", "Potato", "Garlic"],
  Potato: ["Onion", "Tomato", "Carrot"],
  Carrot: ["Potato", "Onion", "Beans"],
  Rice: ["Tomato", "Onion", "Brinjal"],
  Brinjal: ["Tomato", "Chilli", "Onion"],
  Banana: ["Mango", "Pumpkin"],
  Spinach: ["Carrot", "Beans", "Cabbage"],
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "consumer-personalized", origin: req.headers.get("origin") });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`consumer-personalized:${ip}`, 20, 60_000).allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: { consumerId?: string; location?: string };
  try { body = await req.json(); } catch { body = {}; }

  const location = body.location ?? undefined;

  // Get consumer's recent order history
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("crop_id, total, created_at")
    .eq("consumer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get order crop names by joining crops
  const cropIds = [...new Set((recentOrders ?? []).map(o => o.crop_id).filter(Boolean))];
  let purchasedCropNames: string[] = [];

  if (cropIds.length > 0) {
    const { data: purchasedCrops } = await supabase
      .from("crops")
      .select("id, name")
      .in("id", cropIds);
    purchasedCropNames = (purchasedCrops ?? []).map(c => c.name).filter(Boolean);
  }

  // Build candidate set: pairings + seasonal
  const now = new Date();
  const month = now.getMonth() + 1;
  const season = month >= 6 && month <= 10 ? "Kharif" : month >= 11 || month <= 3 ? "Rabi" : "Zaid";
  const seasonalCrops = SEASONAL_CROPS[season] ?? [];

  const candidateNames = new Set<string>();
  // Add pairings for purchased crops
  for (const cropName of purchasedCropNames.slice(0, 5)) {
    for (const paired of PAIRING_MAP[cropName] ?? []) {
      if (!purchasedCropNames.includes(paired)) candidateNames.add(paired);
    }
  }
  // Fill with seasonal crops if not already purchased
  for (const crop of seasonalCrops) {
    if (!purchasedCropNames.includes(crop)) candidateNames.add(crop);
  }

  // Query available crops matching candidates
  let cropsQuery = supabase
    .from("crops")
    .select("id, name, price, quantity, location, farmer_id")
    .eq("status", "Active")
    .gt("quantity", 0)
    .order("price", { ascending: true })
    .limit(20);

  if (location) cropsQuery = cropsQuery.eq("location", location);

  const { data: availableCrops } = await cropsQuery;

  if (!availableCrops || availableCrops.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // Score and rank candidates
  const scored: Array<{ crop: typeof availableCrops[0]; reason: string; score: number; badge?: string }> = [];

  for (const crop of availableCrops) {
    let score = 0;
    let reason = "";
    let badge: string | undefined;

    const isPaired = candidateNames.has(crop.name) && purchasedCropNames.some(p => (PAIRING_MAP[p] ?? []).includes(crop.name));
    const isSeasonal = seasonalCrops.includes(crop.name);
    const isPurchasedBefore = purchasedCropNames.includes(crop.name);

    if (isPaired) {
      score += 3;
      const parent = purchasedCropNames.find(p => (PAIRING_MAP[p] ?? []).includes(crop.name));
      reason = `Pairs well with ${parent} you bought before`;
      badge = "PAIRS WELL";
    } else if (isPurchasedBefore) {
      score += 2;
      reason = `You've ordered this before`;
      badge = "REORDER";
    } else if (isSeasonal) {
      score += 1;
      reason = `Fresh ${season} crop, in season now`;
      badge = "SEASONAL";
    } else {
      reason = "Popular in your area";
    }

    // Boost local
    if (location && crop.location === location) score += 1;

    scored.push({ crop, reason, score, badge });
  }

  scored.sort((a, b) => b.score - a.score);

  const recommendations = scored.slice(0, 4).map(({ crop, reason, score, badge }) => ({
    crop: { id: crop.id, name: crop.name, price: crop.price, location: crop.location },
    reason,
    score,
    badge,
  }));

  return NextResponse.json({ recommendations, season, purchasedCount: purchasedCropNames.length });
}
