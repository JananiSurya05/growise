import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { isAllowedOrigin } from "@/app/lib/csrf";
import { logger } from "@/app/lib/logger";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";
const OWM_KEY = process.env.OPENWEATHER_API_KEY;

// Disease risk thresholds per crop — cross-module ecosystem intelligence
const DISEASE_RISK_MATRIX: Record<string, { humidityThreshold: number; tempMin: number; tempMax: number; disease: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }[]> = {
  Tomato: [
    { humidityThreshold: 75, tempMin: 15, tempMax: 30, disease: "Late Blight (Phytophthora)", severity: "CRITICAL" },
    { humidityThreshold: 70, tempMin: 25, tempMax: 35, disease: "Bacterial Spot", severity: "HIGH" },
  ],
  Potato: [
    { humidityThreshold: 80, tempMin: 10, tempMax: 25, disease: "Late Blight", severity: "CRITICAL" },
  ],
  Rice: [
    { humidityThreshold: 85, tempMin: 25, tempMax: 35, disease: "Blast Disease", severity: "HIGH" },
  ],
  Chilli: [
    { humidityThreshold: 70, tempMin: 20, tempMax: 32, disease: "Anthracnose", severity: "MEDIUM" },
  ],
  Onion: [
    { humidityThreshold: 80, tempMin: 15, tempMax: 25, disease: "Purple Blotch", severity: "MEDIUM" },
  ],
};

function computeDiseaseRisk(
  cropName: string,
  humidity: number,
  temp: number,
): { disease: string; severity: string; probability: number } | null {
  const risks = DISEASE_RISK_MATRIX[cropName];
  if (!risks) return null;

  for (const risk of risks) {
    if (humidity >= risk.humidityThreshold && temp >= risk.tempMin && temp <= risk.tempMax) {
      const humidityFactor = Math.min(1, (humidity - risk.humidityThreshold) / 20);
      const probability = Math.min(0.95, 0.4 + humidityFactor * 0.55);
      return { disease: risk.disease, severity: risk.severity, probability: parseFloat(probability.toFixed(2)) };
    }
  }
  return null;
}

function computeEcosystemRiskScore(
  diseaseRisk: { severity: string; probability: number } | null,
  priceTrend: number,
  supplyLevel: number,
): number {
  let score = 0;
  if (diseaseRisk) {
    const severityWeight = { CRITICAL: 0.4, HIGH: 0.3, MEDIUM: 0.2, LOW: 0.1 }[diseaseRisk.severity] ?? 0.1;
    score += severityWeight * diseaseRisk.probability;
  }
  // Price falling = revenue risk
  if (priceTrend < 0) score += Math.min(0.3, Math.abs(priceTrend) / 100);
  // Low supply from many farmers = opportunity (not risk)
  if (supplyLevel < 100) score -= 0.1;
  return parseFloat(Math.max(0, Math.min(1, score)).toFixed(3));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "market-intelligence", origin: req.headers.get("origin") });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`market-intel:${ip}`, 15, 60_000).allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: { location?: string; crops?: Array<{ name: string; price: number; quantity: number }> };
  try { body = await req.json(); } catch { body = {}; }

  const location = body.location ?? "Chennai";
  const crops = body.crops ?? [];

  const now = new Date();
  const month = now.getMonth() + 1;
  const season = month >= 6 && month <= 10 ? "Kharif" : month >= 11 || month <= 3 ? "Rabi" : "Zaid";

  // Fetch weather
  let weather: Record<string, unknown> | null = null;
  if (OWM_KEY) {
    try {
      const city = encodeURIComponent(location.split(",")[0].trim());
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OWM_KEY}&units=metric`,
        { signal: AbortSignal.timeout(4000) },
      );
      if (wRes.ok) weather = await wRes.json();
    } catch { /* weather unavailable */ }
  }

  const humidity = (weather?.main as Record<string, number>)?.humidity ?? 65;
  const temp = (weather?.main as Record<string, number>)?.temp ?? 28;
  const weatherDesc = (weather?.weather as Array<Record<string, string>>)?.[0]?.description ?? "clear";

  // Fetch ML price predictions for all crops in parallel
  const pricePredictions = await Promise.all(
    crops.slice(0, 5).map(async crop => {
      try {
        const res = await fetch(`${ML_API}/ml/price-prediction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ crop_name: crop.name, location, month, season, quantity_kg: crop.quantity, weeks_ahead: 1 }),
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { crop: crop.name, currentPrice: crop.price, predicted: data.predicted_price, confidence: data.confidence_score };
      } catch { return null; }
    }),
  );

  // Build ecosystem analysis per crop
  const ecosystemAnalysis = crops.slice(0, 5).map((crop, i) => {
    const pred = pricePredictions[i];
    const priceTrend = pred ? ((pred.predicted - crop.price) / crop.price) * 100 : 0;
    const diseaseRisk = computeDiseaseRisk(crop.name, humidity, temp);
    const riskScore = computeEcosystemRiskScore(diseaseRisk, priceTrend, crop.quantity);

    return {
      crop: crop.name,
      currentPrice: crop.price,
      predictedPrice: pred?.predicted ?? null,
      priceChange: pred ? parseFloat(priceTrend.toFixed(1)) : null,
      confidence: pred?.confidence ?? null,
      diseaseRisk,
      ecosystemRiskScore: riskScore,
      riskLevel: riskScore > 0.6 ? "HIGH" : riskScore > 0.35 ? "MEDIUM" : "LOW",
      supplyKg: crop.quantity,
      weatherConditions: { humidity, temp, description: weatherDesc },
      recommendation: diseaseRisk
        ? `Inspect ${crop.name} for ${diseaseRisk.disease}. ${priceTrend > 5 ? "Hold inventory if possible." : "Sell quickly."}`
        : priceTrend > 10
        ? `Hold ${crop.name} — prices rising. Consider listing 30% more inventory.`
        : priceTrend < -10
        ? `Sell ${crop.name} soon — prices may fall next week.`
        : `${crop.name} market is stable. Maintain current strategy.`,
    };
  });

  // Platform-wide supply/demand signal
  const { data: cropsData } = await supabase
    .from("crops")
    .select("name, price, quantity, location")
    .eq("status", "Active");

  const supplyByLocation: Record<string, number> = {};
  for (const c of cropsData ?? []) {
    if (c.location) supplyByLocation[c.location] = (supplyByLocation[c.location] ?? 0) + (c.quantity ?? 0);
  }

  const overallRisk = ecosystemAnalysis.reduce((max, e) => Math.max(max, e.ecosystemRiskScore), 0);

  return NextResponse.json({
    location,
    season,
    weather: weather ? { humidity, temp, description: weatherDesc } : null,
    crops: ecosystemAnalysis,
    platformSupply: supplyByLocation,
    overallEcosystemRisk: parseFloat(overallRisk.toFixed(3)),
    generatedAt: now.toISOString(),
  });
}
