# Houseye.com — Property Management SaaS

Multi-tenant platform for owners, managers and tenants.

## Stack

Next.js 14 · TypeScript · Tailwind · MongoDB/Mongoose · JWT sessions · bcrypt

## Quick start

```bash
cd houseye
npm install
cp .env.example .env.local
# Set MONGODB_URI, AUTH_SECRET, JWT_SECRET, ALLOW_DEV_SUBSCRIPTION=true
npm run seed   # optional: Super Admin + Demo Owner
npm run dev
```

### Seed accounts (after seed)

| User | Username | Password |
|------|----------|----------|
| Super Admin | `SA-HOUSEYE-ADMIN` | `Houseye@Admin1` |
| Demo Owner | `OWN-DEMO-OWNER` | `Demo@Owner1` |


Open http://localhost:3000

**Super Admin bootstrap:** `POST /api/admin/bootstrap` (set SUPER_ADMIN_EMAIL/PASSWORD in env)

## What works

| Area | Features |
|------|----------|
| **Auth** | Register, login, lockout, sessions, logout (current device), password reset, change password |
| **Subscription** | Essential / Professional / Business, activate, cancel auto-renew, usage meters |
| **Properties** | Create property, floors, units, vacancy, soft-delete trash |
| **Team** | Manager invite + accept-invite + scopes/permissions |
| **Tenants** | Move-in, occupants, move-out (sub expiry exception), tenant portal |
| **Billing** | Generate bills, locked allocation Fine→Due→Rent→Elec→Maint |
| **Payments** | Submit proof, approve/reject (reason required), advance credit, receipts |
| **Maintenance** | Categories, system priority, status lifecycle, no delete, one dispute |
| **Notifications** | Central dispatch, in-app, payment/maintenance events |
| **Account** | 30-day deletion request, Super Admin restore |
| **Super Admin** | Customer list, suspend, restore, stats |

## Key routes

- `/register` `/login` `/forgot-password`
- `/dashboard` `/dashboard/properties` `/dashboard/tenants` `/dashboard/bills` `/dashboard/payments` `/dashboard/subscription` `/dashboard/sessions` `/dashboard/settings`
- `/tenant` `/tenant/bills` `/tenant/maintenance`
- `/admin` `/admin/customers/[id]`
- `/accept-invite`

See **API.md** for full endpoint map.

## Spec rules locked in code

1. Payment allocation order is fixed (Owner override reserved)
2. One ACTIVE primary tenancy per unit
3. Occupants do not consume tenant capacity
4. Structure mutations: Owner only
5. No permanent delete — Trash only
6. Maintenance: no delete, closed via lifecycle
7. Move-out allowed when subscription expired
8. Notifications: platform providers, not Owner APIs
9. Password change / reset → all sessions revoked
10. Fully paid bill → not editable

## Not included (infrastructure)

- Live payment gateway + webhooks
- Production SMS / Email / WhatsApp providers
- AWS S3 binary uploads
- Cron job runners (scheduled billing, 30-day finalize)
- Full automated E2E suite

## License

Proprietary — Houseye
