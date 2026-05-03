# E04 — Trump + Partner Picker

**Phase:** 1
**Status:** Not Started
**Owner:** tech-lead
**Depends on:** E03
**Estimated sessions:** 1

## Overview

After the bidding winner is determined, the bidder declares trump suit and calls 2 (250) or 3 (500) partner cards. This is a full-screen flow following the design from MOBILE-DESIGN-LANGUAGE.md.

## What to Build

### Trump Picker Component (`src/components/shared/TrumpPicker.tsx`)
- [ ] Four large suit buttons: spades, hearts, diamonds, clubs
- [ ] Tap to select; selected highlighted with gold ring (per design language)
- [ ] Continue button at bottom enabled once a suit is selected

### Partner Picker Component (`src/components/shared/PartnerPicker.tsx`)
- [ ] 4 suit rows × 12 rank columns grid (3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A)
- [ ] Each cell shows the rank in the suit's color (red for hearts/diamonds, black for spades/clubs)
- [ ] Tap to toggle selection; selected card has gold highlight
- [ ] Counter at bottom: "X / 2 selected" (250) or "X / 3 selected" (500)
- [ ] "Continue" button enabled when correct count is selected
- [ ] Mobile: cells sized for tap (~28×40px on 360px-wide screen with appropriate padding)
- [ ] Optional: "Hide cards I hold" toggle (Phase 2 only — not relevant in scorekeeper since players have their own physical cards)

### Combined Declaration Flow (`src/pages/ScorekeeperHandPage.tsx` continuation)
- [ ] After bidding closes, navigate to declaration view (still on same page; replace bidding UI)
- [ ] Step 1: Trump picker
- [ ] Step 2: Partner picker
- [ ] Step 3: Confirmation summary card showing trump + 2/3 called cards + "Confirm declaration" button
- [ ] On confirm, store declaration in current hand state and navigate to E05 result entry

### Visual Polish
- [ ] Suit SVG icons defined in `src/lib/cards/suit-icons.tsx` — exports `<SuitIcon suit={...} size={16} />`
- [ ] Card cells have visible focus rings for keyboard nav
- [ ] Color contrast ≥ 4.5:1 verified on red cells

## Tests Required

### Unit
- [ ] `validateDeclaration(trump, calledCards, gameType)`: 250 needs 2 unique cards, 500 needs 3; trump must be one of 4 suits

### Component
- [ ] `<TrumpPicker />`: tap selects; only one selected at a time; Continue disabled until selected
- [ ] `<PartnerPicker />`: tap toggles; Continue disabled until correct count; selected count updates
- [ ] Combined flow: complete trump + partner → confirmation visible → confirm dispatches action

### E2E (Mobile)
- [ ] Bidder selects trump and 2 partner cards in 250; confirms; state updated
- [ ] Bidder selects trump and 3 partner cards in 500; confirms; state updated

## Done When

- [ ] All quality gates pass
- [ ] Declaration flow tested on iPhone SE width (375px); cells tappable without overlap
- [ ] CLAUDE.md updated; E04 marked Complete
