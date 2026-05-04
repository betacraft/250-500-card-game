import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import {
  roomCreateRequestSchema,
  roomJoinRequestSchema,
  seatClaimRequestSchema,
  type ErrorEvent,
} from '@250-500/shared';
import { loadConfig } from './config';
import { logger } from './logger';
import { RoomStore } from './rooms/room-store';

export function createApp(): { app: express.Express; httpServer: ReturnType<typeof createServer>; io: SocketIOServer; store: RoomStore } {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });
  const store = new RoomStore();

  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeRooms: store.size(),
    });
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'socket connected');

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
      socket.data.roomCode = room.code;
      logger.info({ socketId: socket.id, code: room.code, gameType: room.gameType }, 'room created');
      socket.emit('room:created', { room: store.toPublicState(room), yourSeat: 1 });
    });

    socket.on('room:join', (rawPayload: unknown) => {
      const result = roomJoinRequestSchema.safeParse(rawPayload);
      if (!result.success) {
        return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid room:join payload' });
      }
      const room = store.getRoom(result.data.code);
      if (!room) return sendError({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      void socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.emit('room:joined', { room: store.toPublicState(room) });
      broadcastRoom(room.code);
    });

    socket.on('room:claim-seat', (rawPayload: unknown) => {
      const result = seatClaimRequestSchema.safeParse(rawPayload);
      if (!result.success) {
        return sendError({ code: 'INVALID_PAYLOAD', message: 'Invalid seat-claim payload' });
      }
      const code = (socket.data.roomCode as string | undefined) ?? store.findRoomBySocket(socket.id)?.code;
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
      socket.emit('room:seat-claimed', { yourSeat: add.player.seat });
      broadcastRoom(room.code);
    });

    socket.on('room:leave', () => {
      const room = store.findRoomBySocket(socket.id);
      if (!room) return;
      void socket.leave(room.code);
      const updated = store.removePlayer(room.code, socket.id);
      if (updated) broadcastRoom(updated.code);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const { httpServer } = createApp();
  httpServer.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'server listening');
  });
}
