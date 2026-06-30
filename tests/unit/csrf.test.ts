import { describe, it, expect, beforeEach, vi } from "vitest";

let isAllowedOrigin: (req: Request) => boolean;

beforeEach(async () => {
  vi.resetModules();
  // Set the env variable before importing so the Set is populated
  process.env.NEXT_PUBLIC_APP_URL = "https://growise.vercel.app";
  const mod = await import("../../app/lib/csrf");
  isAllowedOrigin = mod.isAllowedOrigin;
});

describe("isAllowedOrigin", () => {
  it("allows requests with no Origin header (native/server-to-server)", () => {
    const req = new Request("https://example.com");
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("allows localhost:3000", () => {
    const req = new Request("https://example.com", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("allows capacitor://localhost", () => {
    const req = new Request("https://example.com", {
      headers: { origin: "capacitor://localhost" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("blocks unknown origins", () => {
    const req = new Request("https://example.com", {
      headers: { origin: "https://evil.example.com" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("blocks origins that prefix-match but are not exact", () => {
    const req = new Request("https://example.com", {
      headers: { origin: "http://localhost:3000.evil.com" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("blocks null-origin spoofing attempts", () => {
    const req = new Request("https://example.com", {
      headers: { origin: "null" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });
});
