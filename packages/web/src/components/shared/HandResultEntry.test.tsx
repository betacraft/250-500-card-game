import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HandResultEntry } from './HandResultEntry';
import type { Player } from '@250-500/shared';

const PLAYERS: Player[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Player ${i + 1}`,
  seat: i + 1,
}));

describe('HandResultEntry', () => {
  it('renders Made/Failed buttons', () => {
    render(
      <HandResultEntry
        players={PLAYERS}
        gameType="250"
        bidder="p1"
        bidAmount={175}
        onApply={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /made it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument();
  });

  it('shows partner pills for non-bidders', () => {
    render(
      <HandResultEntry
        players={PLAYERS}
        gameType="250"
        bidder="p1"
        bidAmount={175}
        onApply={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /^Player 2$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Player 6$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Player 1$/ })).not.toBeInTheDocument();
  });

  it('shows score preview after Made is selected with partners', async () => {
    render(
      <HandResultEntry
        players={PLAYERS}
        gameType="250"
        bidder="p1"
        bidAmount={175}
        onApply={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /made it/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Player 2$/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Player 3$/ }));
    expect(screen.getByText('+275')).toBeInTheDocument();
    expect(screen.getAllByText('+175').length).toBeGreaterThanOrEqual(2);
  });

  it('apply button disabled until Made/Failed picked', async () => {
    render(
      <HandResultEntry
        players={PLAYERS}
        gameType="250"
        bidder="p1"
        bidAmount={175}
        onApply={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /apply scores/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /failed/i }));
    expect(screen.getByRole('button', { name: /apply scores/i })).not.toBeDisabled();
  });

  it('calls onApply with bidMade and partners array', async () => {
    const onApply = vi.fn();
    render(
      <HandResultEntry
        players={PLAYERS}
        gameType="250"
        bidder="p1"
        bidAmount={175}
        onApply={onApply}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /made it/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Player 2$/ }));
    await userEvent.click(screen.getByRole('button', { name: /apply scores/i }));
    expect(onApply).toHaveBeenCalledWith(true, ['p2']);
  });
});
