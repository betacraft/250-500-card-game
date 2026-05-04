import { create } from 'zustand';
import type { RoomState } from '@250-500/shared';

interface OnlineRoomState {
  room: RoomState | null;
  yourSeat: number | null;
  setRoom: (room: RoomState) => void;
  setSeat: (seat: number) => void;
  clear: () => void;
}

export const useOnlineRoomStore = create<OnlineRoomState>((set) => ({
  room: null,
  yourSeat: null,
  setRoom: (room) => set({ room }),
  setSeat: (yourSeat) => set({ yourSeat }),
  clear: () => set({ room: null, yourSeat: null }),
}));
