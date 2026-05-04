import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScorekeeperSetupPage } from './ScorekeeperSetupPage';

describe('ScorekeeperSetupPage', () => {
  it('renders heading and game type cards', () => {
    render(<MemoryRouter><ScorekeeperSetupPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getAllByText('250').length).toBeGreaterThan(0);
    expect(screen.getAllByText('500').length).toBeGreaterThan(0);
  });

  it('Start game button is disabled until names are entered', () => {
    render(<MemoryRouter><ScorekeeperSetupPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled();
  });
});
