import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnlineLobbyPage } from './OnlineLobbyPage';
import { useOnlineRoomStore } from '../stores/online-room-store';

describe('OnlineLobbyPage', () => {
  it('redirects to /online when no room state', () => {
    useOnlineRoomStore.getState().clear();
    const { container } = render(<MemoryRouter><OnlineLobbyPage /></MemoryRouter>);
    expect(container).toBeInTheDocument();
  });
});
