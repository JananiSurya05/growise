import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../../lib/rateLimit";
import { isAllowedOrigin } from "../../lib/csrf";
import { createServerClient } from "../../lib/supabase-server";
import { logger } from "../../lib/logger";

const MAX_QUESTION_LENGTH = 1000;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedOrigin(req)) {
    logger.security("csrf:violation", { ip, endpoint: "advisor", origin: req.headers.get("origin") });
    return NextResponse.json({ answer: "Forbidden." }, { status: 403 });
  }

  // Require an authenticated session — prevents unauthenticated API key abuse
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.security("auth:missing", { ip, endpoint: "advisor" });
    return NextResponse.json({ answer: "Unauthorized." }, { status: 401 });
  }

  // Rate-limit per user ID so identity-switching doesn't reset the window
  const { allowed, resetIn } = rateLimit(`advisor:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    logger.warn("rate:limit", { userId: user.id, endpoint: "advisor" });
    return NextResponse.json(
      { answer: "Too many requests. Please wait a moment before asking again." },
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
    return NextResponse.json({ answer: "Invalid request format." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("question" in body) ||
    typeof (body as Record<string, unknown>).question !== "string"
  ) {
    return NextResponse.json({ answer: "A question is required." }, { status: 400 });
  }

  const question = ((body as Record<string, string>).question).trim();
  if (!question) {
    return NextResponse.json({ answer: "Question cannot be empty." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { answer: `Question must be under ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    logger.error("config:missing", { key: "GROQ_API_KEY", endpoint: "advisor" });
    return NextResponse.json({ answer: "Service temporarily unavailable." }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are GroWise AI, an expert agricultural advisor built into the GroWise platform to help Indian farmers in Tamil Nadu.

Your identity: You are an AI assistant created by the GroWise team. Never claim to be a human or give yourself a human name like Ravi Kumar.

Your role:
- Give clear, practical advice about crops, diseases, soil, fertilisers, irrigation, and farming techniques
- Focus on Tamil Nadu farming conditions and locally available solutions
- Suggest affordable and accessible remedies
- Keep answers simple and easy to understand for farmers
- Always be helpful and encouraging

If asked who you are, say: "I'm GroWise AI, your intelligent crop advisor. I'm here to help you grow better crops and earn more income!"`,
          },
          { role: "user", content: question },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      logger.error("upstream:error", { endpoint: "advisor", status: response.status });
      return NextResponse.json({ answer: "AI advisor is temporarily unavailable. Please try again." }, { status: 502 });
    }

    const answer: string = data.choices?.[0]?.message?.content ?? "No response received.";
    logger.info("api:call", { endpoint: "advisor", userId: user.id });
    return NextResponse.json({ answer });
  } catch (err) {
    logger.error("api:exception", { endpoint: "advisor", error: String(err) });
    return NextResponse.json({ answer: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
