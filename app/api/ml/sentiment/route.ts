import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  if (!rateLimit(`ml-sentiment:${ip}`, 30, 60_000).allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.text || body.text.length > 2000) {
    return NextResponse.json({ error: "text required, max 2000 chars" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ML_API}/ml/sentiment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body.text }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "ML service error" }));
      return NextResponse.json({ error: (err as Record<string,unknown>).detail }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ML service unavailable" }, { status: 503 });
  }
}
