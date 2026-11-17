# Hisabwise

## Offline POS (local production test)

Offline mode is only enabled in a **production** frontend build. `npm run dev` does **not** register the service worker.

### Backend — database and Prisma

Offline sync uses the `PosDevice` model and extra `Order` fields. After pulling schema changes:

```bash
cd backend
npx prisma db push
npx prisma generate
npm run dev   # or restart your API process
```

On startup the API logs either `Offline POS Prisma models OK` or an error listing missing delegates (usually `posDevice`). Sync responses include the same setup message if the client was never regenerated.

### Frontend — build, start, warm caches

```bash
cd frontend
npm run build
npm run start
```

1. Open `http://localhost:3000` (or `http://127.0.0.1:3000` — **pick one host** and stay on it).
2. Log in and open **New order** once while online until the banner shows **Ready for offline** or visit `/offline-status`.
3. In Chrome DevTools → **Application** → **Service workers**: disable **Update on reload** and **Bypass for network** while testing.
4. Set **Network → Offline** and hard-refresh the POS URL.

### E2E

```bash
cd frontend
npm run test:e2e:offline
```