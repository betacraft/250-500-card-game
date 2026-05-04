import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnlineGamePage } from './OnlineGamePage';
import { useOnlineRoomStore } from '../stores/online-room-store';

describe('OnlineGamePage', () => {
  it('redirects when no room state', () => {
    useOnlineRoomStore.getState().clear();
    const { container } = render(<MemoryRouter><OnlineGamePage /></MemoryRouter>);
    expect(container).toBeInTheDocument();
  });
});
