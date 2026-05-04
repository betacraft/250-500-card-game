import { describe, it, expect } from 'vitest';
import { RoomStore } from './room-store';

describe('RoomStore', () => {
  it('creates a room with a generated code and correct capacity', () => {
    const store = new RoomStore();
    const room = store.createRoom('250', 'host-socket-1');
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.capacity).toBe(6);
    expect(room.gameType).toBe('250');
    expect(room.phase).toBe('lobby');
    expect(store.size()).toBe(1);
  });

  it('500 game has capacity 8', () => {
    const store = new RoomStore();
    const room = store.createRoom('500', 'host-socket-1');
    expect(room.capacity).toBe(8);
  });

  it('addPlayer rejects taken seat', () => {
    const store = new RoomStore();
    const room = store.createRoom('250', 'host-socket-1');
    const ok = store.addPlayer(room.code, { socketId: 's1', seat: 1, name: 'A' });
    expect(ok.ok).toBe(true);
    const dup = store.addPlayer(room.code, { socketId: 's2', seat: 1, name: 'B' });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.reason).toBe('SEAT_TAKEN');
  });

  it('addPlayer rejects when room is full', () => {
    const store = new RoomStore();
    const room = store.createRoom('250', 'host-socket-1');
    for (let i = 1; i <= 6; i++) {
      store.addPlayer(room.code, { socketId: `s${i}`, seat: i, name: `P${i}` });
    }
    const overflow = store.addPlayer(room.code, { socketId: 's7', seat: 7, name: 'X' });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('ROOM_FULL');
  });

  it('addPlayer rejects unknown room', () => {
    const store = new RoomStore();
    const result = store.addPlayer('XXXXXX', { socketId: 's1', seat: 1, name: 'A' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('ROOM_NOT_FOUND');
  });

  it('toPublicState omits internal fields', () => {
    const store = new RoomStore();
    const room = store.createRoom('250', 'host-socket-1');
    store.addPlayer(room.code, { socketId: 's1', seat: 1, name: 'A' });
    const pub = store.toPublicState(room);
    expect(pub.players[0]).not.toHaveProperty('disconnectTimer');
    expect(pub.players[0]?.name).toBe('A');
  });

  it('removePlayer cleans up empty rooms', () => {
    const store = new RoomStore();
    const room = store.createRoom('250', 'host-socket-1');
    store.addPlayer(room.code, { socketId: 's1', seat: 1, name: 'A' });
    store.removePlayer(room.code, 's1');
    expect(store.size()).toBe(0);
  });

  it('findRoomBySocket finds the right room', () => {
    const store = new RoomStore();
    const r1 = store.createRoom('250', 'h1');
    store.addPlayer(r1.code, { socketId: 's1', seat: 1, name: 'A' });
    const found = store.findRoomBySocket('s1');
    expect(found?.code).toBe(r1.code);
    expect(store.findRoomBySocket('does-not-exist')).toBeUndefined();
  });
});

import { vi } from 'vitest';

describe('RoomStore disconnect grace timer', () => {
  it('markDisconnected fires onExpire after 60s if not reconnected', () => {
    vi.useFakeTimers();
    const store = new RoomStore();
    const room = store.createRoom('250', 's-host');
    store.addPlayer(room.code, { socketId: 's-host', seat: 1, name: 'Host' });
    const onExpire = vi.fn();
    store.markDisconnected('s-host', onExpire);

    // 59s — not yet
    vi.advanceTimersByTime(59_000);
    expect(onExpire).not.toHaveBeenCalled();

    // 60s — fires
    vi.advanceTimersByTime(2_000);
    expect(onExpire).toHaveBeenCalledWith(room.code, 's-host');
    vi.useRealTimers();
  });

  it('reconnectPlayer cancels the disconnect timer (no expiry call)', () => {
    vi.useFakeTimers();
    const store = new RoomStore();
    const room = store.createRoom('250', 's-host');
    store.addPlayer(room.code, { socketId: 's-host', seat: 1, name: 'Host' });
    const onExpire = vi.fn();
    store.markDisconnected('s-host', onExpire);
    store.reconnectPlayer('s-host');
    vi.advanceTimersByTime(120_000);
    expect(onExpire).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
