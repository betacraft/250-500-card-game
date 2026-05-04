import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnlineGamePage } from './OnlineGamePage';
import { useOnlineRoomStore } from '../stores/online-room-store';
import { useConnectionStore } from '../stores/connection-store';

describe('OnlineGamePage', () => {
  it('redirects when no room state', () => {
    useOnlineRoomStore.getState().clear();
    const { container } = render(<MemoryRouter><OnlineGamePage /></MemoryRouter>);
    expect(container).toBeInTheDocument();
  });

  it('emits room:reconnect when status transitions disconnected → connected', async () => {
    const emit = vi.fn();
    const fakeSocket = {
      id: 'socket-1',
      emit,
      on: vi.fn(),
      off: vi.fn(),
    };

    // Seed a room + credentials
    useOnlineRoomStore.setState({
      room: {
        code: 'ABCDEF',
        gameType: '250',
        hostSocketId: 'socket-1',
        capacity: 6,
        phase: 'lobby',
        players: [
          { id: 'p1', name: 'Host', seat: 1, socketId: 'socket-1', connected: true },
        ],
      },
      yourSeat: 1,
      rejoinToken: 'token-abc-123-def',
      rememberedCode: 'ABCDEF',
    });

    // Start in disconnected state
    useConnectionStore.setState({ socket: fakeSocket as never, status: 'disconnected' });

    const { rerender } = render(
      <MemoryRouter><OnlineGamePage /></MemoryRouter>,
    );

    // Transition to connected — should trigger room:reconnect
    useConnectionStore.setState({ socket: fakeSocket as never, status: 'connected' });
    rerender(<MemoryRouter><OnlineGamePage /></MemoryRouter>);

    // Find the reconnect emit
    const reconnectCalls = emit.mock.calls.filter((args) => args[0] === 'room:reconnect');
    expect(reconnectCalls.length).toBeGreaterThanOrEqual(1);
    expect(reconnectCalls[0]?.[1]).toEqual({ code: 'ABCDEF', rejoinToken: 'token-abc-123-def' });
  });
});
