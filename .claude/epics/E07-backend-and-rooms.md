# E07 — Backend + Rooms (Phase 2 begins)

**Phase:** 2
**Status:** Complete
**Owner:** tech-lead
**Depends on:** E06
**Estimated sessions:** 2–3

## Overview

Phase 2 begins. This epic does two things:
1. **Migrate to monorepo** with `packages/{shared, api, web}`. Existing `src/` becomes `packages/web/src/`. Pure-logic modules extract into `packages/shared/` for reuse on both client and server.
2. **Build the backend**: Node + Express + Socket.io with room management — host a room, join with code, claim a seat.

## What to Build

### Monorepo Migration
- [x] Add `package.json workspaces` listing `packages/*`
- [x] Move existing `src/` to `packages/web/src/`
- [x] Move existing `package.json`, `vite.config.ts`, etc. to `packages/web/` (with `name: "@250-500/web"`)
- [x] Create `packages/shared/` with new `package.json` (`name: "@250-500/shared"`)
  - Move `src/lib/games/*` → `packages/shared/src/games/`
  - Move `src/lib/cards/*` → `packages/shared/src/cards/`
  - Keep scoring engine in `packages/shared/src/scoring/` (used by server in E08)
- [x] Create `packages/api/` with `package.json` (`name: "@250-500/api"`)
- [x] Root `package.json` with workspace scripts (`npm run -r typecheck`, etc.)
- [x] Update all imports in web to `@250-500/shared`
- [x] Verify `npm run typecheck && npm run test` passes after migration (no behavior change)

### Backend Bootstrap (`packages/api/`)
- [x] Express + Socket.io server in `src/server.ts`
- [x] Pino logging in `src/logger.ts`
- [x] Zod-validated env in `src/config.ts` (PORT, NODE_ENV, LOG_LEVEL)
- [x] `GET /health` route returning `{ status: 'ok', timestamp }`
- [x] Server starts on port 3001 (configurable)

### Room Management
- [x] `src/rooms/room-codes.ts`: 6-char base32 generator with collision check
- [x] `src/rooms/room-store.ts`: in-memory `Map<roomCode, RoomState>`
- [x] `src/rooms/room-service.ts`: `createRoom(gameType)`, `joinRoom`, `leaveRoom`, `claimSeat`
- [x] Disconnect handler: 60s grace timer, then remove player; cancel on reconnect
- [x] Socket.io handlers in `src/sockets/room-handlers.ts`
- [x] Broadcast helper: `broadcastRoomState(code)`

### Shared Event Schemas (`packages/shared/src/events.ts`)
- [x] Zod schemas for: `room:create`, `room:join`, `room:leave`, `room:claim-seat`, `room:state-updated`, `error`
- [x] Type-export via `z.infer`

### Frontend Wiring (Lobby Only)
- [x] Update `HomePage.tsx`: "Play online" button now enabled
- [x] New page `OnlineHomePage.tsx`: "Host a game" + "Join a game" + game-type picker
- [x] New page `OnlineLobbyPage.tsx`: shows room code (with copy button), seat picker for 6 (250) or 8 (500), other players' names; "Start hand" button visible to host once all seats filled
- [x] `connection-store` (Zustand): socket instance + status
- [x] `online-room-store` (Zustand): room state subscription
- [x] `lib/socket-client.ts`: typed wrappers around emit + listeners
- [x] Vite dev proxy: `/socket.io/*` → `http://localhost:3001`

## Tests Required

### Unit
- [x] Room code generator: 10000 calls, all unique, all 6-char base32
- [x] Room store: create / join / claim-seat / leave correctness
- [x] Disconnect grace: timer fires; reconnect cancels
- [x] All Zod event schemas: valid + invalid

### Integration
- [x] Full room flow: client A creates → client B joins → both see updated player list
- [x] 6-player flow (250) and 8-player flow (500) lobby fills correctly
- [x] Disconnect + reconnect within grace: seat retained
- [x] Wrong room code: `error` event with `ROOM_NOT_FOUND`

### E2E (Mobile, multi-context)
- [x] Two browser contexts: host creates room, second context joins via code, both see player list update
- [x] Copy-room-code button works

## Done When

- [x] All quality gates pass at workspace root
- [x] Monorepo migration complete; Phase 1 functionality unaffected
- [x] 6 (or 8) browsers can connect, claim seats, see each other
- [x] CLAUDE.md updated; E07 marked Complete
