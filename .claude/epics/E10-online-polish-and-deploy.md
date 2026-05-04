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
- [ ] Reconnection banner with manual retry
- [ ] Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- [ ] Full state diff on reconnect (server sends authoritative state; client re-parses with Zod)
- [ ] "Game paused" indicator when any player is disconnected

### Backend Polish
- [ ] Rate limiting per socket (10 events/sec; disconnect at sustained >50/sec)
- [ ] Graceful shutdown: drain rooms, notify clients, exit cleanly (catches SIGTERM from Railway)
- [ ] Health check includes basic stats: active rooms, connected clients
- [ ] Pino logger configured for production (info level, no debug)

### UX Polish
- [ ] Sound effects (optional, respect a mute toggle): card-play tap, trick-won chime, bid beep, partner-reveal flourish
- [ ] Haptic feedback (where supported via `navigator.vibrate`): card-tap, action-button-press
- [ ] Toast notifications for all transient events (bid placed, partner revealed, trick won)
- [ ] Friendly error toasts for all error codes

### Deployment
- [ ] `railway.toml` configured for single-service Node.js deploy
- [ ] Backend Express serves built frontend static files in production (`packages/web/dist`)
- [ ] Environment variables in Railway dashboard: `PORT` (auto), `NODE_ENV=production`, `LOG_LEVEL=info`
- [ ] Custom domain optional; default to railway.app subdomain
- [ ] Production deploy verified from real phones on real networks

### Documentation
- [ ] `README.md` updated with online mode info
- [ ] `docs/EVENTS.md` complete event catalog (maintained by docs-updater throughout)
- [ ] Deploy runbook for future updates

## Tests Required

### Lighthouse (production build)
- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 95
- [ ] PWA ≥ 95

### Multi-Device Manual QA
- [ ] 6 real phones (mix of iOS / Android) play a full game of 250 over real network
- [ ] 8 real phones play a full game of 500
- [ ] Reconnection on poor network (3G simulation in dev tools or real-world test)
- [ ] One player force-quits the app mid-hand → others see "Player disconnected"; player reopens app → rejoins

## Done When

- [ ] All quality gates pass
- [ ] App live on production Railway URL
- [ ] Phase 2 SHIPPED ✓ — full multiplayer 250 and 500 playable from any phone
- [ ] CLAUDE.md updated; E10 marked Complete
