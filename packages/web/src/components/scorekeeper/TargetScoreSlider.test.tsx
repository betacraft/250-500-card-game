import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TargetScoreSlider } from './TargetScoreSlider';

describe('TargetScoreSlider', () => {
  it('shows the current value', () => {
    render(<TargetScoreSlider value={1000} onChange={() => {}} />);
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('calls onChange when slider is moved', () => {
    const onChange = vi.fn();
    render(<TargetScoreSlider value={1000} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1500' } });
    expect(onChange).toHaveBeenCalledWith(1500);
  });

  it('respects min/max props', () => {
    render(<TargetScoreSlider value={500} onChange={() => {}} min={250} max={750} />);
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
  });
});
