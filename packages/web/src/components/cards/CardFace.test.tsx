import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardFace } from './CardFace';
import { HandFan } from './HandFan';

describe('card faces', () => {
  it('marks only a requested first 3 with the 30 lozenge', () => {
    const { rerender } = render(<CardFace card={{ suit: 'spades', rank: '3', id: 'a' }} thirty />);
    expect(screen.getByTestId('thirty-marker')).toBeInTheDocument();
    rerender(<CardFace card={{ suit: 'spades', rank: '3', id: 'b' }} />);
    expect(screen.queryByTestId('thirty-marker')).toBeNull();
    rerender(<CardFace card={{ suit: 'hearts', rank: '3', id: 'c' }} thirty />);
    expect(screen.getByTestId('thirty-marker')).toBeInTheDocument();
  });

  it('fans one button per physical card', () => {
    const cards = [
      { suit: 'spades' as const, rank: '3' as const, id: '1' },
      { suit: 'spades' as const, rank: '3' as const, id: '2' },
      { suit: 'hearts' as const, rank: '3' as const, id: '3' },
    ];
    render(
      <HandFan
        cards={cards}
        canPlay
        onPlay={() => undefined}
        thirtySuits={new Set(['spades'])}
      />,
    );
    expect(screen.getAllByTestId('hand-card')).toHaveLength(3);
    expect(screen.getAllByTestId('thirty-marker')).toHaveLength(2);
  });
});
