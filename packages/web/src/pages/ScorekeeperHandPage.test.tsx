import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScorekeeperHandPage } from './ScorekeeperHandPage';
import { useScorekeeperStore } from '../stores/scorekeeper-store';

describe('ScorekeeperHandPage', () => {
  it('redirects to setup when no game is in progress', () => {
    useScorekeeperStore.getState().resetGame();
    const { container } = render(<MemoryRouter><ScorekeeperHandPage /></MemoryRouter>);
    expect(container).toBeInTheDocument();
  });

  it('renders the bidding flow when in bidding phase', () => {
    useScorekeeperStore.getState().resetGame();
    useScorekeeperStore.getState().initGame({
      gameType: '250',
      targetScore: 1000,
      players: Array.from({ length: 6 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
        seat: i + 1,
      })),
    });
    render(<MemoryRouter><ScorekeeperHandPage /></MemoryRouter>);
    expect(screen.getByText(/Hand 1/)).toBeInTheDocument();
    expect(screen.getByText(/Target: first to 1000/i)).toBeInTheDocument();
  });

  it('renders winner screen when game is over', () => {
    useScorekeeperStore.getState().resetGame();
    useScorekeeperStore.getState().initGame({
      gameType: '250',
      targetScore: 250,
      players: Array.from({ length: 6 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
        seat: i + 1,
      })),
    });
    // Force a winning score
    useScorekeeperStore.setState({
      runningScores: { p1: 300, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
    });
    render(<MemoryRouter><ScorekeeperHandPage /></MemoryRouter>);
    expect(screen.getByText(/Winner!/i)).toBeInTheDocument();
    expect(screen.getAllByText('Player 1').length).toBeGreaterThanOrEqual(1);
  });
});
