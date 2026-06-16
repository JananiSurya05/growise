import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { logger } from "@/app/lib/logger";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";
const OWM_KEY = process.env.OPENWEATHER_API_KEY;

export interface Insight {
  id: string;
  type: "price_opportunity" | "price_risk" | "weather_alert" | "demand_signal" | "action_required" | "revenue_trend";
  priority: "high" | "medium" | "low";
  icon: string;
  title: string;
  detail: string;
  action?: string;
  actionHref?: string;
  value?: string;
  change?: number;
}

export interface DailyBriefResponse {
  greeting: string;
  summary: string;
  insights: Insight[];
  generated_at: string;
}

async function fetchWeather(location: string) {
  if (!OWM_KEY || !location) return null;
  try {
    const city = encodeURIComponent(location.split(",")[0].trim());
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OWM_KEY}&units=metric`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchMlPrice(cropName: string, location: string, month: number, season: string) {
  try {
    const res = await fetch(`${ML_API}/ml/price-prediction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop_name: cropName, location, month, season, quantity_kg: 500, weeks_ahead: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchMlRecommendations(location: string, season: string, month: number) {
  try {
    const res = await fetch(`${ML_API}/ml/crop-recommendation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, season, month, top_k: 3 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.recommendations ?? [];
  } catch { return null; }
}

function diseaseRiskFromWeather(weather: Record<string, unknown> | null, cropName: string): Insight | null {
  if (!weather) return null;
  const main = weather.main as Record<string, number>;
  const humidity = main?.humidity ?? 0;
  const temp = main?.temp ?? 25;
  const desc = (weather.weather as Array<Record<string, string>>)?.[0]?.description ?? "";

  const isRainy = desc.includes("rain");
  const highHumidity = humidity > 75;
  const warmTemp = temp > 22 && temp < 32;

  // Late Blight / Bacterial Spot thrive in high humidity + warm temperatures
  const highRiskCrops = ["Tomato", "Potato", "Pepper"];
  const isHighRiskCrop = highRiskCrops.some(c => cropName.toLowerCase().includes(c.toLowerCase()));

  if (highHumidity && warmTemp && isHighRiskCrop) {
    return {
      id: `weather-disease-${cropName}`,
      type: "weather_alert",
      priority: "high",
      icon: "⚠️",
      title: `Disease Risk: ${cropName}`,
      detail: `${humidity}% humidity + ${temp.toFixed(0)}°C${isRainy ? " + rain" : ""} creates ideal conditions for Bacterial Spot / Late Blight. Inspect leaves today.`,
      action: "Scan Disease",
      actionHref: "/farmer/disease",
      value: `${humidity}% RH`,
    };
  }
  if (isRainy) {
    return {
      id: "weather-rain",
      type: "weather_alert",
      priority: "medium",
      icon: "🌧️",
      title: "Rain Detected — Check Irrigation",
      detail: `Rain forecast in your area. Reduce irrigation for the next 24–48 hours to prevent root rot. Monitor drainage.`,
      value: desc,
    };
  }
  return null;
}

function buildPriceInsight(
  prediction: Record<string, unknown>,
  currentPrice: number,
  cropName: string,
): Insight {
  const predicted = prediction.predicted_price as number;
  const _confidence = prediction.confidence_score as number;
  const change = ((predicted - currentPrice) / currentPrice) * 100;
  const rising = change > 3;
  const falling = change < -3;

  return {
    id: `price-${cropName}`,
    type: rising ? "price_opportunity" : falling ? "price_risk" : "demand_signal",
    priority: Math.abs(change) > 15 ? "high" : Math.abs(change) > 7 ? "medium" : "low",
    icon: rising ? "📈" : falling ? "📉" : "➡️",
    title: rising
      ? `${cropName} prices predicted to rise ${change.toFixed(0)}%`
      : falling
      ? `${cropName} prices may fall ${Math.abs(change).toFixed(0)}%`
      : `${cropName} prices stable next week`,
    detail: rising
      ? `ML model predicts ₹${predicted.toFixed(1)}/kg next week (currently ₹${currentPrice}/kg). Consider holding 30–40% of inventory.`
      : falling
      ? `ML model predicts ₹${predicted.toFixed(1)}/kg next week. Consider selling bulk now at ₹${currentPrice}/kg.`
      : `Price expected to remain at ₹${predicted.toFixed(1)}/kg. Standard selling strategy recommended.`,
    action: "View Sales",
    actionHref: "/farmer/sales",
    value: `₹${predicted.toFixed(1)}/kg`,
    change: parseFloat(change.toFixed(1)),
  };
}

function buildRevenueInsight(
  orders: Array<{ total: number; created_at: string }>,
): Insight | null {
  if (orders.length === 0) return null;
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  const thisWeek = orders.filter(o => now - new Date(o.created_at).getTime() < week);
  const lastWeek = orders.filter(o => {
    const age = now - new Date(o.created_at).getTime();
    return age >= week && age < 2 * week;
  });
  const thisRev = thisWeek.reduce((s, o) => s + o.total, 0);
  const lastRev = lastWeek.reduce((s, o) => s + o.total, 0);
  const change = lastRev > 0 ? ((thisRev - lastRev) / lastRev) * 100 : 0;
  return {
    id: "revenue-trend",
    type: "revenue_trend",
    priority: thisRev === 0 ? "high" : "low",
    icon: thisRev > lastRev ? "💰" : thisRev === 0 ? "🔔" : "💡",
    title: thisRev === 0
      ? "No sales this week — take action"
      : change > 0
      ? `Revenue up ${change.toFixed(0)}% vs last week`
      : `Revenue down ${Math.abs(change).toFixed(0)}% vs last week`,
    detail: thisRev === 0
      ? "You have no orders this week. Consider lowering prices or adding new crops to attract buyers."
      : `This week: ₹${thisRev.toFixed(0)} across ${thisWeek.length} orders. Last week: ₹${lastRev.toFixed(0)}.`,
    action: thisRev === 0 ? "Manage Crops" : "View Sales",
    actionHref: thisRev === 0 ? "/farmer/crops" : "/farmer/sales",
    value: `₹${thisRev.toFixed(0)}`,
    change: parseFloat(change.toFixed(1)),
  };
}

async function generateLlmSummary(insights: Insight[], farmerName: string): Promise<string> {
  if (!GROQ_API_KEY || insights.length === 0) {
    return `Good morning, ${farmerName}. Here are your key insights for today.`;
  }
  const highPriority = insights.filter(i => i.priority === "high");
  const insightText = highPriority.length > 0
    ? highPriority.map(i => `${i.title}: ${i.detail}`).join(". ")
    : insights.slice(0, 2).map(i => i.title).join(". ");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 80,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content: "You are a concise agricultural advisor. Write a 1–2 sentence morning greeting for a Tamil Nadu farmer that summarizes their key priorities today. Be direct, specific, and actionable. No filler words.",
          },
          {
            role: "user",
            content: `Farmer name: ${farmerName}. Today's key data: ${insightText}. Write the morning greeting.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error("Groq error");
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? `Good morning, ${farmerName}.`;
  } catch {
    return `Good morning, ${farmerName}. ${highPriority.length > 0 ? highPriority[0].title + "." : ""}`;
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  if (!rateLimit(`insights:${ip}`, 10, 60_000).allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: { location?: string; crops?: Array<{ name: string; price: number; quantity: number }> };
  try { body = await req.json(); } catch { body = {}; }

  const location = body.location ?? "Chennai";
  const crops = body.crops ?? [];
  const farmerName = user.user_metadata?.full_name?.split(" ")[0] ?? "Farmer";

  const now = new Date();
  const month = now.getMonth() + 1;
  const season = month >= 6 && month <= 10 ? "Kharif" : month >= 11 || month <= 3 ? "Rabi" : "Zaid";

  // Fetch recent orders for revenue trend
  const { data: ordersData } = await supabase
    .from("orders")
    .select("total, created_at")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const orders = (ordersData ?? []) as Array<{ total: number; created_at: string }>;

  // Parallel fetch: weather + ML predictions for all crops + recommendations
  const [weather, recommendations, ...pricePredictions] = await Promise.all([
    fetchWeather(location),
    fetchMlRecommendations(location, season, month),
    ...crops.slice(0, 3).map(c => fetchMlPrice(c.name, location, month, season)),
  ]);

  const insights: Insight[] = [];

  // 1. Price insights per crop
  crops.slice(0, 3).forEach((crop, i) => {
    const pred = pricePredictions[i];
    if (pred?.predicted_price) {
      insights.push(buildPriceInsight(pred, crop.price, crop.name));
    }
  });

  // 2. Weather / disease risk
  const primaryCrop = crops[0]?.name ?? "Tomato";
  const diseaseInsight = diseaseRiskFromWeather(weather as Record<string, unknown> | null, primaryCrop);
  if (diseaseInsight) insights.push(diseaseInsight);

  // 3. Revenue trend
  const revenueInsight = buildRevenueInsight(orders);
  if (revenueInsight) insights.push(revenueInsight);

  // 4. Best crop to grow next
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    const top = recommendations[0] as Record<string, unknown>;
    insights.push({
      id: "rec-top-crop",
      type: "demand_signal",
      priority: "medium",
      icon: "🎯",
      title: `Grow ${top.crop} next — highest demand this ${season}`,
      detail: `ML model scores ${top.crop} at ${Math.round((top.composite_score as number) * 100)}% opportunity. ${top.reason as string}.`,
      action: "Add Crop",
      actionHref: "/farmer/crops",
      value: `${Math.round((top.composite_score as number) * 100)}%`,
    });
  }

  // Sort by priority
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => order[a.priority] - order[b.priority]);

  const summary = await generateLlmSummary(insights, farmerName);

  const response: DailyBriefResponse = {
    greeting: `Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, ${farmerName}`,
    summary,
    insights: insights.slice(0, 5),
    generated_at: now.toISOString(),
  };

  logger.info("insights:generated", { user_id: user.id, count: insights.length, location });
  return NextResponse.json(response);
}
