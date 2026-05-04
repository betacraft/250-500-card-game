import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HandSlider } from './HandSlider';
import type { Card } from '@250-500/shared';

const HAND: Card[] = [
  { suit: 'spades', rank: 'A' },
  { suit: 'hearts', rank: 'Q' },
  { suit: 'clubs', rank: '7' },
];

describe('HandSlider', () => {
  it('renders one button per card', () => {
    render(<HandSlider cards={HAND} canPlay={true} onPlay={() => {}} />);
    const cards = screen.getAllByRole('button', { name: /of/ });
    expect(cards.length).toBe(HAND.length);
  });

  it('disables tap when canPlay is false', () => {
    const onPlay = vi.fn();
    render(<HandSlider cards={HAND} canPlay={false} onPlay={onPlay} />);
    const cards = screen.getAllByRole('button', { name: /of/ });
    expect(cards[0]).toBeDisabled();
  });

  it('alwaysConfirm=true: tap selects, Play button confirms', async () => {
    const onPlay = vi.fn();
    render(<HandSlider cards={HAND} canPlay={true} onPlay={onPlay} alwaysConfirm={true} />);
    await userEvent.click(screen.getByRole('button', { name: /A of spades/i }));
    expect(onPlay).not.toHaveBeenCalled();
    const playBtn = screen.getByRole('button', { name: /^Play A/i });
    await userEvent.click(playBtn);
    expect(onPlay).toHaveBeenCalledWith({ suit: 'spades', rank: 'A' });
  });

  it('alwaysConfirm=false: single tap plays directly', async () => {
    const onPlay = vi.fn();
    render(<HandSlider cards={HAND} canPlay={true} onPlay={onPlay} alwaysConfirm={false} />);
    await userEvent.click(screen.getByRole('button', { name: /A of spades/i }));
    expect(onPlay).toHaveBeenCalledWith({ suit: 'spades', rank: 'A' });
  });

  it('illegal cards are disabled', () => {
    const legal = new Set(['Qh']);
    render(<HandSlider cards={HAND} canPlay={true} legalCardIds={legal} onPlay={() => {}} />);
    expect(screen.getByRole('button', { name: /A of spades/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Q of hearts/i })).not.toBeDisabled();
  });
});
