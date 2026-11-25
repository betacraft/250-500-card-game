import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocalPlayPage } from './LocalPlayPage';

describe('LocalPlayPage', () => {
  it('is free to play and does not mention stakes', () => {
    render(
      <MemoryRouter>
        <LocalPlayPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /play vs bots/i })).toBeInTheDocument();
    expect(screen.getByText(/no coins, no stakes, no buy-in/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bet|wager|stake|buy-in/i })).toBeNull();
  });
});
