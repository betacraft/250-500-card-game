import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBoard } from './ScoreBoard';
import type { Player } from '@250-500/shared';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Alice', seat: 1 },
  { id: 'p2', name: 'Bob', seat: 2 },
  { id: 'p3', name: 'Carol', seat: 3 },
];

describe('ScoreBoard', () => {
  it('renders all players with their scores', () => {
    render(
      <ScoreBoard
        players={PLAYERS}
        runningScores={{ p1: 275, p2: 0, p3: -100 }}
        targetScore={1000}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('275')).toBeInTheDocument();
    expect(screen.getByText('-100')).toBeInTheDocument();
  });

  it('shows "Winner" badge for players at or above target', () => {
    render(
      <ScoreBoard
        players={PLAYERS}
        runningScores={{ p1: 1100, p2: 500, p3: 200 }}
        targetScore={1000}
      />,
    );
    expect(screen.getByText('Winner')).toBeInTheDocument();
  });

  it('sorts highest score first', () => {
    render(
      <ScoreBoard
        players={PLAYERS}
        runningScores={{ p1: 100, p2: 500, p3: 300 }}
        targetScore={1000}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]?.textContent).toContain('Bob');
    expect(items[1]?.textContent).toContain('Carol');
    expect(items[2]?.textContent).toContain('Alice');
  });
});
