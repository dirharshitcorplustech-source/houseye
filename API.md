# Houseye.com — API Map

All responses: `{ success: true, data }` or `{ success: false, error: { code, message } }`

## Auth
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | Owner Explore Mode |
| POST | `/api/auth/login` | Common login, no role selector |
| POST | `/api/auth/logout` | Current session only |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/accept-invite` | Manager/Admin/Tenant activate |

## Subscription
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/subscriptions/me` | Status, limits, usage |
| POST | `/api/subscriptions/activate` | Plan + cycle (+ dev mode) |
| POST | `/api/subscriptions/cancel` | Auto-renew off |

## Properties
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/properties` | List / create (Owner) |
| GET/POST | `/api/properties/:id/units` | Units |
| GET/POST | `/api/properties/:id/floors` | Floors |

## Team
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/team/managers` | Invite manager + scope |

## Tenants
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/tenants` | List / move-in |
| POST | `/api/tenants/:id/move-out` | Works even if sub expired |

## Billing & Payments
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/bills` | List / generate |
| GET/POST | `/api/payments` | List / submit proof |
| POST | `/api/payments/:id/approve` | Allocation + receipt |
| POST | `/api/payments/:id/reject` | Reason required |

## Maintenance
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/maintenance/categories` | Category list |
| GET/POST | `/api/maintenance` | List / submit |
| POST | `/api/maintenance/:id/status` | Lifecycle |

## Notifications
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/notifications` | In-app for current user |

## Trash
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/trash` | List / soft-delete |
| POST | `/api/trash/restore` | Restore with conflict check |

## Account lifecycle
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/account/deletion` | 30-day request |

## Super Admin
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/admin/bootstrap` | First Super Admin |
| GET | `/api/admin/customers` | Customer list |
| GET | `/api/admin/customers/:id` | Detail |
| POST | `/api/admin/customers/:id/suspend` | Suspend / unsuspend |
| POST | `/api/admin/customers/:id/restore` | Approve restore |

## Locked business rules (code)
- Payment allocation: Fine → Previous Due → Rent → Electricity → Maintenance
- One ACTIVE primary tenancy per unit
- Occupants do not consume tenant capacity
- Structure create/edit/delete: Owner only
- No permanent delete (Trash)
- Maintenance: no delete, one dispute
- Move-out allowed when subscription expired
- Notifications: central providers, not Owner APIs

## Sessions
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/auth/sessions` | List active sessions |
| DELETE | `/api/auth/sessions` | Terminate one or all others |

## Password reset
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/reset-password` | Confirm new password |


## Team
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/team/admins` | List / invite Admin |
| POST | `/api/team/managers` | Invite Manager |

## Expenses
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/expenses` | List / create (sub active required) |


## Meter
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/meter` | List / submit reading |


## Documents
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/documents` | Metadata register / list (S3 binary later) |


## Background jobs (Super Admin or x-cron-secret)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/admin/jobs/mark-overdue` | Bills past due → OVERDUE |
| POST | `/api/admin/jobs/expire-subscriptions` | Past end date → EXPIRED |
| POST | `/api/admin/jobs/finalize-deletions` | 30-day wait complete |

## Idempotency
Send header `Idempotency-Key` on `POST /api/payments/:id/approve`
