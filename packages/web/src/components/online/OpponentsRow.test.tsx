import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpponentsRow } from './OpponentsRow';

describe('OpponentsRow', () => {
  it('renders one cell per player with name', () => {
    render(
      <OpponentsRow
        players={[
          { id: 'p1', name: 'Alice', cardCount: 8 },
          { id: 'p2', name: 'Bob', cardCount: 7 },
        ]}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows "turn" status when player is on turn', () => {
    render(<OpponentsRow players={[{ id: 'p1', name: 'Alice', cardCount: 8, status: 'turn' }]} />);
    expect(screen.getByText('turn')).toBeInTheDocument();
  });

  it('shows "bidder" status when player is bidder', () => {
    render(<OpponentsRow players={[{ id: 'p1', name: 'Alice', cardCount: 8, status: 'bidder' }]} />);
    expect(screen.getByText('bidder')).toBeInTheDocument();
  });

  it('shows card count when no special status', () => {
    render(<OpponentsRow players={[{ id: 'p1', name: 'Alice', cardCount: 7 }]} />);
    expect(screen.getByText('7 cards')).toBeInTheDocument();
  });
});
