import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase-server";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8001";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${ML_API}/ml/model-registry`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return NextResponse.json({ error: "ML service error" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ML service unavailable" }, { status: 503 });
  }
}
