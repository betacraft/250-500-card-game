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
- [ ] Install banner (when criteria met) with friendly UX explaining "Install for offline use"
- [ ] App icons generated at all required sizes (192, 512, maskable, Apple touch)
- [ ] `theme_color`, `background_color` set in manifest matching design language
- [ ] Splash screen via icon + background_color (iOS auto-generates)
- [ ] Service worker pre-caches the app shell + critical assets
- [ ] "App updated, reload" prompt when service worker detects new version

### Offline Verification
- [ ] App fully functional offline after first load
- [ ] localStorage persistence proven across browser restart
- [ ] No spinners/errors when network disabled

### Visual Polish
- [ ] All animations respect `prefers-reduced-motion`
- [ ] All toasts use the standard pattern (slide up from bottom, auto-dismiss 3s)
- [ ] Error boundaries catch any unhandled errors with friendly retry UI
- [ ] Empty states for: no players yet, no hands yet, game over with all 0 scores
- [ ] Friendly form validation messages (no raw error objects)

### Accessibility Audit
- [ ] All interactive elements keyboard-reachable
- [ ] Screen reader test with VoiceOver (iOS) — announce game state changes via `aria-live`
- [ ] Color contrast verified across all screens
- [ ] Lighthouse Accessibility ≥ 95

### Performance Audit
- [ ] Bundle size <150KB gzipped (`pnpm build && du -sh dist/assets/*.js`)
- [ ] Lighthouse Performance ≥ 90 on production build
- [ ] Time-to-interactive <1s on mid-range device emulation

### Deployment
- [ ] Choose host: Vercel or Netlify (free tier works for static SPA)
- [ ] `vercel.json` (or `netlify.toml`) configured with SPA rewrites
- [ ] Production build verified: `pnpm build && pnpm preview`
- [ ] Custom domain optional; default to provided subdomain
- [ ] Real-device test: install on iPhone (Safari) and Android (Chrome); play a hand

### Documentation
- [ ] `README.md` at project root: what it is, how to play, how to develop
- [ ] Screenshot or short GIF of the scorekeeper in action

## Tests Required

### Lighthouse (production build)
- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 95
- [ ] Best Practices ≥ 95
- [ ] PWA ≥ 95

### E2E
- [ ] Install prompt path on Android Chrome
- [ ] Offline mode: load → offline → reload → app works
- [ ] Persistence: state restored after browser quit + relaunch

### Manual QA
- [ ] Played a full game from a real iPhone
- [ ] Played a full game from a real Android phone
- [ ] Verified install banner works on Chrome (Android)
- [ ] Verified "Add to Home Screen" works on Safari (iOS)

## Done When

- [ ] All quality gates pass
- [ ] All Lighthouse scores ≥ targets
- [ ] App live on production URL
- [ ] CLAUDE.md updated; E06 marked Complete
- [ ] Phase 1 SHIPPED ✓ — friends can install and use the Scorekeeper PWA
