import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

describe('App', () => {
  it('renders the home page heading at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /250 & 500/i })).toBeInTheDocument();
  });

  it('shows the score-in-person link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /score in-person game/i })).toBeInTheDocument();
  });

  it('disables the online play button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    const onlineBtn = screen.getByRole('button', { name: /play online/i });
    expect(onlineBtn).toBeDisabled();
  });
});
