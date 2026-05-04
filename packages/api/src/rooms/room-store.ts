import type { GameType, RoomState } from '@250-500/shared';
import { rulesFor } from '@250-500/shared';
import { generateUniqueRoomCode } from './room-codes';

interface InternalPlayer {
  id: string;
  socketId: string;
  seat: number;
  name: string;
  connected: boolean;
  /** Timer id for the disconnect grace period; clear on reconnect. */
  disconnectTimer?: NodeJS.Timeout;
}

interface InternalRoom {
  code: string;
  gameType: GameType;
  hostSocketId: string;
  players: InternalPlayer[];
  capacity: number;
  phase: 'lobby' | 'in-game' | 'completed';
  createdAt: number;
}

export class RoomStore {
  private rooms = new Map<string, InternalRoom>();

  createRoom(gameType: GameType, hostSocketId: string): InternalRoom {
    const code = generateUniqueRoomCode(new Set(this.rooms.keys()));
    const room: InternalRoom = {
      code,
      gameType,
      hostSocketId,
      players: [],
      capacity: rulesFor(gameType).PLAYER_COUNT,
      phase: 'lobby',
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): InternalRoom | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      for (const p of room.players) {
        if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
      }
    }
    this.rooms.delete(code);
  }

  /** Find the room a socket belongs to (linear scan; rooms are few). */
  findRoomBySocket(socketId: string): InternalRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.socketId === socketId)) return room;
    }
    return undefined;
  }

  size(): number {
    return this.rooms.size;
  }

  toPublicState(room: InternalRoom): RoomState {
    return {
      code: room.code,
      gameType: room.gameType,
      hostSocketId: room.hostSocketId,
      capacity: room.capacity,
      phase: room.phase,
      players: room.players.map((p) => ({
        id: p.id,
        socketId: p.socketId,
        seat: p.seat,
        name: p.name,
        connected: p.connected,
      })),
    };
  }

  // Mutations on a room — return new player or null
  addPlayer(
    code: string,
    args: { socketId: string; seat: number; name: string },
  ): { ok: true; player: InternalPlayer } | { ok: false; reason: 'ROOM_NOT_FOUND' | 'SEAT_TAKEN' | 'ROOM_FULL' } {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, reason: 'ROOM_NOT_FOUND' };
    if (room.players.length >= room.capacity) return { ok: false, reason: 'ROOM_FULL' };
    if (room.players.some((p) => p.seat === args.seat)) return { ok: false, reason: 'SEAT_TAKEN' };
    const player: InternalPlayer = {
      id: `p${args.seat}`,
      socketId: args.socketId,
      seat: args.seat,
      name: args.name,
      connected: true,
    };
    room.players.push(player);
    return { ok: true, player };
  }

  markDisconnected(socketId: string, onExpire: (code: string, socketId: string) => void): InternalRoom | null {
    const room = this.findRoomBySocket(socketId);
    if (!room) return null;
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) return null;
    player.connected = false;
    player.disconnectTimer = setTimeout(() => {
      onExpire(room.code, socketId);
    }, 60_000);
    return room;
  }

  reconnectPlayer(socketId: string): InternalRoom | null {
    const room = this.findRoomBySocket(socketId);
    if (!room) return null;
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) return null;
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
    }
    player.connected = true;
    return room;
  }

  removePlayer(code: string, socketId: string): InternalRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const idx = room.players.findIndex((p) => p.socketId === socketId);
    if (idx === -1) return null;
    const removed = room.players[idx]!;
    if (removed.disconnectTimer) clearTimeout(removed.disconnectTimer);
    room.players.splice(idx, 1);
    if (room.players.length === 0) {
      this.deleteRoom(code);
      return null;
    }
    if (removed.socketId === room.hostSocketId && room.players[0]) {
      room.hostSocketId = room.players[0].socketId;
    }
    return room;
  }
}
