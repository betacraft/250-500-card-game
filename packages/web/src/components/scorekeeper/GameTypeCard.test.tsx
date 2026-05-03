import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameTypeCard } from './GameTypeCard';

describe('GameTypeCard', () => {
  it('shows game type and player count', () => {
    render(<GameTypeCard gameType="250" playerCount={6} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('6 players')).toBeInTheDocument();
  });

  it('reflects selected state via aria-pressed', () => {
    render(<GameTypeCard gameType="500" playerCount={8} selected={true} onSelect={() => {}} />);
    const button = screen.getByRole('button', { pressed: true });
    expect(button).toBeInTheDocument();
  });

  it('calls onSelect with the game type when tapped', async () => {
    const onSelect = vi.fn();
    render(<GameTypeCard gameType="500" playerCount={8} selected={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('500');
  });
});
