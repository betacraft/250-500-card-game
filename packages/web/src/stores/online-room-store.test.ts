import { describe, it, expect, beforeEach } from 'vitest';
import { useOnlineRoomStore } from './online-room-store';

describe('online-room-store', () => {
  beforeEach(() => {
    useOnlineRoomStore.getState().clear();
  });

  it('starts with no room', () => {
    expect(useOnlineRoomStore.getState().room).toBeNull();
    expect(useOnlineRoomStore.getState().yourSeat).toBeNull();
  });

  it('setRoom stores the room', () => {
    const room = {
      code: 'ABCDEF',
      gameType: '250' as const,
      hostSocketId: 's1',
      capacity: 6,
      phase: 'lobby' as const,
      players: [],
    };
    useOnlineRoomStore.getState().setRoom(room);
    expect(useOnlineRoomStore.getState().room).toEqual(room);
  });

  it('setSeat stores the seat', () => {
    useOnlineRoomStore.getState().setSeat(3);
    expect(useOnlineRoomStore.getState().yourSeat).toBe(3);
  });

  it('clear resets state', () => {
    useOnlineRoomStore.getState().setSeat(2);
    useOnlineRoomStore.getState().clear();
    expect(useOnlineRoomStore.getState().yourSeat).toBeNull();
  });
});
