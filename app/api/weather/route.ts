import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../../lib/rateLimit";
import { isAllowedOrigin } from "../../lib/csrf";
import { createServerClient } from "../../lib/supabase-server";
import { logger } from "../../lib/logger";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_CITY_LENGTH = 100;
const CITY_PATTERN = /^[a-zA-Z\s\-'.]+$/;

export async function GET(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "weather", origin: req.headers.get("origin") });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Require an authenticated session — prevents unauthenticated API key abuse
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.security("auth:missing", { ip, endpoint: "weather" });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Rate-limit per user ID
  const { allowed, resetIn } = rateLimit(`weather:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    logger.warn("rate:limit", { userId: user.id, endpoint: "weather" });
    return NextResponse.json(
      { error: "Too many requests. Please wait before searching again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim() ?? "";

  if (!city) {
    return NextResponse.json({ error: "City name is required." }, { status: 400 });
  }
  if (city.length > MAX_CITY_LENGTH) {
    return NextResponse.json({ error: "City name is too long." }, { status: 400 });
  }
  if (!CITY_PATTERN.test(city)) {
    logger.warn("input:invalid", { endpoint: "weather", reason: "bad-city-chars", userId: user.id });
    return NextResponse.json({ error: "City name contains invalid characters." }, { status: 400 });
  }

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    logger.error("config:missing", { key: "OPENWEATHER_API_KEY", endpoint: "weather" });
    return NextResponse.json({ error: "Weather service temporarily unavailable." }, { status: 503 });
  }

  try {
    const encodedCity = encodeURIComponent(city);
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity},IN&appid=${key}`
    );

    const data = await response.json();

    if (!response.ok || data.cod !== 200) {
      return NextResponse.json({ error: "City not found. Please check the spelling and try again." }, { status: 404 });
    }

    logger.info("api:call", { endpoint: "weather", city, userId: user.id });
    return NextResponse.json(data);
  } catch (err) {
    logger.error("api:exception", { endpoint: "weather", error: String(err) });
    return NextResponse.json({ error: "Weather service is currently unavailable." }, { status: 500 });
  }
}
