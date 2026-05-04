import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopStateStrip } from './TopStateStrip';

describe('TopStateStrip', () => {
  it('shows trump suit when set', () => {
    render(<TopStateStrip trump="hearts" bid={175} bidderName="Alice" yourScore={250} />);
    expect(screen.getByText(/hearts/i)).toBeInTheDocument();
  });

  it('shows em-dash when trump is null', () => {
    render(<TopStateStrip trump={null} bid={null} bidderName={null} yourScore={0} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows bid amount and bidder name', () => {
    render(<TopStateStrip trump="spades" bid={175} bidderName="Bob" yourScore={0} />);
    expect(screen.getByText('175')).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('shows your score', () => {
    render(<TopStateStrip trump={null} bid={null} bidderName={null} yourScore={425} />);
    expect(screen.getByText('425')).toBeInTheDocument();
  });
});
