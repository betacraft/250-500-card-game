import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders both mode buttons', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /score in-person game/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play online/i })).toBeInTheDocument();
  });
});
