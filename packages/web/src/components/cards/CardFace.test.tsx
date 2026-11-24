import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('dims a disabled face without making it transparent', () => {
    const { container } = render(<CardFace card={{ suit: 'clubs', rank: '6' }} disabled />);
    const svg = container.querySelector('svg');
    expect(svg?.style.opacity === '' || svg?.style.opacity === '1').toBe(true);
    expect(svg?.style.filter).toMatch(/brightness/);
    const stock = container.querySelector('rect');
    expect(stock?.getAttribute('fill')).toBe('#FFFDF7');
    expect(stock?.getAttribute('fill-opacity') ?? '1').toBe('1');
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

  it('lifts a selected face without covering the next card', () => {
    const cards = ['a', 'b', 'c'].map((id) => ({ suit: 'hearts' as const, rank: 'K' as const, id }));
    render(<HandFan cards={cards} canPlay onPlay={() => undefined} />);
    const buttons = screen.getAllByTestId('hand-card');
    const first = buttons[0];
    const second = buttons[1];
    if (!first || !second) throw new Error('missing cards');
    fireEvent.pointerDown(first);
    expect(first.getAttribute('data-selected')).toBe('true');
    expect(first.style.transform).not.toMatch(/translateY/);
    expect(first.style.zIndex).toBe('1');
    expect(second.style.zIndex).toBe('2');
    const lift = first.querySelector('[data-testid="card-lift"]');
    expect(lift).toBeTruthy();
    expect((lift as HTMLElement).style.transform).toMatch(/translateY/);
    expect((lift as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('plays the card a tap just selected', () => {
    const onPlay = vi.fn();
    const onBlocked = vi.fn();
    const card = { suit: 'spades' as const, rank: 'A' as const, id: 'ace' };
    render(<HandFan cards={[card]} canPlay onPlay={onPlay} onBlocked={onBlocked} />);
    fireEvent.pointerDown(screen.getByTestId('hand-card'));
    fireEvent.pointerDown(screen.getByTestId('confirm-play'));
    expect(onBlocked.mock.calls.map((call) => call[0])).not.toContain('Tap a card, then Play');
    expect(onPlay).toHaveBeenCalledWith(card);
  });
});
