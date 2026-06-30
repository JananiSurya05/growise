import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";
import { logger } from "@/app/lib/logger";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "government") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ML_API}/ml/anomaly-detection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "ML service error" }));
      return NextResponse.json({ error: (err as Record<string,unknown>).detail }, { status: res.status });
    }

    const data = await res.json();
    logger.info("ml:anomaly_scan", { user_id: user.id, orders: (body as { orders?: unknown[] }).orders?.length });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "ML service unavailable. Start with: python ml/api/main.py" }, { status: 503 });
  }
}
