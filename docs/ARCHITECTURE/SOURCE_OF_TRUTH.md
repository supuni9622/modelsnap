# ModelSnapper Architecture Source of Truth

Last updated: 2026-02-14
Scope: This document is the code-validated source of truth for the current MVP implementation.

## 1. Product Scope
ModelSnapper is a Next.js 15 App Router platform for AI fashion image generation.
Primary roles:
- BUSINESS: upload garments, generate renders, manage billing, browse models
- MODEL: manage profile, handle consent requests, view earnings/payouts
- ADMIN: analytics, users, subscriptions, credits, consent oversight

## 2. Canonical Technical Decisions
- Framework: Next.js App Router with TypeScript
- Auth: Clerk
- Database: MongoDB + Mongoose
- Image generation: FASHN API
- Storage: AWS S3 (CloudFront optional)
- Payments: Lemon Squeezy only (canonical)
- Email: Resend
- i18n: next-intl
- Testing: Playwright

## 3. Route Architecture
Main route groups:
- Public landing: `app/[locale]/(guest)/(landing)`
- Auth/onboarding: `app/[locale]/(auth)`
- Platform dashboards: `app/[locale]/(platform)`

Global request handling:
- `middleware.ts` composes Clerk protection + locale handling + prod env gating
- Root providers in `app/layout.tsx` and `app/[locale]/layout.tsx`

## 4. Identity and Access Flow
- Clerk is identity source.
- Mongo `User` stores app role and plan metadata.
- New non-admin users are intended to start as `role: null` and choose role in onboarding.
- Admin is granted via `ADMIN_EMAILS` (plus role checks where present).

Key files:
- `app/api/webhook/clerk/route.ts`
- `app/[locale]/(auth)/redirect/page.tsx`
- `app/api/user/role/route.ts`
- `lib/auth-utils.ts`

## 5. Core Domain Data
Primary models:
- User: `models/user.ts`
- BusinessProfile: `models/business-profile.ts`
- ModelProfile: `models/model-profile.ts`
- Render (legacy AI generation record): `models/render.ts`
- Generation (human model generation record): `models/generation.ts`
- Consent, payout, invoice, transactions in `models/*`

Important current state:
- Generation data is split across `Render` and `Generation` collections.
- Credit state appears in both `User.credits` and `BusinessProfile.aiCreditsRemaining`.

## 6. Rendering Pipeline (Implemented)
Canonical endpoint: `app/api/render/route.ts`
Server-side flow:
1. Authenticate user
2. Validate payload/image URLs
3. Resolve model type (AI avatar vs human model)
4. Check generation eligibility and credits
5. Persist initial render/generation record
6. Call FASHN API
7. Persist output status/URLs
8. Return preview + output references

Watermark and download:
- Watermarked preview endpoint: `app/api/images/[id]/watermarked/route.ts`
- Download endpoint with permission checks: `app/api/render/download/route.ts`

## 7. Payments (Canonical)
Canonical gateway: Lemon Squeezy only.

Main Lemon paths:
- Checkout creation: `app/api/payments/lemonsqueezy/create-checkout/route.ts`
- Webhook: `app/api/webhook/lemonsqueezy/route.ts`

Legacy/non-canonical paths still present in repo:
- Stripe routes and webhook
- WebXPay routes/components
These are not canonical and should not be used for new work.

## 8. Storage and Media
- Upload handling: `app/api/upload/route.ts`
- S3 helpers: `lib/s3.ts`
- Optional optimization/watermark: `lib/image-optimization.ts`, `lib/watermark.ts`

## 9. Observability and Protection
- Structured logging utility: `lib/utils/logger.ts`
- Rate limiting wrapper: `lib/rate-limiter.ts`
- DB connection resilience and health checks: `lib/db.ts`

## 10. Delivery and Testing
- CI: `.github/workflows/ci.yml` (lint, typecheck, build, Playwright)
- Playwright config: `playwright.config.ts`
- Note: Several test specs are currently placeholders and do not validate full product behavior.

## 11. Known Divergences (Must Be Resolved)
1. Payment provider drift
- Docs and code contain Stripe/WebXPay paths while product decision is Lemon only.

2. Credit source-of-truth drift
- Credits are read/written through both `User` and `BusinessProfile` in different routes.

3. Generation record drift
- AI and human generations use different collections and shapes.

4. Documentation drift
- Multiple docs report conflicting status, dates, and percentages.

## 12. Cleanup Plan (Priority Ordered)
### P0 (Immediate)
1. Enforce Lemon-only payment architecture
- Remove/disable Stripe and WebXPay UI entry points.
- Guard/retire Stripe and WebXPay API routes.
- Update env checker/docs to Lemon-only required vars.

2. Define and enforce one credit source of truth
- Canonicalize on `BusinessProfile.aiCreditsRemaining` for generation eligibility and deduction.
- Restrict `User.credits` to legacy/read-only compatibility or remove usage.

3. Align docs to this file
- Make this doc canonical.
- Update README, ROADMAP, PROJECT_SUMMARY, SETUP docs to match.

### P1 (Short Term)
4. Unify generation persistence model
- Migrate toward a single collection/schema for both AI and human generations.
- Add compatibility adapter for old records.

5. Harden webhook flows
- Ensure idempotency, clear retry behavior, and consistent user lookup keys.

6. Replace placeholder tests with executable flows
- Cover onboarding, generation, billing, and consent critical paths.

### P2 (Medium Term)
7. Remove dead code/config
- Delete retired provider libs/routes/components after migration complete.

8. Add architectural guardrails
- Lint rules or build-time checks preventing reintroduction of non-canonical payment paths.

## 13. Working Agreement for Future Changes
- If implementation and docs disagree, implementation is truth until docs are updated in same change.
- Any change to payment, credits, or generation schema must update this file and `ROADMAP.md` in the same PR.
