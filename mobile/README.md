# HisabWise Mobile POS (Expo)

Phone-first React Native app for HisabWise staff POS. It talks to the **same** `/api/v1` backend as the Next.js web POS (`frontend/`).

**Expo SDK 58** (latest stable on npm: `expo@58.0.26`) with React 19.3 and React Native 0.88.

## Requirements

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/) (via `npx expo`)
- Expo Go on a device, or Android/iOS simulator
- Optional: [EAS CLI](https://docs.expo.dev/build/setup/) for dev/preview/production builds (owner: `kashan3241`)

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # optional — adjust API URL
```

### Environment

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | API base URL (no trailing slash). Default: `https://hisabwise.com/api/v1` |

Configured in `app.config.ts` / `lib/config.ts` and duplicated in `eas.json` build profiles.

## Run locally

```bash
npm start          # or: npx expo start
npm run android    # Expo Go / emulator
npm run ios        # Expo Go / simulator (macOS for native build)
npm run web        # quick UI smoke test in the browser
npm run typecheck  # TypeScript
npx expo-doctor    # SDK compatibility check
```

Scan the QR code with **Expo Go** (SDK 58) or press `w` for web.

For a **development client** (when you need custom native modules later):

```bash
npx eas build --profile development --platform android
```

## EAS builds

Project owner: `kashan3241`. Profiles in `eas.json`:

- **development** — dev client, internal distribution
- **preview** — internal APK/IPA for testers
- **production** — store-ready with auto-incrementing version

```bash
npx eas login
npx eas build --profile preview --platform all
```

Link the EAS project once (sets `extra.eas.projectId` in `app.config.ts`):

```bash
npx eas init
```

## Features (v1)

- Email/password login (`POST /auth/login`), token in **expo-secure-store**, logout
- Business day & cash shift status bar (permission-aware; 403 on business day is **not** treated as “day closed”)
- Menu browse + search, session cart, place/hold orders, send to kitchen, cash completion
- Open orders list and order detail
- UI gated on JWT permissions (mirrors `frontend/lib/auth/permissions.ts` patterns)

## Out of scope (TODO in app)

- KOT/receipt printing
- Offline queue & sync
- Reports / dashboard / admin
- Floor plan & table picker
- Modifier/variant picker UX
- Token refresh without httpOnly cookies on native (see PR notes)

## API default

Production: `https://hisabwise.com/api/v1`  
Local backend: `EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1` (ensure your machine is reachable from the device/emulator).