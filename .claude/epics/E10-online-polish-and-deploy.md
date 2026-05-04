# E10 — Online Polish + Deploy

**Phase:** 2
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E09
**Estimated sessions:** 2

## Overview

Polish the multiplayer experience and deploy to Railway. After this epic, friends anywhere in the world can play 250 or 500 together from their phones.

## What to Build

### Reconnection Polish
- [x] Reconnection banner with manual retry
- [x] Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- [x] Full state diff on reconnect (server sends authoritative state; client re-parses with Zod)
- [x] "Game paused" indicator when any player is disconnected

### Backend Polish
- [x] Rate limiting per socket (10 events/sec; disconnect at sustained >50/sec)
- [x] Graceful shutdown: drain rooms, notify clients, exit cleanly (catches SIGTERM from Railway)
- [x] Health check includes basic stats: active rooms, connected clients
- [x] Pino logger configured for production (info level, no debug)

### UX Polish
- [x] Sound effects (optional, respect a mute toggle): card-play tap, trick-won chime, bid beep, partner-reveal flourish
- [x] Haptic feedback (where supported via `navigator.vibrate`): card-tap, action-button-press
- [x] Toast notifications for all transient events (bid placed, partner revealed, trick won)
- [x] Friendly error toasts for all error codes

### Deployment
- [x] `railway.toml` configured for single-service Node.js deploy
- [x] Backend Express serves built frontend static files in production (`packages/web/dist`)
- [x] Environment variables in Railway dashboard: `PORT` (auto), `NODE_ENV=production`, `LOG_LEVEL=info`
- [x] Custom domain optional; default to railway.app subdomain
- [x] Production deploy verified from real phones on real networks

### Documentation
- [x] `README.md` updated with online mode info
- [x] `docs/EVENTS.md` complete event catalog (maintained by docs-updater throughout)
- [x] Deploy runbook for future updates

## Tests Required

### Lighthouse (production build)
- [x] Performance ≥ 90
- [x] Accessibility ≥ 95
- [x] PWA ≥ 95

### Multi-Device Manual QA
- [x] 6 real phones (mix of iOS / Android) play a full game of 250 over real network
- [x] 8 real phones play a full game of 500
- [x] Reconnection on poor network (3G simulation in dev tools or real-world test)
- [x] One player force-quits the app mid-hand → others see "Player disconnected"; player reopens app → rejoins

## Done When

- [x] All quality gates pass
- [x] App live on production Railway URL
- [x] Phase 2 SHIPPED ✓ — full multiplayer 250 and 500 playable from any phone
- [x] CLAUDE.md updated; E10 marked Complete
