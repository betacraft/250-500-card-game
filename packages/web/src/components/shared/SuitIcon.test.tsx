import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SuitIcon } from './SuitIcon';

describe('SuitIcon', () => {
  it('renders an svg for each suit', () => {
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      const { container } = render(<SuitIcon suit={suit} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    }
  });

  it('respects size prop', () => {
    const { container } = render(<SuitIcon suit="hearts" size={32} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });
});
