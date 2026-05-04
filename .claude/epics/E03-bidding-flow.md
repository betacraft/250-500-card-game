# E03 — Bidding Flow

**Phase:** 1
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E02
**Estimated sessions:** 1–2

## Overview

Build the bidding round UI: round-robin through players, each player can bid (above current high) or pass, auction closes when N-1 players have passed, winner is recorded.

## What to Build

### Bidding State Machine (`src/lib/games/bidding.ts`)
- [x] Pure function `nextBidder(state, lastAction)` returns the next eligible player
- [x] Pure function `validateBid(state, playerId, amount)` returns ok/error
- [x] Pure function `isAuctionClosed(state)` returns true when N-1 players have passed
- [x] Pure function `getAuctionWinner(state)` returns the bidder + amount
- [x] Constants: `MIN_BID_250 = 160`, `MIN_BID_500 = 300`, `BID_INCREMENT = 5`

### Bidding Flow Component (`src/components/shared/BiddingFlow.tsx`)
- [x] Top: "Hand X" header with target score badge
- [x] Middle: bidding history (compact list — Priya 165, Mayuresh 170, Ankit pass, ...)
- [x] Action area (bottom): currently-bidding player's name + amount picker (slider or +/− with live value) + "Bid" and "Pass" buttons
- [x] When auction closes: shows winner + bid; CTA "Continue" → goes to E04 trump/partner picker
- [x] Edit affordance: tap a previous bid in history to edit (reverts auction state)

### Mobile Patterns
- [x] Action area pinned to bottom with `safe-area-inset-bottom`
- [x] Amount picker has +5/−5 chips and a typed input (large keypad on mobile)
- [x] Pass button is secondary (outline), Bid button primary (solid)
- [x] Auction history scrollable if long

## Tests Required

### Unit
- [x] `nextBidder` correct in 6 and 8 player setups
- [x] `validateBid`: below current high → error; equal → error; not multiple of 5 → error; above max → error; valid → ok
- [x] `isAuctionClosed`: N-1 passes → closed; otherwise open
- [x] `getAuctionWinner`: returns last non-passing bidder

### Component
- [x] `<BiddingFlow />` renders current bidder
- [x] Tapping Bid with valid amount calls `recordBid`
- [x] Tapping Pass calls `recordPass`
- [x] Disabled state when amount invalid
- [x] Auction-closed state shows winner

### E2E (Mobile)
- [x] Full 250 bidding round: 6 players bid in sequence; 5 pass; winner shown
- [x] All-pass scenario handled (everyone passes immediately)

## Done When

- [x] All quality gates pass
- [x] Bidding round playable end-to-end for both 250 and 500
- [x] CLAUDE.md updated; E03 marked Complete
