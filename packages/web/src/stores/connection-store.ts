import { create } from 'zustand';
import { type Socket, io as ioClient } from 'socket.io-client';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface ConnectionState {
  socket: Socket | null;
  status: ConnectionStatus;
  connect: (url: string) => void;
  disconnect: () => void;
}

/** Single Socket.io connection for the online mode. */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  socket: null,
  status: 'idle',
  connect: (url) => {
    if (get().socket) return;
    set({ status: 'connecting' });
    const socket = ioClient(url, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('connect', () => set({ status: 'connected' }));
    socket.on('disconnect', () => set({ status: 'disconnected' }));
    socket.on('connect_error', () => set({ status: 'error' }));
    set({ socket });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, status: 'idle' });
    }
  },
}));
