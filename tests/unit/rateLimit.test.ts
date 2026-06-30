import { describe, it, expect, beforeEach, vi } from "vitest";

// Isolate the store between tests by re-importing with a cleared module cache
let rateLimit: (key: string, limit: number, windowMs: number) => { allowed: boolean; remaining: number; resetIn: number };
let getClientIp: (request: Request) => string;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("../../app/lib/rateLimit");
  rateLimit = mod.rateLimit;
  getClientIp = mod.getClientIp;
});

describe("rateLimit", () => {
  it("allows the first request", () => {
    const result = rateLimit("test:1.2.3.4", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("counts down remaining correctly", () => {
    rateLimit("test:a", 3, 60_000);
    rateLimit("test:a", 3, 60_000);
    const result = rateLimit("test:a", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks once limit is exhausted", () => {
    rateLimit("test:b", 2, 60_000);
    rateLimit("test:b", 2, 60_000);
    const blocked = rateLimit("test:b", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    rateLimit("test:c", 1, 50);
    rateLimit("test:c", 1, 50);
    // Wait for the window to expire
    await new Promise((r) => setTimeout(r, 60));
    const after = rateLimit("test:c", 1, 50);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it("isolates keys from each other", () => {
    rateLimit("test:x", 1, 60_000);
    const y = rateLimit("test:y", 1, 60_000);
    expect(y.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no IP header present", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from forwarded IP", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  10.0.0.1  , 192.168.1.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });
});
