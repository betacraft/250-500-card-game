# E05 — Hand Result Entry + Scoring Engine + Multi-Hand Games

**Phase:** 1
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E04
**Estimated sessions:** 2

## Overview

The big epic. Three pieces:
1. The scoring engine (pure function implementing RULES.md exactly)
2. The hand result entry UI (made/failed + which partners came out)
3. Multi-hand game flow with running totals, target score, and game-over state

## What to Build

### Scoring Engine (`src/lib/scoring/score-hand.ts`)
- [x] `scoreHand(input: HandInput): HandScore` pure function
- [x] Input: gameType, bidder, bidAmount, partners (array of playerIds), bidMade (boolean)
- [x] Output: per-player score deltas
- [x] Formula:
  - Bid made: bidder gets +bid + bonus (100 for 250, 200 for 500); each partner gets +bid; opponents 0.
  - Bid failed: bidder gets −bid − bonus; each partner gets −bid; opponents 0.
- [x] Edge case: empty partner list (500 only — both copies of a called card with bidder) → no partners scored, only bidder scored.
- [x] Co-located unit tests in `score-hand.test.ts` with exhaustive table of bid/result/partner combinations.

### Hand Result Entry (`src/components/shared/HandResultEntry.tsx`)
- [x] Top card: bid summary (bidder name, amount, trump, called cards)
- [x] Question 1: "Did the bidder team make X?" → big "Made it" (success-green) and "Failed" (gray) buttons
- [x] Question 2: "Who came out as partners?" → pill row of all non-bidder players; tap to toggle (gold = revealed partner)
- [x] Score preview card (live-updates as toggles change): shows each player's delta for this hand
- [x] "Apply scores · next hand" button at bottom

### Scoreboard (`src/components/shared/ScoreBoard.tsx`)
- [x] Vertical list of all players with running totals
- [x] Highlight any player ≥ target score (gold halo, "Winner!" label)
- [x] Sortable: by seat order (default) or by score (highest first)

### History Page (`src/pages/ScorekeeperHistoryPage.tsx`)
- [x] Card per completed hand: hand number, bidder, bid, made/failed, score deltas
- [x] Tap to expand for full breakdown
- [x] Long-press → delete (with confirm bottom sheet) — for fixing mistakes

### Game-Over Flow
- [x] When `useIsGameOver()` returns true after applying scores, show full-screen game-over overlay
- [x] Winner(s) celebrated; final standings; "Play again" (resets) and "End game" (clears state) buttons

### Multi-Hand Flow
- [x] After "Apply scores", current hand is appended to `hands[]` history
- [x] If game over, show overlay
- [x] Otherwise, reset current hand state and return to bidding flow for next hand
- [x] Dealer rotation: clockwise from initial dealer; bidder of first bid in new hand starts left of dealer

## Tests Required

### Unit (Critical — Scoring)
- [x] Made bid 175 (250): bidder +275, each of 2 partners +175, opponents 0
- [x] Failed bid 175 (250): bidder −275, each of 2 partners −175, opponents 0
- [x] Made bid 350 (500): bidder +550, each of 3 partners +350, opponents 0
- [x] Made bid 350 (500), only 2 partners revealed: bidder +550, 2 partners +350, others 0 (one slot empty)
- [x] Bid 250 made (250 max): bidder +350
- [x] Negative running totals handled correctly across multiple failed bids

### Component
- [x] Hand result entry: toggling partner pills updates score preview live
- [x] Made/Failed mutually exclusive
- [x] Apply button disabled until both made/failed answered AND partners selected (≥0; can be 0 if all defaulted)
- [x] Game-over overlay appears at correct threshold

### E2E (Mobile)
- [x] Full game: 3 hands, target 200, last hand wins for one player → game-over visible
- [x] Score history page shows all 3 hands
- [x] Long-press on a hand → delete confirmation

## Done When

- [x] All quality gates pass
- [x] Scoring engine test coverage near 100% (it's the core of the product)
- [x] Multi-hand games to target work end-to-end
- [x] CLAUDE.md updated; E05 marked Complete
