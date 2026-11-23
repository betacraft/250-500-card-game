import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartnerPicker } from './PartnerPicker';

describe('PartnerPicker', () => {
  it('shows the count out of max', () => {
    render(<PartnerPicker selected={[]} maxCount={2} onChange={() => {}} />);
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
  });

  it('shows the count of selected cards', () => {
    render(
      <PartnerPicker
        selected={[{ suit: 'hearts', rank: 'Q' }]}
        maxCount={2}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('marks a card the bidder already holds', () => {
    render(<PartnerPicker selected={[]} maxCount={2} heldFaces={new Set(['As'])} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /A of spades, in your hand/i })).toHaveAttribute('data-held', 'true');
  });

  it('calls onChange when a card is tapped', async () => {
    const onChange = vi.fn();
    render(<PartnerPicker selected={[]} maxCount={2} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /A of spades/i }));
    expect(onChange).toHaveBeenCalledWith([{ suit: 'spades', rank: 'A' }]);
  });

  it('deselects a card when tapped while selected', async () => {
    const onChange = vi.fn();
    render(
      <PartnerPicker
        selected={[{ suit: 'hearts', rank: 'Q' }]}
        maxCount={2}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Q of hearts/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('does not add beyond maxCount', async () => {
    const onChange = vi.fn();
    render(
      <PartnerPicker
        selected={[
          { suit: 'hearts', rank: 'Q' },
          { suit: 'diamonds', rank: 'K' },
        ]}
        maxCount={2}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /A of spades/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains why a further card does not select', async () => {
    const onBlocked = vi.fn();
    render(
      <PartnerPicker
        selected={[
          { suit: 'hearts', rank: 'Q' },
          { suit: 'diamonds', rank: 'K' },
          { suit: 'clubs', rank: 'A' },
        ]}
        maxCount={3}
        onChange={() => {}}
        onBlocked={onBlocked}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^5 of spades/i }));
    expect(onBlocked).toHaveBeenCalledWith("You've called 3 cards — tap one to unselect");
  });
});
