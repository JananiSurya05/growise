import { describe, it, expect } from "vitest";

// Inline the function since it's not exported from the route
// This tests the exact logic used in app/auth/callback/route.ts
type Role = "farmer" | "consumer" | "government";
const ALLOWED_ROLES = new Set<Role>(["farmer", "consumer", "government"]);

function sanitizeRole(raw: string | null): Role {
  if (!raw) return "consumer";
  const decoded = decodeURIComponent(raw).trim().toLowerCase();
  return ALLOWED_ROLES.has(decoded as Role) ? (decoded as Role) : "consumer";
}

describe("sanitizeRole", () => {
  it("returns valid roles unchanged", () => {
    expect(sanitizeRole("farmer")).toBe("farmer");
    expect(sanitizeRole("consumer")).toBe("consumer");
    expect(sanitizeRole("government")).toBe("government");
  });

  it("defaults to consumer for null input", () => {
    expect(sanitizeRole(null)).toBe("consumer");
  });

  it("defaults to consumer for empty string", () => {
    expect(sanitizeRole("")).toBe("consumer");
  });

  it("defaults to consumer for unknown roles", () => {
    expect(sanitizeRole("admin")).toBe("consumer");
    expect(sanitizeRole("superuser")).toBe("consumer");
    expect(sanitizeRole("root")).toBe("consumer");
  });

  it("is case-insensitive", () => {
    expect(sanitizeRole("FARMER")).toBe("farmer");
    expect(sanitizeRole("Consumer")).toBe("consumer");
    expect(sanitizeRole("GOVERNMENT")).toBe("government");
  });

  it("trims whitespace", () => {
    expect(sanitizeRole("  farmer  ")).toBe("farmer");
  });

  it("URL-decodes and trims — trailing space is stripped before whitelist check", () => {
    // "farmer%20" decodes to "farmer " then trim() → "farmer" — valid role
    expect(sanitizeRole("farmer%20")).toBe("farmer");
    // A role with non-whitespace garbage after decoding is rejected
    expect(sanitizeRole("farmer%21")).toBe("consumer"); // "farmer!" not in whitelist
  });

  it("rejects injection attempts", () => {
    expect(sanitizeRole("farmer'; DROP TABLE users;--")).toBe("consumer");
    expect(sanitizeRole("<script>alert(1)</script>")).toBe("consumer");
    expect(sanitizeRole("../admin")).toBe("consumer");
  });
});
