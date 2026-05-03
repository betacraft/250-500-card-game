# E02 — Game State Persistence

**Phase:** 1
**Status:** Not Started
**Owner:** tech-lead
**Depends on:** E01
**Estimated sessions:** 1

## Overview

Define the Scorekeeper game state schema (Zod), build the Zustand store with localStorage persistence, and implement the player setup flow (enter names, pick game type 250 or 500, set target score).

## What to Build

### Zod Schemas (`src/lib/games/`)
- [ ] `Card`, `Suit`, `Rank` types (250 deck = 48 unique cards; 500 deck = same 48 unique cards but called twice)
- [ ] `Player` schema: `id`, `name`, `seat`
- [ ] `GameSettings` schema: `gameType` (`'250' | '500'`), `targetScore` (number), `players` (array of Player)
- [ ] `BidEntry` schema: `bidder`, `amount`, `passes` (which players passed)
- [ ] `HandRecord` schema: `handNumber`, `bidder`, `bidAmount`, `trump`, `calledCards`, `partners`, `bidMade` (boolean), `pointsCollected`, `scoreUpdate`
- [ ] `ScorekeeperState` schema: `settings`, `hands` (HandRecord[]), `runningScores` (Map of playerId → number), `currentHand` (in-progress hand state)
- [ ] All schemas in `src/lib/games/shared.ts` and `src/lib/games/250.ts`, `src/lib/games/500.ts`

### Zustand Store (`src/stores/scorekeeper-store.ts`)
- [ ] State shape derived from Zod schema
- [ ] Actions: `initGame(settings)`, `startHand()`, `recordBid(playerId, amount)`, `recordPass(playerId)`, `closeBidding(winnerId, amount)`, `declareTrump(suit)`, `callPartners(cards)`, `recordHandResult(bidMade, partners)`, `applyScores()`, `resetGame()`
- [ ] `persist` middleware with key `'scorekeeper-v1'`
- [ ] `onRehydrateStorage` parses with Zod; on validation failure, logs warning and resets storage
- [ ] Selectors: `useCurrentHand()`, `useRunningScores()`, `useGameSettings()`, `useIsGameOver()`

### Player Setup Flow (`src/pages/ScorekeeperSetupPage.tsx`)
- [ ] Game type picker: 250 (6 players) or 500 (8 players) — large radio cards
- [ ] Target score input (default 1000, slider 250–2000 in increments of 50)
- [ ] Player name inputs: dynamic count (6 or 8 based on game type)
- [ ] "Start game" button at bottom of screen, disabled until all names filled
- [ ] On start, calls `initGame(settings)` and navigates to `/scorekeeper/hand`

### Components
- [ ] `<PlayerSetup />` — name input list with delete/add (cap at game-type max)
- [ ] `<GameTypeCard />` — large tappable card for picking 250 vs 500
- [ ] `<TargetScoreSlider />` — labeled slider with current value display

## Tests Required

### Unit
- [ ] All Zod schemas: valid + invalid arrays
- [ ] Zustand actions: `initGame` sets state correctly, `recordBid` updates current hand, `applyScores` updates running scores
- [ ] localStorage hydration: corrupted JSON → graceful reset; valid JSON → state restored
- [ ] `useIsGameOver()`: returns true when any player ≥ target

### Component
- [ ] `<PlayerSetup />`: typing in inputs updates state; "Start game" disabled until all valid
- [ ] `<GameTypeCard />`: tapping selects; selected has visible state
- [ ] `<TargetScoreSlider />`: dragging updates value display

### E2E (Mobile)
- [ ] Setup flow: pick 250, enter 6 names, set target 500, start → lands on hand page
- [ ] State persists across page reload

## Done When

- [ ] All quality gates pass
- [ ] Player setup flow works on mobile viewport
- [ ] State persists in localStorage
- [ ] CLAUDE.md updated; E02 marked Complete
