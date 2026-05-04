import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows online when connected', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });

  it('shows connecting state', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('shows error/disconnected', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });
});
