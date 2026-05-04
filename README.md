# 250 & 500 Card Game

A mobile web app for the Indian trick-taking bidding card games "250" (6 players) and "500" (8 players).

Two modes:

- **Scorekeeper** — friends play with physical cards at a table; the app records bids, partners, and computes scores per the canonical rules. Works offline once installed.
- **Online** — full multiplayer game with server-authoritative card dealing, real-time bidding, trick play, and partner-reveal mechanics.

Mobile-only. Designed for portrait phone screens. Installs as a PWA.

## Game rules

See `RULES.md` for the canonical rules of both 250 and 500.

## Quick start (development)

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Project structure

Monorepo with three packages (npm workspaces):

- `packages/shared/` — Zod schemas, scoring engine, card types, game constants. Used by both web and api.
- `packages/web/` — React + Vite PWA (mobile-first). Both Scorekeeper and Online UIs.
- `packages/api/` — Node + Express + Socket.io backend for Online mode.

## Deploy — Railway (single service)

The recommended deploy. One Railway service hosts both the API and the built frontend at the same URL.

1. Push the repo to GitHub (already at `github.com/betacraft/250-500-card-game`).
2. Visit https://railway.app/new and import the repo.
3. Railway reads `railway.toml` automatically:
   - **Build:** `npm install && npm run build` (builds shared, web bundle with PWA assets, api server bundle)
   - **Start:** `npm start --workspace @250-500/api` (runs the bundled Node server, which also serves `packages/web/dist` static files in production)
   - **Healthcheck:** `/health` with 30s timeout
4. Set environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - `PORT` is auto-injected by Railway
5. Deploy. You'll get a URL like `250-500-card-game-production.up.railway.app`.
6. Open it on your phone, "Add to Home Screen" on iOS Safari or accept the install prompt on Android Chrome.

Both Scorekeeper (offline-capable PWA) and Online (multiplayer) work from the same URL.

## Deploy — Vercel (alternative, Phase 1 only)

If you only want the in-person Scorekeeper and don't care about online multiplayer, you can deploy just the static frontend to Vercel using the included `vercel.json`. The Online button will fail to connect since there's no backend on Vercel.

See `docs/DEPLOY.md` for the full Vercel runbook.

## Build status

| Phase | Epic | Title | Status |
|------|------|-------|--------|
| 1 | E01 | Mobile PWA setup | ✓ |
| 1 | E02 | Game state + setup page | ✓ |
| 1 | E03 | Bidding flow | ✓ |
| 1 | E04 | Trump + partner picker | ✓ |
| 1 | E05 | Scoring engine + multi-hand | ✓ |
| 1 | E06 | PWA polish + deploy config | ✓ |
| 2 | E07 | Backend + rooms | ✓ |
| 2 | E08 | Online game engine | ✓ |
| 2 | E09 | Online frontend | ✓ |
| 2 | E10 | Online polish + deploy config | ✓ |

164 tests passing. 95 KB gzipped frontend bundle. 40 KB api bundle.

## License

Private. All rights reserved.
