# E09 — Online Frontend

**Phase:** 2
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E08
**Estimated sessions:** 3

## Overview

Build the mobile UI for online gameplay. Reuses shared components from Phase 1 (BiddingFlow, TrumpPicker, PartnerPicker, ScoreBoard) and adds new online-mode components: card slider (the player's hand), trick area (cards being played), opponents row (compact strip showing the other 5/7 players).

## What to Build

### New Online-Mode Components (`packages/web/src/components/online/`)

- [x] `<HandSlider />` — horizontal snap-scroll list of own cards. Tap to select (lifts +10px, gold ring); action button at bottom shows "Play [card]"; respects "always confirm" setting.
- [x] `<TrickArea />` — center area showing cards already played to the current trick; positioned to suggest who played each (small avatar near each card); led suit indicator.
- [x] `<OpponentsRow />` — horizontal strip at top of screen showing 5 (or 7) other players: avatar, name, card count, status (turn / passed / partner / bidder).
- [x] `<TopStateStrip />` — compact 3-section strip: trump | bid | running score.
- [x] `<ConnectionStatus />` — corner indicator: connected / reconnecting / disconnected. Disabled-state propagates to action buttons.
- [x] `<PartnerRevealToast />` — celebration overlay when a non-bidder plays a called card; gold flash on revealed player + toast: "Mayuresh revealed as partner!"

### New Online Pages (`packages/web/src/pages/`)
- [x] `OnlineGamePage.tsx` — orchestrates: top strip → opponents → trick area → hand slider → action button
- [x] `OnlineGameOverPage.tsx` — final scoreboard, "Play again" / "Leave room"

### State Wiring
- [x] `online-game-store` (Zustand) — subscribes to server `game:state-updated` and private `game:hand-dealt`; holds public state + own hand
- [x] Selectors: `useMyHand()`, `useIsMyTurn()`, `useLegalCards()`, `useCurrentTrick()`
- [x] `lib/socket-client.ts` extended with game-event helpers
- [x] All inbound events parsed via Zod from `@250-500/shared`

### Reused Shared Components (Phase 1)
- [x] `<BiddingFlow />` — used as-is in lobby's bid panel
- [x] `<TrumpPicker />` — used as-is when bidder wins
- [x] `<PartnerPicker />` — used as-is, with "Hide cards I hold" toggle now meaningful (bidder's own hand)
- [x] `<ScoreBoard />` — running totals across hands

### Mobile Layout
- [x] Strict portrait, 360–414px width
- [x] Top strip: 56px tall (state info)
- [x] Opponents row: 80px tall (compact avatars)
- [x] Trick area: ~150px tall (the dramatic center)
- [x] Hand slider: ~120px tall (cards 60×84)
- [x] Action button: ~64px tall, pinned bottom with safe-area inset
- [x] Total ~470–500px content; rest is safe area + spacing

## Tests Required

### Component
- [x] `<HandSlider />`: scroll-snaps; tap selects; selected card lifts; "always confirm" toggle behavior
- [x] `<TrickArea />`: renders 0–N cards; empty state OK
- [x] `<OpponentsRow />`: renders 5 (250) or 7 (500); status badges correct
- [x] `<PartnerRevealToast />`: appears for 2s when triggered; respects reduced motion

### E2E (Multi-context, Mobile)
- [x] 6 phones play a full hand of 250: deal → bid → declare → partners → 8 tricks → scoreboard updates
- [x] 8 phones play a full hand of 500 with voluntary reveal: bidder calls → some partners hold back → reveal animation triggers when they're forced to play the called card
- [x] Out-of-turn tap: card doesn't play; subtle "not your turn" toast
- [x] Disconnect: banner appears; reconnect: state restored within 60s grace

## Done When

- [x] All quality gates pass
- [x] 6 friends can play a full hand of 250 from 6 different phones
- [x] 8 friends can play a full hand of 500 with the voluntary-reveal mechanic working correctly
- [x] Lighthouse Accessibility ≥ 95 on online pages
- [x] CLAUDE.md updated; E09 marked Complete
