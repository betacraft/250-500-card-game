# E08 — Online Game Engine

**Phase:** 2
**Status:** Not Started
**Owner:** tech-lead
**Depends on:** E07
**Estimated sessions:** 3–4

## Overview

Build the server-side game logic for both 250 and 500: deck, deal, bidding (reusing shared logic), trump declaration, partner-call (with 500's voluntary-reveal mechanic), trick-taking, scoring (reusing shared engine). Hand privacy is paramount.

## What to Build

### Shared Package Additions (`packages/shared/`)
- [ ] `cards/deck.ts`: build 250 deck (48 cards), 500 deck (96 cards)
- [ ] `games/250.ts` + `games/500.ts`: complete constants (player count, cards per player, deck builder, bid floor, max, etc.)
- [ ] `state.ts`: `Hand250State` and `Hand500State` schemas
- [ ] Event schemas for: `game:bid`, `game:pass`, `game:declare-trump`, `game:call-partners`, `game:play-card`, `game:hand-dealt` (private), `game:state-updated` (public), `game:trick-won`, `game:hand-scored`

### Backend Game Engine (`packages/api/src/games/`)
- [ ] `engine.ts`: `GameEngine` interface
- [ ] `deck.ts`: Fisher-Yates shuffle with seed (deterministic in tests); deal helper
- [ ] `bidding.ts`: state machine (reuses shared validation)
- [ ] `trick.ts`: led suit, trump, follow-suit validation, winner determination
- [ ] `partners.ts`: partner slot tracking — for both 250 (immediate reveal) and 500 (voluntary reveal with bidder-exemption + clockwise-default)
- [ ] `scoring.ts`: thin wrapper around `@250-500/shared/scoring/score-hand` (the same scoring engine from Phase 1)
- [ ] `250-engine.ts`: implements `GameEngine` for 6-player rules
- [ ] `500-engine.ts`: implements `GameEngine` for 8-player voluntary-reveal rules
- [ ] **OCP test:** writing 500-engine.ts must NOT modify 250-engine.ts

### Backend Sockets (`packages/api/src/sockets/game-handlers.ts`)
- [ ] Bid handler: validates amount, current bidder, etc.
- [ ] Pass handler
- [ ] Trump declaration handler (only by bidder)
- [ ] Partner-call handler (2 cards for 250, 3 for 500)
- [ ] Card-play handler: validates turn, ownership, follow-suit; in 500 also blocks self-leading a called card; updates partner slots; emits trick-won if trick complete
- [ ] Hand-end handler: applies clockwise-default for 500 unfilled slots; computes score via shared engine; emits hand-scored

### Hand Privacy Infrastructure
- [ ] `lib/broadcast.ts`: `emitPublicState(io, room, state)` and `emitPrivateHand(io, socketId, hand)`
- [ ] Type-level enforcement: `PublicGameState` has no `hands` field; `PrivateHand` is its own type
- [ ] Code-reviewer must FAIL any PR that broadcasts hands

## Tests Required

### Unit (Extensive)
- [ ] Deck: 48 cards (250), 96 cards (500), no 2s, correct distribution
- [ ] Shuffle deterministic with seed
- [ ] Card values + total = 250 / 500
- [ ] Trick winner: trump beats non-trump; highest of led suit; first-played wins ties
- [ ] Bidding: floor, increment, max enforced; pass closes player
- [ ] **500 partner mechanics (priority):**
  - First non-bidder play of a called card fills the slot
  - Bidder play of a called card does NOT consume the slot
  - Already-partner play of a second called card consumes the slot WITHOUT adding partner
  - Cannot self-lead called card (rejected)
  - Clockwise-default at hand-end skips bidder
  - Both copies of called card with bidder → slot stays empty permanently
- [ ] Scoring (uses shared engine from Phase 1, just verify integration)

### Integration
- [ ] Full hand of 250: 6 sockets, deal, bid, declare, partners, 8 tricks, score
- [ ] Full hand of 500: 8 sockets, deal, bid, declare, partners (with voluntary reveal), 12 tricks, score
- [ ] Hand-privacy assertion: capture all events to client A; assert no other player's hand appears
- [ ] Out-of-turn play rejected
- [ ] Self-lead of called card (500) rejected
- [ ] Reconnection mid-hand: state restored

## Done When

- [ ] All quality gates pass
- [ ] One full hand of 250 and one full hand of 500 complete via integration tests
- [ ] Hand-privacy audit passes
- [ ] OCP test passes (500 didn't modify 250)
- [ ] CLAUDE.md updated; E08 marked Complete
