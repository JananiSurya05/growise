# PHASE 10I — FRONTEND REMEDIATION REPORT
**GroWise Platform | Frontend Accessibility, Security & Architecture Remediation | 2026-06-18**

> This is a remediation log, not an audit. Every item below is a real code change made and verified in this session (`tsc --noEmit`, `eslint`, `next build`), not a finding awaiting action.

---

## EVIDENCE LOG

| Verification Method | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors in source (only pre-existing stale `.next/` route-typegen noise) |
| `npx eslint` (all touched files) | ✅ 0 errors, warnings are pre-existing (`<img>` usage, `exhaustive-deps`) |
| `npx next build` | ✅ Compiled successfully, 32 routes generated, proxy/middleware recognized |

---

## 10I-A — Critical Accessibility & CSP Fixes

| Fix | File(s) | Why |
|---|---|---|
| Global `:focus-visible` outline added | `app/globals.css` | No visible keyboard-focus indicator existed anywhere (WCAG 2.4.7) |
| Re-enabled pinch-zoom (`maximumScale: 5`, `userScalable: true`) | `app/layout.tsx` | Previous viewport config blocked zoom entirely (WCAG 1.4.4) |
| Nonce-based CSP, `script-src 'unsafe-inline'` removed in production | `proxy.ts` (originally `middleware.ts`, merged after discovering Next.js 16 renamed the file) | `unsafe-inline` on `script-src` defeats most CSP XSS protection |
| Fixed `images.remotePatterns` gap (Supabase images were CSP-allowed but not Next-Image-allowed) | `next.config.ts` | Latent bug: any future `next/image` usage on a Supabase image would 400 |
| 14 clickable `<div>`/`<span>` → semantic `<button>`; 2 unavoidable button-in-button cases → `role="button"` + keyboard handler | 14 page files (farmer ×7, consumer ×4, government, login, +2) | 95 click handlers were bound to non-interactive elements — unreachable by keyboard, unannounced to screen readers (WCAG 2.1.1 / 4.1.2) |
| `aria-label` added to every icon-only control (dismiss, delete, qty ± , remove-from-cart, photo upload trigger) | `useToast.tsx`, `AiDecisionCard.tsx`, `farmer/crops`, `consumer/shop` | Icon-only buttons had no accessible name |
| Toast container made `role="status" aria-live="polite"` | `app/lib/useToast.tsx` | Toasts were invisible to screen reader users |
| `<label>`/`<input>` association via `id`/`htmlFor`; `aria-label` on placeholder-only inputs | `farmer/crops`, `farmer/income`, `consumer/shop`, `farmer/weather` | Zero form-label associations existed anywhere in the app |

## 10I-B — Security Gaps & Structural Duplication

| Fix | File(s) | Why |
|---|---|---|
| Added CSRF origin check (`isAllowedOrigin`) | `app/api/market-intelligence/route.ts`, `app/api/insights/route.ts`, `app/api/consumer/personalized/route.ts` | These 3 of 6 audited POST routes had auth checks but no CSRF check — cross-site requests from an authenticated browser would have succeeded |
| Fail-fast on missing Supabase env vars | `app/lib/supabase.ts`, `app/lib/supabase-server.ts` | Previously used non-null assertions (`!`) — would crash opaquely on first query instead of failing clearly at boot |
| Extracted `app/components/FarmerSidebar.tsx` | Replaces duplicated sidebar in all 7 farmer pages (`page.tsx`, `crops`, `advisor`, `disease`, `weather`, `income`, `sales`) | Sidebar markup was copy-pasted 7×; also fixed an inconsistency where some sub-pages omitted the profile block the main dashboard had |
| **Bug caught by `next build`, not assumed:** `middleware.ts` collided with the repo's existing `proxy.ts` (Next.js 16 renamed the convention) | `proxy.ts` | Build failed outright until the nonce-CSP logic was merged into the existing `proxy.ts`, which already does live session + role-to-path enforcement |

---

## STILL OPEN (not done this session)

| Item | Scope |
|---|---|
| Sidebar extraction for consumer (5 pages) and government (1 page) | Different layout (rounded-card, not fixed-position) — needs its own component, not a copy of `FarmerSidebar` |
| Design tokens / Tailwind adoption | App-wide inline `style={}` still hardcodes colors/spacing; Tailwind v4 is installed but unused |
| `next/image` migration | 25 raw `<img>` tags still flagged by `eslint` (`@next/next/no-img-element`) |
| Android launch blockers | `assetlinks.json` SHA-256 is still a placeholder; `android/keystore.properties` still missing; `NEXT_PUBLIC_APP_URL` / `CAPACITOR_SERVER_URL` still unset in the deployed environment |
| In-memory rate limiter | `app/lib/rateLimit.ts` won't survive multi-instance/serverless scaling |

---

**Prior reports referenced:** `phase-10g-certification-report.md`, `phase-10h-audit-report.md` (pre-existing, unrelated to this session's frontend work — covered backend/launch-ops readiness).
