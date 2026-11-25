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
    expect(screen.getByTestId('led-suit')).toHaveAttribute('data-suit', 'spades');
    expect(screen.getByTestId('led-suit').textContent).toMatch(/Led: spades/i);
  });

  it('labels the led suit from the suit it was given', () => {
    render(
      <TrickArea
        played={[{ playerId: 'p1', card: { suit: 'clubs', rank: '9' } }]}
        playerNames={{ p1: 'Ada' }}
        ledSuit="clubs"
      />,
    );
    expect(screen.getByTestId('led-suit')).toHaveAttribute('data-suit', 'clubs');
    expect(screen.getByTestId('led-suit').querySelector('svg')).toBeTruthy();
  });
});
