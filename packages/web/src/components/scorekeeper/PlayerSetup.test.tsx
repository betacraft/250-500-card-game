import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerSetup } from './PlayerSetup';

describe('PlayerSetup', () => {
  it('renders one input per player', () => {
    render(<PlayerSetup names={['', '', '', '', '', '']} onChange={() => {}} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('calls onChange with the player index and value on input', async () => {
    const onChange = vi.fn();
    render(<PlayerSetup names={['', '', '', '', '', '']} onChange={onChange} />);
    const firstInput = screen.getByLabelText('Player 1 name');
    await userEvent.type(firstInput, 'M');
    expect(onChange).toHaveBeenCalledWith(0, 'M');
  });
});
