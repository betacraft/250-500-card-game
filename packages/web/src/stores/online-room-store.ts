import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RoomState } from '@250-500/shared';

interface OnlineRoomState {
  room: RoomState | null;
  yourSeat: number | null;
  /** Stable rejoin token issued by server at seat-claim; lets us reconnect across socket disconnects. */
  rejoinToken: string | null;
  /** Room code remembered separately from `room` so we can reconnect even if room state is briefly null. */
  rememberedCode: string | null;
  setRoom: (room: RoomState) => void;
  setSeat: (seat: number) => void;
  setRejoinCredentials: (code: string, rejoinToken: string) => void;
  clear: () => void;
}

/** Online-mode room state. Persists rejoin credentials to localStorage so a reload reconnects. */
export const useOnlineRoomStore = create<OnlineRoomState>()(
  persist(
    (set) => ({
      room: null,
      yourSeat: null,
      rejoinToken: null,
      rememberedCode: null,
      setRoom: (room) => set({ room }),
      setSeat: (yourSeat) => set({ yourSeat }),
      setRejoinCredentials: (rememberedCode, rejoinToken) =>
        set({ rememberedCode, rejoinToken }),
      clear: () =>
        set({ room: null, yourSeat: null, rejoinToken: null, rememberedCode: null }),
    }),
    {
      name: 'online-room-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist credentials, not the live room state
      partialize: (s) => ({ rejoinToken: s.rejoinToken, rememberedCode: s.rememberedCode }),
    },
  ),
);
