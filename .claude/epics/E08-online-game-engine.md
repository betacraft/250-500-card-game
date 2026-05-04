# E08 — Online Game Engine

**Phase:** 2
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E07
**Estimated sessions:** 3–4

## Overview

Build the server-side game logic for both 250 and 500: deck, deal, bidding (reusing shared logic), trump declaration, partner-call (with 500's voluntary-reveal mechanic), trick-taking, scoring (reusing shared engine). Hand privacy is paramount.

## What to Build

### Shared Package Additions (`packages/shared/`)
- [x] `cards/deck.ts`: build 250 deck (48 cards), 500 deck (96 cards)
- [x] `games/250.ts` + `games/500.ts`: complete constants (player count, cards per player, deck builder, bid floor, max, etc.)
- [x] `state.ts`: `Hand250State` and `Hand500State` schemas
- [x] Event schemas for: `game:bid`, `game:pass`, `game:declare-trump`, `game:call-partners`, `game:play-card`, `game:hand-dealt` (private), `game:state-updated` (public), `game:trick-won`, `game:hand-scored`

### Backend Game Engine (`packages/api/src/games/`)
- [x] `engine.ts`: `GameEngine` interface
- [x] `deck.ts`: Fisher-Yates shuffle with seed (deterministic in tests); deal helper
- [x] `bidding.ts`: state machine (reuses shared validation)
- [x] `trick.ts`: led suit, trump, follow-suit validation, winner determination
- [x] `partners.ts`: partner slot tracking — for both 250 (immediate reveal) and 500 (voluntary reveal with bidder-exemption + clockwise-default)
- [x] `scoring.ts`: thin wrapper around `@250-500/shared/scoring/score-hand` (the same scoring engine from Phase 1)
- [x] `250-engine.ts`: implements `GameEngine` for 6-player rules
- [x] `500-engine.ts`: implements `GameEngine` for 8-player voluntary-reveal rules
- [x] **OCP test:** writing 500-engine.ts must NOT modify 250-engine.ts

### Backend Sockets (`packages/api/src/sockets/game-handlers.ts`)
- [x] Bid handler: validates amount, current bidder, etc.
- [x] Pass handler
- [x] Trump declaration handler (only by bidder)
- [x] Partner-call handler (2 cards for 250, 3 for 500)
- [x] Card-play handler: validates turn, ownership, follow-suit; in 500 also blocks self-leading a called card; updates partner slots; emits trick-won if trick complete
- [x] Hand-end handler: applies clockwise-default for 500 unfilled slots; computes score via shared engine; emits hand-scored

### Hand Privacy Infrastructure
- [x] `lib/broadcast.ts`: `emitPublicState(io, room, state)` and `emitPrivateHand(io, socketId, hand)`
- [x] Type-level enforcement: `PublicGameState` has no `hands` field; `PrivateHand` is its own type
- [x] Code-reviewer must FAIL any PR that broadcasts hands

## Tests Required

### Unit (Extensive)
- [x] Deck: 48 cards (250), 96 cards (500), no 2s, correct distribution
- [x] Shuffle deterministic with seed
- [x] Card values + total = 250 / 500
- [x] Trick winner: trump beats non-trump; highest of led suit; first-played wins ties
- [x] Bidding: floor, increment, max enforced; pass closes player
- [x] **500 partner mechanics (priority):**
  - First non-bidder play of a called card fills the slot
  - Bidder play of a called card does NOT consume the slot
  - Already-partner play of a second called card consumes the slot WITHOUT adding partner
  - Cannot self-lead called card (rejected)
  - Clockwise-default at hand-end skips bidder
  - Both copies of called card with bidder → slot stays empty permanently
- [x] Scoring (uses shared engine from Phase 1, just verify integration)

### Integration
- [x] Full hand of 250: 6 sockets, deal, bid, declare, partners, 8 tricks, score
- [x] Full hand of 500: 8 sockets, deal, bid, declare, partners (with voluntary reveal), 12 tricks, score
- [x] Hand-privacy assertion: capture all events to client A; assert no other player's hand appears
- [x] Out-of-turn play rejected
- [x] Self-lead of called card (500) rejected
- [x] Reconnection mid-hand: state restored

## Done When

- [x] All quality gates pass
- [x] One full hand of 250 and one full hand of 500 complete via integration tests
- [x] Hand-privacy audit passes
- [x] OCP test passes (500 didn't modify 250)
- [x] CLAUDE.md updated; E08 marked Complete
