# Offline POS & theme deploy notes

## Database migration (production)

This repo uses **Prisma Migrate** (`backend/prisma/migrations/`).

1. Deploy backend build to your API hosts.
2. Run on the production database (maintenance window not required — changes are additive):

```bash
cd backend
npx prisma migrate deploy
```

Migration: `20261111120000_pos_offline_devices`

- Creates `pos_devices`
- Adds optional `orders.pos_device_id`, `offline_ticket_label`, `sync_conflict_flags`
- Updates platform default theme colors when the row still matches legacy teal defaults

## Backend endpoints

- `GET /api/v1/pos/offline-snapshot` — menu + tenant settings + theme for IndexedDB
- `POST /api/v1/pos/devices/register` — per-device ticket prefix (`A`, `B`, …)
- `POST /api/v1/pos/orders/sync-batch` — idempotent offline order upload (cash completion)

## Frontend / CDN

1. Build frontend (`npm run build` in `frontend/`).
2. Service worker is emitted to `public/sw.js` (disabled in `next dev`; enabled in production build).
3. After deploy, tenants should **hard-refresh once** (or revisit POS) so the service worker installs.
4. Serwist is configured with `cacheOnNavigation: true` — tenants must open **New Order while online** once so RSC/HTML responses are cached before going offline.
5. The service worker uses **NetworkOnly** for `/api/*` so cached `/health` cannot fake an online state while offline.
4. No new env vars are required if `NEXT_PUBLIC_API_URL` already points at `/api/v1`.

## Tenant guidance

- Open the POS **once online** so menu, theme, and device prefix cache locally.
- Offline: **cash only**, dine-in / takeaway, no new logins, no delivery, no card/online pay.
- Pending orders show in the offline banner; they sync automatically when API health returns.
- **Do not log out** until pending orders show as synced (logout is blocked while queue is non-empty).

## Out of scope (next phases)

- Multi-device LAN / shared KDS while offline
- FBR/PRA fiscal offline
- Offline business-day close
