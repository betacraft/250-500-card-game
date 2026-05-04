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

  it('shows the online play link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    const onlineLink = screen.getByRole('link', { name: /play online/i });
    expect(onlineLink).toBeInTheDocument();
  });

  it('navigates to setup page', () => {
    render(
      <MemoryRouter initialEntries={['/scorekeeper/setup']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /new game/i })).toBeInTheDocument();
  });
});
