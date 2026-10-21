# Venta — Design Source of Truth

## Canonical design

**All UI work must follow the Google Stitch project (do not invent a parallel visual language):**

**[Venta — Stitch Project](https://stitch.withgoogle.com/projects/11793229301040200450)**

Stitch is the master for layout, typography, color, spacing, component shapes, and screen structure. Engineering and any further AI generation should **extend** this project—not replace it.

---

## How to sync Stitch → codebase

1. **Export `DESIGN.md`** from the Stitch project (colors, type, spacing, radius, shadows).
2. **Copy screen names** from the Stitch canvas into the [Screen inventory](#screen-inventory) table below (check off as built).
3. **Optional:** Copy to Figma for team review ([Stitch Figma export](https://googlestitch.me/integration/figma)) — Standard Mode only.
4. **Frontend:** Map tokens to `frontend/app/globals.css` + Tailwind theme; build components to match Stitch, not generic shadcn defaults.
5. **New screens:** Generate inside the **same Stitch project** so style stays consistent.

---

## Product surfaces (must match Stitch frames)

| Surface | Route prefix | Primary users |
|---------|--------------|---------------|
| Marketing / landing | `/` | Prospects |
| Business auth | `/login`, `/register` | Owner (onboarding) |
| Platform auth | `/platform/login` | Super Admin, Platform Admin |
| Business dashboard | `/{businessSlug}/...` | Owner, Manager, Employee |
| Kitchen Display (KDS) | `/{businessSlug}/kitchen` | Kitchen staff — fullscreen |
| Customer QR ordering | `/{businessSlug}/order`, `/t/{tableId}` | Public, mobile-first |
| Platform admin | `/platform/...` | Super Admin, Platform Admin |

---

## Screen inventory

Map each Stitch frame → Next.js route. Update this table as you confirm frames in Stitch.

### Auth
| Stitch frame | Route | Backend API |
|--------------|-------|-------------|
| Register cafe | `/register` | `POST /api/v1/auth/register` |
| Staff login | `/login` | `POST /api/v1/auth/login` |
| Platform login | `/platform/login` | `POST /api/v1/platform/auth/login` |

### Business dashboard (tenant)
| Stitch frame | Route | Backend API |
|--------------|-------|-------------|
| Dashboard home | `/{slug}/dashboard` | orders, metrics aggregates |
| Menu | `/{slug}/menu` | `/api/v1/menu` |
| Floor plan | `/{slug}/floor-plan` | `/api/v1/floor-plan` |
| Orders list | `/{slug}/orders` | `/api/v1/orders` |
| Order detail / create | `/{slug}/orders/[id]`, `/new` | `/api/v1/orders` |
| Kitchen (KDS) | `/{slug}/kitchen` | `/api/v1/kitchen` |
| Reservations | `/{slug}/reservations` | `/api/v1/reservations` |
| Customers | `/{slug}/customers` | `/api/v1/customers` |
| Promotions | `/{slug}/promotions` | `/api/v1/promotions` |
| QR codes | `/{slug}/qr` | `/api/v1/qr` |
| Staff | `/{slug}/staff` | `/api/v1/staff` |
| Settings / branding | `/{slug}/settings` | `/api/v1/business/me` |
| Billing | `/{slug}/billing` | `/api/v1/billing/subscription` |
| Notifications log | `/{slug}/notifications` | `/api/v1/notifications/logs` |

### Platform admin
| Stitch frame | Route | Backend API |
|--------------|-------|-------------|
| Platform overview | `/platform` | `/api/v1/platform/metrics` |
| Businesses list | `/platform/businesses` | `GET /api/v1/platform/businesses` |
| Business detail | `/platform/businesses/[id]` | `GET/PATCH .../subscription`, suspend |
| Platform admins | `/platform/admins` | `/api/v1/platform/admins` |
| Audit log | `/platform/audit` | `/api/v1/platform/metrics/audit-logs` |

### Customer (public QR)
| Stitch frame | Route | Backend API |
|--------------|-------|-------------|
| Public menu | `/{slug}/order` | `GET /api/v1/public/{slug}` |
| Table menu | `/{slug}/order/t/{table}` | public + table resolve |
| Item + modifiers | drawer/modal | menu item detail |
| Cart / confirm | checkout step | `POST /api/v1/orders` (future public) |

---

## Role-based navigation (implement in Stitch shell)

### Tenant — show/hide nav by role
| Nav item | Owner | Manager | Employee |
|----------|-------|---------|----------|
| Dashboard | ✓ | ✓ | — |
| Orders | ✓ | ✓ | ✓ |
| Kitchen | ✓ | ✓ | — |
| Floor plan | ✓ | ✓ | — |
| Menu | ✓ | ✓ | — |
| Reservations | ✓ | ✓ | — |
| Customers | ✓ | ✓ | view |
| Promotions | ✓ | ✓ | — |
| QR | ✓ | ✓ | — |
| Staff | ✓ | ✓ | — |
| Settings / Billing | ✓ | — | — |

### Platform — show/hide by role
| Nav item | Super Admin | Platform Admin |
|----------|-------------|----------------|
| Overview / Metrics | ✓ | ✓ |
| Businesses | ✓ | ✓ |
| Suspend / subscription | ✓ | ✓ |
| Delete business | ✓ | — |
| Platform admins CRUD | ✓ | — |
| Audit log | ✓ | ✓ |

---

## Design tokens (paste from Stitch DESIGN.md export)

<!-- Replace this block after exporting from Stitch -->

```yaml
# TODO: Paste from Stitch DESIGN.md
brand:
  name: Venta
colors:
  primary: #______  # from Stitch
  background: #______
  foreground: #______
  muted: #______
  accent: #______
  destructive: #______
typography:
  fontFamily:
    sans: "______"
    display: "______"
  scale: # from Stitch
spacing: # 4px base from Stitch
radius: # from Stitch
shadows: # from Stitch
```

---

## Stitch prompt for new screens (use inside existing project)

When adding screens in [the Stitch project](https://stitch.withgoogle.com/projects/11793229301040200450), use:

> Add a new screen to this project. **Match the existing Venta design system exactly** — same colors, typography, spacing, sidebar shell, button styles, and table patterns as the current frames. Do not introduce new visual styles.
>
> Screen: [NAME]
> Surface: [Business dashboard | Platform admin | KDS | Customer QR]
> Purpose: [one sentence]
> Key data: [fields, statuses, actions]
> Responsive: desktop + mobile (or KDS fullscreen / customer mobile-only)
> Backend fields: [optional API field names from Postman]

---

## Engineering rules

1. **Stitch wins on visuals** — if code and Stitch differ, fix code.
2. **Backend wins on data** — labels, statuses, and enums come from API (`OrderStatus`, `SubscriptionStatus`, `PlatformRole`, etc.).
3. **Tenant white-label** — customer QR pages use business `primaryColor` + `logoUrl` from API; admin UI uses Stitch platform tokens.
4. **No generic AI chrome** — no purple gradients, no default shadcn look without token overrides.
5. **Responsive** — every business + platform screen: mobile, tablet, desktop. KDS: tablet landscape priority. QR: mobile portrait priority.

---

## References

- [Google Stitch](https://stitch.withgoogle.com/) — design canvas
- [Stitch product blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) — DESIGN.md, exports
- Backend API: `backend/postman/venta-api.postman_collection.json`
- Architecture plan: `.cursor/plans/solto_cafe_modular_monolith_architecture_75223cb7.plan.md`
