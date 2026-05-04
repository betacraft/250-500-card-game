import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrickArea } from './TrickArea';

describe('TrickArea', () => {
  it('renders empty state when no cards played', () => {
    render(<TrickArea played={[]} playerNames={{}} />);
    expect(screen.getByText(/trick area/i)).toBeInTheDocument();
  });

  it('renders cards and player names when cards played', () => {
    render(
      <TrickArea
        played={[
          { playerId: 'p1', card: { suit: 'spades', rank: 'A' } },
          { playerId: 'p2', card: { suit: 'spades', rank: 'K' } },
        ]}
        playerNames={{ p1: 'Alice', p2: 'Bob' }}
        ledSuit="spades"
      />,
    );
    expect(screen.getByText(/alice · bob/i)).toBeInTheDocument();
  });
});
