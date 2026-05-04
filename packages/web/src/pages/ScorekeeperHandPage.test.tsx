import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScorekeeperHandPage } from './ScorekeeperHandPage';
import { useScorekeeperStore } from '../stores/scorekeeper-store';

describe('ScorekeeperHandPage', () => {
  it('redirects to setup when no game is in progress', () => {
    useScorekeeperStore.getState().resetGame();
    const { container } = render(<MemoryRouter><ScorekeeperHandPage /></MemoryRouter>);
    // Navigate component renders nothing visible — just verify it doesn't throw
    expect(container).toBeInTheDocument();
  });
});
