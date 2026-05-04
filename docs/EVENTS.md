# Socket.io Event Catalog

This is the canonical wire-protocol reference between the React client (`packages/web`) and the Node + Socket.io server (`packages/api`). The Zod schemas for every payload live in `packages/shared/src/events/` and are the single source of truth — both sides parse with the same schema before processing.

## Conventions

- Event names use **kebab-case** with a domain prefix: `room:*` or `game:*`.
- Every payload is validated with Zod on receipt; invalid payloads are silently dropped on the server (with a `pino.warn` log) and surfaced as a generic error toast on the client.
- **Hand privacy:** `game:state-updated` (broadcast to all room members) NEVER contains any player's hand. Private hands are emitted only to the owning socket via `game:hand-dealt`.
- All client → server events go through Socket.io's middleware which enforces a per-socket rate limit of 10 events/second.

---

## Room lifecycle

### `room:create` (client → server)

Schema: `roomCreateRequestSchema`
```ts
{ gameType: '250' | '500', hostName: string }  // hostName: 1-40 chars
```

**Effects:** Creates a new room with a fresh 6-character code. The host is auto-claimed into seat 1. A stable `rejoinToken` is issued (24-character base62) for reconnection.

**Server emits:** `room:created` to the calling socket; `room:state-updated` broadcast.

---

### `room:created` (server → client, calling socket only)

Schema: `roomCreatedSchema` (loosely; extended with token + code)
```ts
{
  room: RoomState,
  yourSeat: number,
  rejoinToken: string,
  code: string,
}
```

**Client must:** persist `rejoinToken` and `code` in `online-room-store` (which writes to `localStorage` so a page reload preserves them).

---

### `room:join` (client → server)

Schema: `roomJoinRequestSchema`
```ts
{ code: string }  // exactly 6 chars
```

**Server emits:** `room:joined` to the caller; `room:state-updated` broadcast.

**Errors:** `ROOM_NOT_FOUND` if the code doesn't match a live room.

---

### `room:joined` (server → client, calling socket only)

```ts
{ room: RoomState }
```

The caller has joined the Socket.io namespace; they have NOT yet claimed a seat.

---

### `room:claim-seat` (client → server)

Schema: `seatClaimRequestSchema`
```ts
{ seat: number, name: string }  // name: 1-40 chars
```

**Server emits:** `room:seat-claimed` to the caller (with `rejoinToken`); `room:state-updated` broadcast.

**Errors:** `ROOM_FULL`, `SEAT_TAKEN`, `INVALID_PAYLOAD`.

---

### `room:seat-claimed` (server → client, calling socket only)

```ts
{ yourSeat: number, rejoinToken: string, code: string }
```

**Client must:** persist `rejoinToken` and `code` (same as `room:created`).

---

### `room:reconnect` (client → server)

Schema: `roomReconnectRequestSchema`
```ts
{ code: string, rejoinToken: string }
```

**Effects:** Re-links the new socket to the previous seat. Clears the 60s grace timer. If a hand is in progress, server immediately re-emits the player's private hand via `game:hand-dealt`.

**Server emits:** `room:reconnected` to the caller; `room:state-updated` broadcast.

**Errors:** `ROOM_NOT_FOUND`, `TOKEN_INVALID`.

---

### `room:reconnected` (server → client, calling socket only)

```ts
{ room: RoomState, yourSeat: number, rejoinToken: string }
```

Note: server may rotate `rejoinToken` on reconnect (currently does not — reuse safe within session).

---

### `room:leave` (client → server)

No payload. Removes the player; if they were the host, host-promotion runs to the next remaining player. Empty rooms are deleted.

**Server emits:** `room:state-updated` broadcast.

---

### `room:state-updated` (server → all sockets in room)

Schema: `roomStateSchema`
```ts
{
  code: string,
  gameType: '250' | '500',
  hostSocketId: string,
  capacity: number,
  phase: 'lobby' | 'in-game' | 'completed',
  players: Array<{ id, socketId, seat, name, connected }>,
}
```

Sent on every meaningful change to the room (player join/leave/seat-claim/reconnect/disconnect).

---

### `error` (server → client, calling socket only)

Schema: `errorEventSchema`
```ts
{
  code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'SEAT_TAKEN' | 'INVALID_PAYLOAD'
      | 'TOKEN_INVALID' | 'NOT_HOST' | 'INVALID_MOVE' | 'NOT_YOUR_TURN'
      | 'INTERNAL_ERROR',
  message: string,
}
```

Generic error envelope. The client typically surfaces `message` as a toast.

---

## Game lifecycle

### `game:start-hand` (client → server)

Schema: `gameStartHandRequestSchema`
```ts
{}
```

**Permission:** Only the host (`socketId === room.hostSocketId`). Requires the room to be at full capacity.

**Effects:** Server constructs a fresh deck per `gameType`, shuffles, deals, captures `holdersByCardId` for the clockwise-default rule, transitions phase to `bidding`.

**Server emits:**
- `game:hand-dealt` to each socket privately (only that player's hand).
- `game:state-updated` broadcast (no hands; just turn order, bidder, etc.).

**Errors:** `NOT_HOST`, `INVALID_MOVE` (room not full).

---

### `game:hand-dealt` (server → one socket only)

Schema: `handDealtPrivateSchema`
```ts
{ hand: Card[] }
```

**Privacy:** This is the ONLY event that ever contains card-level information about a specific player's hand. It is emitted via `io.to(socketId).emit(...)` — never broadcast.

---

### `game:bid` (client → server)

Schema: `gameBidRequestSchema`
```ts
{ amount: number }  // integer, multiple of 5
```

**Validated:** Player must be the current bidder, amount above current high, multiple of `BID_INCREMENT` (5), within `[MIN_BID, MAX_BID]` (160-250 for 250; 300-500 for 500), player hasn't already passed.

**Effects:** Records bid; if N-1 players have passed, auction closes and phase transitions to `declaring`.

**Server emits:** `game:state-updated` broadcast.

**Errors:** `INVALID_MOVE` (with diagnostic message), `NOT_YOUR_TURN`.

---

### `game:pass` (client → server)

Schema: `gamePassRequestSchema`
```ts
{}
```

Same validation rules as `game:bid` minus amount checks.

---

### `game:declare` (client → server)

Schema: `gameDeclareRequestSchema`
```ts
{
  trump: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  calledCards: Card[],  // 1-3 cards (2 for 250, 3 for 500)
}
```

**Permission:** Only the bidder. Only during phase `declaring`.

**Effects:** Sets trump, initializes partner slots (one per called card), transitions phase to `playing`. Bidder is now the first to lead.

**Server emits:** `game:state-updated` broadcast.

**Errors:** `NOT_BIDDER`, `INVALID_CALLED` (wrong card count), `INVALID_PAYLOAD`.

---

### `game:play-card` (client → server)

Schema: `gamePlayCardRequestSchema`
```ts
{ card: Card }
```

**Validated:**
- Player must be the current `toPlayerId`.
- Card must be in their server-side hand.
- Must follow led suit if able.
- (500 only) Cannot self-lead a called card unless on the last trick.

**Effects:** Plays the card; updates partner slots if applicable (per-bidder-exempt rule). If trick complete, determines winner and starts next trick. If hand complete, runs `finalizeHand` (clockwise-default + scoring) and updates running scores.

**Server emits:**
- `game:state-updated` broadcast.
- `game:hand-scored` broadcast (if hand ended).

**Errors:** `INVALID_MOVE` (variant message), `NOT_YOUR_TURN`, `CANNOT_SELF_REVEAL` (500-specific).

---

### `game:state-updated` (server → all sockets in room)

Schema: `publicHandStateSchema`
```ts
{
  phase: 'bidding' | 'declaring' | 'playing' | 'scored',
  handNumber: number,
  bidHistory: BidEntry[],
  bidder: string | null,
  bidAmount: number | null,
  trump: Suit | null,
  calledCards: Card[],
  partners: string[],            // revealed partner ids only
  currentTrick: PlayedCard[],
  toPlayerId: string | null,
  trickCount: number,
  cardsPerPlayer: Record<string, number>,  // counts only — never the cards themselves
  runningScores: Record<string, number>,
}
```

**Privacy guarantee:** This schema does NOT include any `hands` field. The server's `publicHandState` builder reads from the engine state and emits only counts. Verified by `server.test.ts > hand-privacy`.

---

### `game:hand-scored` (server → all sockets in room)

Schema: `handScoredSchema`
```ts
{
  bidMade: boolean,
  pointsCollected: number,
  partners: string[],
  scoreDeltas: Record<string, number>,
  runningScores: Record<string, number>,
}
```

Sent once at hand-end. Drives the post-hand summary UI.

---

## Reserved for Phase 3

These events do not exist yet but the namespace is reserved:

- `game:trick-won` — explicit per-trick announcement (currently inferred from `game:state-updated`).
- `game:partner-revealed` — explicit reveal animation trigger (currently inferred).
- `chat:*` — in-game chat.

---

## Testing

The full event catalog is exercised by:
- `packages/shared/src/events/types.test.ts` — schema valid+invalid pairs
- `packages/shared/src/events/game.test.ts` — game-event schema tests
- `packages/api/src/server.test.ts` — integration tests for every handler with real `socket.io-client` round-trips
- `packages/api/src/games/engine.test.ts` and `room-game.test.ts` — engine logic exercised by these events

If you add a new event:
1. Add the Zod schema to `packages/shared/src/events/`
2. Add a valid+invalid test to the matching test file
3. Add a server handler that parses with `safeParse` and rejects on failure
4. Add an integration test in `packages/api/src/server.test.ts`
5. Document it here.
