import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { logger } from "@/app/lib/logger";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  if (!rateLimit(`ml-recommend:${ip}`, 20, 60_000).allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ML_API}/ml/crop-recommendation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "ML service error" }));
      return NextResponse.json({ error: (err as Record<string,unknown>).detail }, { status: res.status });
    }

    const data = await res.json();
    logger.info("ml:crop_recommended", { user_id: user.id, location: (body as Record<string,unknown>).location });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "ML service unavailable. Start with: python ml/api/main.py" }, { status: 503 });
  }
}
