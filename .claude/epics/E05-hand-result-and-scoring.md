# E05 — Hand Result Entry + Scoring Engine + Multi-Hand Games

**Phase:** 1
**Status:** Not Started
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
- [ ] `scoreHand(input: HandInput): HandScore` pure function
- [ ] Input: gameType, bidder, bidAmount, partners (array of playerIds), bidMade (boolean)
- [ ] Output: per-player score deltas
- [ ] Formula:
  - Bid made: bidder gets +bid + bonus (100 for 250, 200 for 500); each partner gets +bid; opponents 0.
  - Bid failed: bidder gets −bid − bonus; each partner gets −bid; opponents 0.
- [ ] Edge case: empty partner list (500 only — both copies of a called card with bidder) → no partners scored, only bidder scored.
- [ ] Co-located unit tests in `score-hand.test.ts` with exhaustive table of bid/result/partner combinations.

### Hand Result Entry (`src/components/shared/HandResultEntry.tsx`)
- [ ] Top card: bid summary (bidder name, amount, trump, called cards)
- [ ] Question 1: "Did the bidder team make X?" → big "Made it" (success-green) and "Failed" (gray) buttons
- [ ] Question 2: "Who came out as partners?" → pill row of all non-bidder players; tap to toggle (gold = revealed partner)
- [ ] Score preview card (live-updates as toggles change): shows each player's delta for this hand
- [ ] "Apply scores · next hand" button at bottom

### Scoreboard (`src/components/shared/ScoreBoard.tsx`)
- [ ] Vertical list of all players with running totals
- [ ] Highlight any player ≥ target score (gold halo, "Winner!" label)
- [ ] Sortable: by seat order (default) or by score (highest first)

### History Page (`src/pages/ScorekeeperHistoryPage.tsx`)
- [ ] Card per completed hand: hand number, bidder, bid, made/failed, score deltas
- [ ] Tap to expand for full breakdown
- [ ] Long-press → delete (with confirm bottom sheet) — for fixing mistakes

### Game-Over Flow
- [ ] When `useIsGameOver()` returns true after applying scores, show full-screen game-over overlay
- [ ] Winner(s) celebrated; final standings; "Play again" (resets) and "End game" (clears state) buttons

### Multi-Hand Flow
- [ ] After "Apply scores", current hand is appended to `hands[]` history
- [ ] If game over, show overlay
- [ ] Otherwise, reset current hand state and return to bidding flow for next hand
- [ ] Dealer rotation: clockwise from initial dealer; bidder of first bid in new hand starts left of dealer

## Tests Required

### Unit (Critical — Scoring)
- [ ] Made bid 175 (250): bidder +275, each of 2 partners +175, opponents 0
- [ ] Failed bid 175 (250): bidder −275, each of 2 partners −175, opponents 0
- [ ] Made bid 350 (500): bidder +550, each of 3 partners +350, opponents 0
- [ ] Made bid 350 (500), only 2 partners revealed: bidder +550, 2 partners +350, others 0 (one slot empty)
- [ ] Bid 250 made (250 max): bidder +350
- [ ] Negative running totals handled correctly across multiple failed bids

### Component
- [ ] Hand result entry: toggling partner pills updates score preview live
- [ ] Made/Failed mutually exclusive
- [ ] Apply button disabled until both made/failed answered AND partners selected (≥0; can be 0 if all defaulted)
- [ ] Game-over overlay appears at correct threshold

### E2E (Mobile)
- [ ] Full game: 3 hands, target 200, last hand wins for one player → game-over visible
- [ ] Score history page shows all 3 hands
- [ ] Long-press on a hand → delete confirmation

## Done When

- [ ] All quality gates pass
- [ ] Scoring engine test coverage near 100% (it's the core of the product)
- [ ] Multi-hand games to target work end-to-end
- [ ] CLAUDE.md updated; E05 marked Complete
