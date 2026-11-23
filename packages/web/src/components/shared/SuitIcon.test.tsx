import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { Suit } from '@250-500/shared';
import { CardFace } from '../cards/CardFace';
import { SUIT_FILL, SUIT_PIP } from '../cards/suit-glyphs';
import { SuitIcon } from './SuitIcon';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

describe('SuitIcon', () => {
  it('renders an svg for each suit', () => {
    for (const suit of SUITS) {
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

  it('shares the CardFace colour map and names every icon', () => {
    for (const suit of SUITS) {
      const icon = render(<SuitIcon suit={suit} />);
      const svg = icon.container.querySelector('svg');
      const path = icon.container.querySelector('path');
      expect(svg?.getAttribute('aria-label')).toBe(suit);
      expect(svg?.getAttribute('aria-hidden')).toBeNull();
      expect(path?.getAttribute('fill')).toBe(SUIT_FILL[suit]);
      expect(path?.getAttribute('d')).toBe(SUIT_PIP[suit]);
      const face = render(<CardFace card={{ suit, rank: 'A' }} />);
      const fills = [...face.container.querySelectorAll('path')].map((node) => node.getAttribute('fill'));
      expect(fills).toContain(SUIT_FILL[suit]);
    }
  });
});
