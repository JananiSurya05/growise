import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../../lib/rateLimit";
import { isAllowedOrigin } from "../../lib/csrf";
import { createServerClient } from "../../lib/supabase-server";
import { logger } from "../../lib/logger";
import { isUsableModelPrediction, formatMlPrediction, toRawBase64 } from "../../lib/diseaseDetection";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB base64 limit
const ALLOWED_MIME_PREFIXES = ["data:image/jpeg", "data:image/jpg", "data:image/png", "data:image/webp"];

// Same ML service every other /api/ml/* route talks to (price prediction,
// crop recommendation, anomaly detection, sentiment) — disease detection was
// the one route that never called it and went straight to Groq. ml/models/
// disease_detection.py's predict_from_base64() returns a real prediction if
// ml/models/saved/disease_mobilenetv2.onnx exists, or a "groq_vision_fallback"
// signal if it doesn't — isUsableModelPrediction() is what decides which one
// we got. Dropping the trained .onnx file in is the only change needed to
// flip this from "always falls through to Groq" to "uses the real model."
const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";
const ML_TIMEOUT_MS = 5_000;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "disease", origin: req.headers.get("origin") });
    return NextResponse.json({ result: "Forbidden." }, { status: 403 });
  }

  // Require an authenticated session — prevents unauthenticated API key abuse
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.security("auth:missing", { ip, endpoint: "disease" });
    return NextResponse.json({ result: "Unauthorized." }, { status: 401 });
  }

  // Rate-limit per user ID
  const { allowed, resetIn } = rateLimit(`disease:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    logger.warn("rate:limit", { userId: user.id, endpoint: "disease" });
    return NextResponse.json(
      { result: "Too many scans. Please wait a moment before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ result: "Invalid request format." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("image" in body) ||
    typeof (body as Record<string, unknown>).image !== "string"
  ) {
    return NextResponse.json({ result: "An image is required." }, { status: 400 });
  }

  const image = ((body as Record<string, string>).image).trim();

  if (!ALLOWED_MIME_PREFIXES.some((prefix) => image.startsWith(prefix))) {
    logger.warn("input:invalid", { endpoint: "disease", reason: "bad-mime", userId: user.id });
    return NextResponse.json(
      { result: "Only JPEG, PNG, and WebP images are supported." },
      { status: 400 }
    );
  }

  if (image.length > MAX_IMAGE_BYTES) {
    logger.warn("input:invalid", { endpoint: "disease", reason: "too-large", userId: user.id });
    return NextResponse.json(
      { result: "Image is too large. Please use an image under 10 MB." },
      { status: 400 }
    );
  }

  try {
    const mlRes = await fetch(`${ML_API}/ml/disease-detection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: toRawBase64(image) }),
      signal: AbortSignal.timeout(ML_TIMEOUT_MS),
    });

    if (mlRes.ok) {
      const mlData = await mlRes.json();
      if (isUsableModelPrediction(mlData)) {
        logger.info("disease:model_used", { userId: user.id, predicted_class: mlData.predicted_class, confidence: mlData.confidence });
        return NextResponse.json({ result: formatMlPrediction(mlData) });
      }
      logger.info("disease:model_skipped", { userId: user.id, model: (mlData as Record<string, unknown>).model ?? "unknown" });
    } else {
      logger.warn("disease:ml_service_error", { userId: user.id, status: mlRes.status });
    }
  } catch (err) {
    // ML service unreachable/timed out — fall through to Groq below. This is
    // the genuine fallback path, not an error to surface to the user.
    logger.warn("disease:ml_service_unavailable", { userId: user.id, error: String(err) });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    logger.error("config:missing", { key: "GROQ_API_KEY", endpoint: "disease" });
    return NextResponse.json({ result: "Service temporarily unavailable." }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image },
              },
              {
                type: "text",
                text: `You are an expert plant pathologist helping Indian farmers in Tamil Nadu.

First, check if this image shows a plant or crop.

If it is NOT a plant (e.g. a person, animal, object, building, etc.), respond with exactly:
"❌ This doesn't appear to be a plant photo. Please upload a clear photo of your crop or plant leaves showing the problem."

If it IS a plant, analyze it and provide:
1. 🌿 Plant identified
2. 🦠 Disease/Issue detected
3. 📋 Cause
4. 💊 Treatment (using locally available products in India)
5. 🛡️ Prevention tips

Keep the response practical and helpful for Indian farmers.`,
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      logger.error("upstream:error", { endpoint: "disease", status: response.status });
      return NextResponse.json({ result: "Disease scanner is temporarily unavailable. Please try again." }, { status: 502 });
    }

    const result: string = data.choices?.[0]?.message?.content ?? "Analysis could not be completed.";
    logger.info("api:call", { endpoint: "disease", userId: user.id });
    return NextResponse.json({ result });
  } catch (err) {
    logger.error("api:exception", { endpoint: "disease", error: String(err) });
    return NextResponse.json({ result: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
