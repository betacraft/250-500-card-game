import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrumpPicker } from './TrumpPicker';

describe('TrumpPicker', () => {
  it('renders all 4 suit buttons', () => {
    render(<TrumpPicker value={null} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /trump spades/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trump hearts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trump diamonds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trump clubs/i })).toBeInTheDocument();
  });

  it('reflects selected suit via aria-pressed', () => {
    render(<TrumpPicker value="hearts" onChange={() => {}} />);
    const hearts = screen.getByRole('button', { name: /trump hearts/i });
    expect(hearts).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the suit when tapped', async () => {
    const onChange = vi.fn();
    render(<TrumpPicker value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /trump diamonds/i }));
    expect(onChange).toHaveBeenCalledWith('diamonds');
  });
});
