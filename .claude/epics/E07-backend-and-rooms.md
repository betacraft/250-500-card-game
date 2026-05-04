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
- [ ] Add `pnpm-workspace.yaml` listing `packages/*`
- [ ] Move existing `src/` to `packages/web/src/`
- [ ] Move existing `package.json`, `vite.config.ts`, etc. to `packages/web/` (with `name: "@250-500/web"`)
- [ ] Create `packages/shared/` with new `package.json` (`name: "@250-500/shared"`)
  - Move `src/lib/games/*` → `packages/shared/src/games/`
  - Move `src/lib/cards/*` → `packages/shared/src/cards/`
  - Keep scoring engine in `packages/shared/src/scoring/` (used by server in E08)
- [ ] Create `packages/api/` with `package.json` (`name: "@250-500/api"`)
- [ ] Root `package.json` with workspace scripts (`pnpm -r typecheck`, etc.)
- [ ] Update all imports in web to `@250-500/shared`
- [ ] Verify `pnpm typecheck && pnpm test` passes after migration (no behavior change)

### Backend Bootstrap (`packages/api/`)
- [ ] Express + Socket.io server in `src/server.ts`
- [ ] Pino logging in `src/logger.ts`
- [ ] Zod-validated env in `src/config.ts` (PORT, NODE_ENV, LOG_LEVEL)
- [ ] `GET /health` route returning `{ status: 'ok', timestamp }`
- [ ] Server starts on port 3001 (configurable)

### Room Management
- [ ] `src/rooms/room-codes.ts`: 6-char base32 generator with collision check
- [ ] `src/rooms/room-store.ts`: in-memory `Map<roomCode, RoomState>`
- [ ] `src/rooms/room-service.ts`: `createRoom(gameType)`, `joinRoom`, `leaveRoom`, `claimSeat`
- [ ] Disconnect handler: 60s grace timer, then remove player; cancel on reconnect
- [ ] Socket.io handlers in `src/sockets/room-handlers.ts`
- [ ] Broadcast helper: `broadcastRoomState(code)`

### Shared Event Schemas (`packages/shared/src/events.ts`)
- [ ] Zod schemas for: `room:create`, `room:join`, `room:leave`, `room:claim-seat`, `room:state-updated`, `error`
- [ ] Type-export via `z.infer`

### Frontend Wiring (Lobby Only)
- [ ] Update `HomePage.tsx`: "Play online" button now enabled
- [ ] New page `OnlineHomePage.tsx`: "Host a game" + "Join a game" + game-type picker
- [ ] New page `OnlineLobbyPage.tsx`: shows room code (with copy button), seat picker for 6 (250) or 8 (500), other players' names; "Start hand" button visible to host once all seats filled
- [ ] `connection-store` (Zustand): socket instance + status
- [ ] `online-room-store` (Zustand): room state subscription
- [ ] `lib/socket-client.ts`: typed wrappers around emit + listeners
- [ ] Vite dev proxy: `/socket.io/*` → `http://localhost:3001`

## Tests Required

### Unit
- [ ] Room code generator: 10000 calls, all unique, all 6-char base32
- [ ] Room store: create / join / claim-seat / leave correctness
- [ ] Disconnect grace: timer fires; reconnect cancels
- [ ] All Zod event schemas: valid + invalid

### Integration
- [ ] Full room flow: client A creates → client B joins → both see updated player list
- [ ] 6-player flow (250) and 8-player flow (500) lobby fills correctly
- [ ] Disconnect + reconnect within grace: seat retained
- [ ] Wrong room code: `error` event with `ROOM_NOT_FOUND`

### E2E (Mobile, multi-context)
- [ ] Two browser contexts: host creates room, second context joins via code, both see player list update
- [ ] Copy-room-code button works

## Done When

- [ ] All quality gates pass at workspace root
- [ ] Monorepo migration complete; Phase 1 functionality unaffected
- [ ] 6 (or 8) browsers can connect, claim seats, see each other
- [ ] CLAUDE.md updated; E07 marked Complete
