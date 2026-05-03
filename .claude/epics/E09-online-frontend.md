# E09 — Online Frontend

**Phase:** 2
**Status:** Not Started
**Owner:** tech-lead
**Depends on:** E08
**Estimated sessions:** 3

## Overview

Build the mobile UI for online gameplay. Reuses shared components from Phase 1 (BiddingFlow, TrumpPicker, PartnerPicker, ScoreBoard) and adds new online-mode components: card slider (the player's hand), trick area (cards being played), opponents row (compact strip showing the other 5/7 players).

## What to Build

### New Online-Mode Components (`packages/web/src/components/online/`)

- [ ] `<HandSlider />` — horizontal snap-scroll list of own cards. Tap to select (lifts +10px, gold ring); action button at bottom shows "Play [card]"; respects "always confirm" setting.
- [ ] `<TrickArea />` — center area showing cards already played to the current trick; positioned to suggest who played each (small avatar near each card); led suit indicator.
- [ ] `<OpponentsRow />` — horizontal strip at top of screen showing 5 (or 7) other players: avatar, name, card count, status (turn / passed / partner / bidder).
- [ ] `<TopStateStrip />` — compact 3-section strip: trump | bid | running score.
- [ ] `<ConnectionStatus />` — corner indicator: connected / reconnecting / disconnected. Disabled-state propagates to action buttons.
- [ ] `<PartnerRevealToast />` — celebration overlay when a non-bidder plays a called card; gold flash on revealed player + toast: "Mayuresh revealed as partner!"

### New Online Pages (`packages/web/src/pages/`)
- [ ] `OnlineGamePage.tsx` — orchestrates: top strip → opponents → trick area → hand slider → action button
- [ ] `OnlineGameOverPage.tsx` — final scoreboard, "Play again" / "Leave room"

### State Wiring
- [ ] `online-game-store` (Zustand) — subscribes to server `game:state-updated` and private `game:hand-dealt`; holds public state + own hand
- [ ] Selectors: `useMyHand()`, `useIsMyTurn()`, `useLegalCards()`, `useCurrentTrick()`
- [ ] `lib/socket-client.ts` extended with game-event helpers
- [ ] All inbound events parsed via Zod from `@250-500/shared`

### Reused Shared Components (Phase 1)
- [ ] `<BiddingFlow />` — used as-is in lobby's bid panel
- [ ] `<TrumpPicker />` — used as-is when bidder wins
- [ ] `<PartnerPicker />` — used as-is, with "Hide cards I hold" toggle now meaningful (bidder's own hand)
- [ ] `<ScoreBoard />` — running totals across hands

### Mobile Layout
- [ ] Strict portrait, 360–414px width
- [ ] Top strip: 56px tall (state info)
- [ ] Opponents row: 80px tall (compact avatars)
- [ ] Trick area: ~150px tall (the dramatic center)
- [ ] Hand slider: ~120px tall (cards 60×84)
- [ ] Action button: ~64px tall, pinned bottom with safe-area inset
- [ ] Total ~470–500px content; rest is safe area + spacing

## Tests Required

### Component
- [ ] `<HandSlider />`: scroll-snaps; tap selects; selected card lifts; "always confirm" toggle behavior
- [ ] `<TrickArea />`: renders 0–N cards; empty state OK
- [ ] `<OpponentsRow />`: renders 5 (250) or 7 (500); status badges correct
- [ ] `<PartnerRevealToast />`: appears for 2s when triggered; respects reduced motion

### E2E (Multi-context, Mobile)
- [ ] 6 phones play a full hand of 250: deal → bid → declare → partners → 8 tricks → scoreboard updates
- [ ] 8 phones play a full hand of 500 with voluntary reveal: bidder calls → some partners hold back → reveal animation triggers when they're forced to play the called card
- [ ] Out-of-turn tap: card doesn't play; subtle "not your turn" toast
- [ ] Disconnect: banner appears; reconnect: state restored within 60s grace

## Done When

- [ ] All quality gates pass
- [ ] 6 friends can play a full hand of 250 from 6 different phones
- [ ] 8 friends can play a full hand of 500 with the voluntary-reveal mechanic working correctly
- [ ] Lighthouse Accessibility ≥ 95 on online pages
- [ ] CLAUDE.md updated; E09 marked Complete
