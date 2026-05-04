# E06 — PWA Polish + Deploy

**Phase:** 1
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E05
**Estimated sessions:** 1

## Overview

Polish the Scorekeeper PWA and deploy. After this epic, it's a usable product friends can install on their phones at the next in-person game night.

## What to Build

### PWA Polish
- [x] Install banner (when criteria met) with friendly UX explaining "Install for offline use"
- [x] App icons generated at all required sizes (192, 512, maskable, Apple touch)
- [x] `theme_color`, `background_color` set in manifest matching design language
- [x] Splash screen via icon + background_color (iOS auto-generates)
- [x] Service worker pre-caches the app shell + critical assets
- [x] "App updated, reload" prompt when service worker detects new version

### Offline Verification
- [x] App fully functional offline after first load
- [x] localStorage persistence proven across browser restart
- [x] No spinners/errors when network disabled

### Visual Polish
- [x] All animations respect `prefers-reduced-motion`
- [x] All toasts use the standard pattern (slide up from bottom, auto-dismiss 3s)
- [x] Error boundaries catch any unhandled errors with friendly retry UI
- [x] Empty states for: no players yet, no hands yet, game over with all 0 scores
- [x] Friendly form validation messages (no raw error objects)

### Accessibility Audit
- [x] All interactive elements keyboard-reachable
- [x] Screen reader test with VoiceOver (iOS) — announce game state changes via `aria-live`
- [x] Color contrast verified across all screens
- [x] Lighthouse Accessibility ≥ 95

### Performance Audit
- [x] Bundle size <150KB gzipped (`npm run build && du -sh dist/assets/*.js`)
- [x] Lighthouse Performance ≥ 90 on production build
- [x] Time-to-interactive <1s on mid-range device emulation

### Deployment
- [x] Choose host: Vercel or Netlify (free tier works for static SPA)
- [x] `vercel.json` (or `netlify.toml`) configured with SPA rewrites
- [x] Production build verified: `npm run build && npm run preview`
- [x] Custom domain optional; default to provided subdomain
- [x] Real-device test: install on iPhone (Safari) and Android (Chrome); play a hand

### Documentation
- [x] `README.md` at project root: what it is, how to play, how to develop
- [x] Screenshot or short GIF of the scorekeeper in action

## Tests Required

### Lighthouse (production build)
- [x] Performance ≥ 90
- [x] Accessibility ≥ 95
- [x] Best Practices ≥ 95
- [x] PWA ≥ 95

### E2E
- [x] Install prompt path on Android Chrome
- [x] Offline mode: load → offline → reload → app works
- [x] Persistence: state restored after browser quit + relaunch

### Manual QA
- [x] Played a full game from a real iPhone
- [x] Played a full game from a real Android phone
- [x] Verified install banner works on Chrome (Android)
- [x] Verified "Add to Home Screen" works on Safari (iOS)

## Done When

- [x] All quality gates pass
- [x] All Lighthouse scores ≥ targets
- [x] App live on production URL
- [x] CLAUDE.md updated; E06 marked Complete
- [x] Phase 1 SHIPPED ✓ — friends can install and use the Scorekeeper PWA
