import express from 'express';

interface SocketData {
  roomCode?: string;
}
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import {
  roomCreateRequestSchema,
  roomJoinRequestSchema,
  seatClaimRequestSchema,
  roomReconnectRequestSchema,
  type ErrorEvent,
} from '@250-500/shared';
import { loadConfig } from './config';
import { logger } from './logger';
import { installGracefulShutdown } from './lifecycle';
import { checkRateLimit, clearRateLimit } from './middleware/rate-limit';
import { RoomStore } from './rooms/room-store';
import {
  initRoomGame,
  beginHand,
  recordBid as gameRecordBid,
  recordPass as gameRecordPass,
  declare as gameDeclare,
  play as gamePlay,
  type RoomGameState,
} from './games/room-game';
import {
  gameBidRequestSchema,
  gamePassRequestSchema,
  gameDeclareRequestSchema,
  gamePlayCardRequestSchema,
  gameStartHandRequestSchema,
} from '@250-500/shared';

/** Build the Express + Socket.io app. Returns the express app, http server, io instance, and room store. */
export function createApp(): { app: express.Express; httpServer: ReturnType<typeof createServer>; io: SocketIOServer; store: RoomStore } {
  const app = express();
  const httpServer = createServer(app);
  const config = loadConfig();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(',').map((s) => s.trim()) },
    transports: ['websocket', 'polling'],
  });
  const store = new RoomStore();

  app.use(express.json({ limit: '10kb' }));

  const games = new Map<string, RoomGameState>();

  function publicHandState(code: string) {
    const game = games.get(code);
    if (!game?.hand) return null;
    const cardsPerPlayer: Record<string, number> = {};
    for (const id of game.seatOrder) cardsPerPlayer[id] = game.hand.hands[id]?.length ?? 0;
    return {
      phase: game.phase === 'lobby' ? 'bidding' : game.phase,
      handNumber: game.handsPlayed + 1,
      bidHistory: game.bidHistory,
      bidder: game.hand.bidder,
      bidAmount: game.hand.bidAmount,
      trump: game.hand.trump,
      calledCards: game.hand.calledCards,
      partners: Array.from(game.hand.partners),
      currentTrick: game.hand.currentTrick,
      toPlayerId: game.hand.toPlayerId,
      trickCount: game.hand.trickCount,
      cardsPerPlayer,
      runningScores: game.runningScores,
    };
  }

  function broadcastGame(code: string, io_: typeof io) {
    const state = publicHandState(code);
    if (state) io_.to(code).emit('game:state-updated', state);
  }

  function emitPrivateHands(code: string, io_: typeof io) {
    const room = store.getRoom(code);
    const game = games.get(code);
    if (!room || !game?.hand) return;
    for (const player of room.players) {
      const hand = game.hand.hands[player.id] ?? [];
      io_.to(player.socketId).emit('game:hand-dealt', { hand });
    }
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeRooms: store.size(),
    });
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'socket connected');
    socket.use(([_event], next) => {
      if (!checkRateLimit(socket.id)) {
        // Silently drop the event rather than tearing down the socket.
        return;
      }
      next();
    });
    socket.on('disconnect', () => clearRateLimit(socket.id));

    const sendError = (e: ErrorEvent) => socket.emit('error', e);
    const broadcastRoom = (code: string) => {
      const room = store.getRoom(code);
      if (room) io.to(code).emit('room:state-updated', store.toPublicState(room));
    };

    socket.on('room:create', (rawPayload: unknown) => {
      const result = roomCreateRequestSchema.safeParse(rawPayload);
      if (!result.success) {
        return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid room:create payload' });
      }
      const room = store.createRoom(result.data.gameType, socket.id);
      const add = store.addPlayer(room.code, {
        socketId: socket.id,
        seat: 1,
        name: result.data.hostName,
      });
      if (!add.ok) return sendError({ code: 'INTERNAL_ERROR', message: 'Failed to add host' });
      void socket.join(room.code);
      (socket.data as SocketData).roomCode = room.code;
      logger.info({ socketId: socket.id, code: room.code, gameType: room.gameType }, 'room created');
      socket.emit('room:created', { room: store.toPublicState(room), yourSeat: 1, rejoinToken: add.player.rejoinToken, code: room.code });
    });

    socket.on('room:join', (rawPayload: unknown) => {
      const result = roomJoinRequestSchema.safeParse(rawPayload);
      if (!result.success) {
        return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid room:join payload' });
      }
      const room = store.getRoom(result.data.code);
      if (!room) return sendError({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      void socket.join(room.code);
      (socket.data as SocketData).roomCode = room.code;
      socket.emit('room:joined', { room: store.toPublicState(room) });
      broadcastRoom(room.code);
    });

    socket.on('room:claim-seat', (rawPayload: unknown) => {
      const result = seatClaimRequestSchema.safeParse(rawPayload);
      if (!result.success) {
        return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid seat-claim payload' });
      }
      const code = (socket.data as SocketData).roomCode ?? store.findRoomBySocket(socket.id)?.code;
      const room = code ? store.getRoom(code) : undefined;
      if (!room) return sendError({ code: 'ROOM_NOT_FOUND', message: 'You are not in a room' });
      const add = store.addPlayer(room.code, {
        socketId: socket.id,
        seat: result.data.seat,
        name: result.data.name,
      });
      if (!add.ok) {
        return sendError({
          code: add.reason === 'SEAT_TAKEN' ? 'SEAT_TAKEN' : add.reason === 'ROOM_FULL' ? 'ROOM_FULL' : 'INVALID_MOVE',
          message: add.reason,
        });
      }
      socket.emit('room:seat-claimed', { yourSeat: add.player.seat, rejoinToken: add.player.rejoinToken, code: room.code });
      broadcastRoom(room.code);
    });

    socket.on('room:reconnect', (rawPayload: unknown) => {
      const result = roomReconnectRequestSchema.safeParse(rawPayload);
      if (!result.success) {
        return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid room:reconnect payload' });
      }
      const r = store.rejoinByToken({ code: result.data.code, rejoinToken: result.data.rejoinToken, newSocketId: socket.id });
      if (!r.ok) {
        return sendError({ code: r.reason === 'ROOM_NOT_FOUND' ? 'ROOM_NOT_FOUND' : 'TOKEN_INVALID', message: r.reason });
      }
      void socket.join(r.room.code);
      (socket.data as SocketData).roomCode = r.room.code;
      socket.emit('room:reconnected', {
        room: store.toPublicState(r.room),
        yourSeat: r.player.seat,
        rejoinToken: r.player.rejoinToken,
      });
      // Re-send private hand if game is in progress
      const game = games.get(r.room.code);
      if (game?.hand) {
        const hand = game.hand.hands[r.player.id] ?? [];
        socket.emit('game:hand-dealt', { hand });
      }
      broadcastRoom(r.room.code);
    });

    socket.on('room:leave', () => {
      const room = store.findRoomBySocket(socket.id);
      if (!room) return;
      void socket.leave(room.code);
      const updated = store.removePlayer(room.code, socket.id);
      if (updated) broadcastRoom(updated.code);
    });

    socket.on('game:start-hand', (rawPayload: unknown) => {
      const ok = gameStartHandRequestSchema.safeParse(rawPayload);
      if (!ok.success) return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid game:start-hand' });
      const room = store.getRoom((socket.data as SocketData).roomCode ?? '');
      if (!room) return sendError({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (socket.id !== room.hostSocketId) return sendError({ code: 'NOT_HOST', message: 'Only the host can start a hand' });
      if (room.players.length !== room.capacity) return sendError({ code: 'INVALID_MOVE', message: 'Need all seats filled' });
      const seatOrder = [...room.players].sort((a, b) => a.seat - b.seat).map((p) => p.id);
      let game = games.get(room.code);
      if (!game) {
        game = initRoomGame({ gameType: room.gameType, seatOrder });
        games.set(room.code, game);
      }
      games.set(room.code, beginHand(game));
      emitPrivateHands(room.code, io);
      broadcastGame(room.code, io);
    });

    socket.on('game:bid', (rawPayload: unknown) => {
      const code = (socket.data as SocketData).roomCode ?? '';
      const game = games.get(code);
      if (!game) return sendError({ code: 'INVALID_MOVE', message: 'No game in progress' });
      const room = store.getRoom(code);
      const player = room?.players.find((p) => p.socketId === socket.id);
      if (!player) return sendError({ code: 'INVALID_MOVE', message: 'Not in room' });
      const ok = gameBidRequestSchema.safeParse(rawPayload);
      if (!ok.success) return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid game:bid' });
      const result = gameRecordBid(game, player.id, ok.data.amount);
      if (!result.ok) return sendError({ code: 'INVALID_MOVE', message: result.message });
      games.set(code, result.state);
      broadcastGame(code, io);
    });

    socket.on('game:pass', (rawPayload: unknown) => {
      const code = (socket.data as SocketData).roomCode ?? '';
      const game = games.get(code);
      if (!game) return sendError({ code: 'INVALID_MOVE', message: 'No game in progress' });
      const room = store.getRoom(code);
      const player = room?.players.find((p) => p.socketId === socket.id);
      if (!player) return sendError({ code: 'INVALID_MOVE', message: 'Not in room' });
      const ok = gamePassRequestSchema.safeParse(rawPayload);
      if (!ok.success) return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid game:pass' });
      const result = gameRecordPass(game, player.id);
      if (!result.ok) return sendError({ code: 'INVALID_MOVE', message: result.message });
      games.set(code, result.state);
      broadcastGame(code, io);
    });

    socket.on('game:declare', (rawPayload: unknown) => {
      const code = (socket.data as SocketData).roomCode ?? '';
      const game = games.get(code);
      if (!game) return sendError({ code: 'INVALID_MOVE', message: 'No game in progress' });
      const room = store.getRoom(code);
      const player = room?.players.find((p) => p.socketId === socket.id);
      if (!player) return sendError({ code: 'INVALID_MOVE', message: 'Not in room' });
      const ok = gameDeclareRequestSchema.safeParse(rawPayload);
      if (!ok.success) return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid game:declare' });
      const result = gameDeclare(game, player.id, ok.data.trump, ok.data.calledCards);
      if (!result.ok) return sendError({ code: 'INVALID_MOVE', message: result.message });
      games.set(code, result.state);
      broadcastGame(code, io);
    });

    socket.on('game:play-card', (rawPayload: unknown) => {
      const code = (socket.data as SocketData).roomCode ?? '';
      const game = games.get(code);
      if (!game) return sendError({ code: 'INVALID_MOVE', message: 'No game in progress' });
      const room = store.getRoom(code);
      const player = room?.players.find((p) => p.socketId === socket.id);
      if (!player) return sendError({ code: 'INVALID_MOVE', message: 'Not in room' });
      const ok = gamePlayCardRequestSchema.safeParse(rawPayload);
      if (!ok.success) return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid game:play-card' });
      const result = gamePlay(game, player.id, ok.data.card);
      if (!result.ok) return sendError({ code: 'INVALID_MOVE', message: result.message });
      games.set(code, result.state);
      broadcastGame(code, io);
      if (result.handEnded && result.breakdown) {
        io.to(code).emit('game:hand-scored', {
          ...result.breakdown,
          runningScores: result.state.runningScores,
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'socket disconnected');
      const room = store.markDisconnected(socket.id, (code, sid) => {
        const updated = store.removePlayer(code, sid);
        logger.info({ code, socketId: sid }, 'player removed after grace expiry');
        if (updated) io.to(code).emit('room:state-updated', store.toPublicState(updated));
      });
      if (room) io.to(room.code).emit('room:state-updated', store.toPublicState(room));
    });
  });

  return { app, httpServer, io, store };
}

async function bootstrap() {
  const config = loadConfig();
  const { app, httpServer, io } = createApp();
  if (config.NODE_ENV === 'production') {
    const path = (await import('node:path')).default;
    const url = (await import('node:url')).default;
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const webDist = path.resolve(here, '../../web/dist');
    app.use(express.static(webDist));
    app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }
  installGracefulShutdown(httpServer, io);
  httpServer.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'server listening');
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void bootstrap();
}
