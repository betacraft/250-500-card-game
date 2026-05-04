# E02 — Game State Persistence

**Phase:** 1
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E01
**Estimated sessions:** 1

## Overview

Define the Scorekeeper game state schema (Zod), build the Zustand store with localStorage persistence, and implement the player setup flow (enter names, pick game type 250 or 500, set target score).

## What to Build

### Zod Schemas (`src/lib/games/`)
- [x] `Card`, `Suit`, `Rank` types (250 deck = 48 unique cards; 500 deck = same 48 unique cards but called twice)
- [x] `Player` schema: `id`, `name`, `seat`
- [x] `GameSettings` schema: `gameType` (`'250' | '500'`), `targetScore` (number), `players` (array of Player)
- [x] `BidEntry` schema: `bidder`, `amount`, `passes` (which players passed)
- [x] `HandRecord` schema: `handNumber`, `bidder`, `bidAmount`, `trump`, `calledCards`, `partners`, `bidMade` (boolean), `pointsCollected`, `scoreUpdate`
- [x] `ScorekeeperState` schema: `settings`, `hands` (HandRecord[]), `runningScores` (Map of playerId → number), `currentHand` (in-progress hand state)
- [x] All schemas in `src/lib/games/shared.ts` and `src/lib/games/250.ts`, `src/lib/games/500.ts`

### Zustand Store (`src/stores/scorekeeper-store.ts`)
- [x] State shape derived from Zod schema
- [x] Actions: `initGame(settings)`, `startHand()`, `recordBid(playerId, amount)`, `recordPass(playerId)`, `closeBidding(winnerId, amount)`, `declareTrump(suit)`, `callPartners(cards)`, `recordHandResult(bidMade, partners)`, `applyScores()`, `resetGame()`
- [x] `persist` middleware with key `'scorekeeper-v1'`
- [x] `onRehydrateStorage` parses with Zod; on validation failure, logs warning and resets storage
- [x] Selectors: `useCurrentHand()`, `useRunningScores()`, `useGameSettings()`, `useIsGameOver()`

### Player Setup Flow (`src/pages/ScorekeeperSetupPage.tsx`)
- [x] Game type picker: 250 (6 players) or 500 (8 players) — large radio cards
- [x] Target score input (default 1000, slider 250–2000 in increments of 50)
- [x] Player name inputs: dynamic count (6 or 8 based on game type)
- [x] "Start game" button at bottom of screen, disabled until all names filled
- [x] On start, calls `initGame(settings)` and navigates to `/scorekeeper/hand`

### Components
- [x] `<PlayerSetup />` — name input list with delete/add (cap at game-type max)
- [x] `<GameTypeCard />` — large tappable card for picking 250 vs 500
- [x] `<TargetScoreSlider />` — labeled slider with current value display

## Tests Required

### Unit
- [x] All Zod schemas: valid + invalid arrays
- [x] Zustand actions: `initGame` sets state correctly, `recordBid` updates current hand, `applyScores` updates running scores
- [x] localStorage hydration: corrupted JSON → graceful reset; valid JSON → state restored
- [x] `useIsGameOver()`: returns true when any player ≥ target

### Component
- [x] `<PlayerSetup />`: typing in inputs updates state; "Start game" disabled until all valid
- [x] `<GameTypeCard />`: tapping selects; selected has visible state
- [x] `<TargetScoreSlider />`: dragging updates value display

### E2E (Mobile)
- [x] Setup flow: pick 250, enter 6 names, set target 500, start → lands on hand page
- [x] State persists across page reload

## Done When

- [x] All quality gates pass
- [x] Player setup flow works on mobile viewport
- [x] State persists in localStorage
- [x] CLAUDE.md updated; E02 marked Complete
