import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnlineLobbyPage } from './OnlineLobbyPage';
import { useOnlineRoomStore } from '../stores/online-room-store';
import { useConnectionStore } from '../stores/connection-store';

describe('OnlineLobbyPage', () => {
  it('redirects to /online when no room state', () => {
    useOnlineRoomStore.getState().clear();
    const { container } = render(<MemoryRouter><OnlineLobbyPage /></MemoryRouter>);
    expect(container).toBeInTheDocument();
  });

  it('renders the room code prominently when a room is set', () => {
    useOnlineRoomStore.setState({
      room: {
        code: 'ABCDEF',
        gameType: '250',
        hostSocketId: 's1',
        capacity: 6,
        phase: 'lobby',
        players: [
          { id: 'p1', name: 'Alice', seat: 1, socketId: 's1', connected: true },
        ],
      },
      yourSeat: 1,
      rejoinToken: null,
      rememberedCode: null,
    });
    useConnectionStore.setState({
      socket: { id: 's1', emit: () => undefined, on: () => undefined, off: () => undefined } as never,
      status: 'connected',
    });
    render(<MemoryRouter><OnlineLobbyPage /></MemoryRouter>);
    expect(screen.getByText('ABCDEF')).toBeInTheDocument();
    expect(screen.getByText(/1 of 6 players/i)).toBeInTheDocument();
  });

  it('shows seats with empty/occupied states', () => {
    useOnlineRoomStore.setState({
      room: {
        code: 'ABCDEF',
        gameType: '250',
        hostSocketId: 's1',
        capacity: 6,
        phase: 'lobby',
        players: [
          { id: 'p1', name: 'Alice', seat: 1, socketId: 's1', connected: true },
          { id: 'p2', name: 'Bob', seat: 3, socketId: 's2', connected: true },
        ],
      },
      yourSeat: 1,
      rejoinToken: null,
      rememberedCode: null,
    });
    useConnectionStore.setState({
      socket: { id: 's1', emit: () => undefined, on: () => undefined, off: () => undefined } as never,
      status: 'connected',
    });
    render(<MemoryRouter><OnlineLobbyPage /></MemoryRouter>);
    expect(screen.getByText('Alice (you)')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // 4 empty seats remaining (capacity 6 - 2 occupied)
    expect(screen.getAllByText(/Empty/i).length).toBe(4);
  });
});
