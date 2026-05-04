import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReconnectionBanner } from './ReconnectionBanner';

describe('ReconnectionBanner', () => {
  it('shows reconnecting message when status is connecting', () => {
    render(<ReconnectionBanner status="connecting" onRetry={() => {}} />);
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it('shows disconnected message when status is disconnected', () => {
    render(<ReconnectionBanner status="disconnected" onRetry={() => {}} />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('calls onRetry when retry button is tapped', async () => {
    const onRetry = vi.fn();
    render(<ReconnectionBanner status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
