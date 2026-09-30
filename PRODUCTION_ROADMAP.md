# Houseye — Production Roadmap

**Current state:** Domain skeleton (not production SaaS)  
**Goal:** First careful production for real landlords in India

---

## Week 1 — Money + identity (blockers)

| # | Task | Why | Done when |
|---|------|-----|-----------|
| 1 | Razorpay (or Stripe) subscription checkout | Real plan activation | Webhook signature verified → status ACTIVE only after paid |
| 2 | Razorpay payment link / order for tenant bills (optional phase-1.5) | Tenant can pay online | Success webhook → auto-approve or record gateway payment |
| 3 | Remove/disable `ALLOW_DEV_SUBSCRIPTION` in production | No free activate | Env production rejects activate without paymentRef |
| 4 | SMTP email (Resend/SES/SMTP) | Password reset + bill alerts work | Forgot-password receives real email |
| 5 | Middleware JWT verify + role gate | Already started | Invalid cookie cannot open /dashboard |
| 6 | Allocation + authz automated tests | Prevent money bugs | CI runs `node scripts/test-allocation.mjs` + API smoke |

**Exit:** Cannot activate sub without payment; reset password email works; allocation test green.

---

## Week 2 — Files + notifications + jobs

| # | Task | Why | Done when |
|---|------|-----|-----------|
| 1 | S3 presigned upload/download | Agreements, ID, payment proof | File private; only authorized roles fetch |
| 2 | Notification worker | QUEUED → SENT | Email delivery for bill + payment events |
| 3 | Optional SMS (MSG91/etc.) | India mobile OTP | OTP reset works on SMS path |
| 4 | Wire cron | Overdue bills, expire subs, 30-day delete | Daily schedules hit job APIs with CRON_SECRET |
| 5 | Meter + Documents minimal UI | API-only gaps | Staff can submit reading; list docs |
| 6 | PDF bill/receipt (react-pdf) | Landlord expectation | Download bill PDF |

**Exit:** Proof upload + email path real; cron running on staging.

---

## Week 3 — Hardening + launch readiness

| # | Task | Why | Done when |
|---|------|-----|-----------|
| 1 | Redis rate limit | Multi-instance safe | Login flood blocked across instances |
| 2 | Playwright E2E | Critical path regression | Owner: register→sub→property→tenant→bill→pay |
| 3 | Security headers, dependency audit | Baseline hygiene | npm audit clean or accepted; CSP/HSTS |
| 4 | Monitoring (Sentry) + uptime on /api/health | Know when down | Errors visible |
| 5 | Legal pages + data retention ops | Compliance baseline | Terms/privacy live; deletion job monitored |
| 6 | Staging load check | Avoid surprise | 50 concurrent sessions smoke |

**Exit:** Staging sign-off checklist all green → limited beta production.

---

## Explicitly out of scope for v1

- Mobile native apps  
- Accounting GST full returns filing  
- WhatsApp Business official templates (can be v1.1)  
- Multi-currency  
- White-label  

---

## Local commands (now)

```bash
cd houseye
npm install
cp .env.example .env.local
npm run seed
node scripts/test-allocation.mjs
npm run dev
```
