import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnlineHomePage } from './OnlineHomePage';

describe('OnlineHomePage', () => {
  it('renders the host and join buttons', () => {
    render(<MemoryRouter><OnlineHomePage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /host a game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join a game/i })).toBeInTheDocument();
  });
});
