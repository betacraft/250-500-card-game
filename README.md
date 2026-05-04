# 250 & 500 Card Game

A mobile web app for the Indian trick-taking bidding card games "250" (6 players) and "500" (8 players).

Two modes:

- **Scorekeeper** (Phase 1, ✓ shipped) — friends play with physical cards at a table; the app records bids, partners, and computes scores per the canonical rules.
- **Online** (Phase 2, in progress) — full multiplayer game with server-authoritative card dealing, real-time bidding, trick play, and partner-reveal mechanics.

Mobile-only. Designed for portrait phone screens. Installs as a PWA (works offline once installed).

## Game rules

See `RULES.md` for the canonical rules.

## Quick start (development)

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit across all packages
npm run lint         # ESLint
npm run test         # Vitest unit + component
npm run test:e2e     # Playwright (mobile viewport)
npm run build        # production build (PWA assets)
```

## Project structure

Monorepo with three packages:

- `packages/shared/` — Zod schemas, scoring engine, card types, game constants.
- `packages/web/` — React + Vite PWA (mobile-first).
- `packages/api/` — Node + Express + Socket.io backend (Phase 2; dormant in Phase 1).

## Architecture

Phase 1 is a pure static SPA — no backend, no accounts. State persists in localStorage. Hosted on Vercel/Netlify free tier.

Phase 2 adds a Node + Socket.io backend on Railway. Frontend reuses the Phase 1 components and wraps them with card dealing, trick-taking, and real-time sync.

See `CLAUDE.md` for the full project bible (conventions, agent team, decisions log) and `docs/MOBILE-DESIGN-LANGUAGE.md` for the visual language.

## Deploy (Phase 1)

### Vercel

1. Push this repo to GitHub.
2. Import the repo at https://vercel.com/new.
3. Vercel reads `vercel.json` automatically: build command, output dir, SPA rewrites, cache headers.
4. Deploy. Visit the URL on your phone.

### Netlify

1. Push to GitHub.
2. Import at https://app.netlify.com.
3. Netlify reads `netlify.toml`.
4. Deploy.

### PWA icon generation

Once on a real machine with `sharp` available:

```bash
npm install -D sharp
node scripts/generate-icons.mjs
git add packages/web/public/icons/*.png
git commit -m "chore(pwa): generate icon PNGs"
```

## Build status

| Phase | Epic | Title | Status |
|------|------|-------|--------|
| 1 | E01 | Mobile PWA setup | ✓ |
| 1 | E02 | Game state + setup page | ✓ |
| 1 | E03 | Bidding flow | ✓ |
| 1 | E04 | Trump + partner picker | ✓ |
| 1 | E05 | Scoring engine + multi-hand | ✓ |
| 1 | E06 | PWA polish + deploy | ✓ (deploy by user) |
| 2 | E07 | Backend + rooms | (in progress) |
| 2 | E08 | Online game engine | |
| 2 | E09 | Online frontend | |
| 2 | E10 | Online polish + deploy | |

## License

Private. All rights reserved.
