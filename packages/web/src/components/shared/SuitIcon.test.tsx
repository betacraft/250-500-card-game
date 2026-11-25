import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { Suit } from '@250-500/shared';
import { CardFace } from '../cards/CardFace';
import { CLUB_LOBES, SUIT_BADGE, SUIT_CREAM, SUIT_FILL, SUIT_PIP } from '../cards/suit-glyphs';
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

  it('points the club up: one lobe on the centre, two lobes below it', () => {
    const top = [...CLUB_LOBES].sort((a, b) => a.cy - b.cy)[0];
    const lower = CLUB_LOBES.filter((lobe) => lobe.cy > (top?.cy ?? 0));
    const edges = CLUB_LOBES.flatMap((lobe) => [lobe.cx - lobe.r, lobe.cx + lobe.r]);
    const centre = (Math.min(...edges) + Math.max(...edges)) / 2;
    expect(top?.cx).toBeCloseTo(centre, 5);
    expect(lower).toHaveLength(2);
    expect(lower[0]?.cy).toBeCloseTo(lower[1]?.cy ?? 0, 5);
    expect(SUIT_PIP.clubs).toContain(String(top?.cx));
  });

  it('keeps at least 3:1 between each pip and both the cream page and the felt badge', () => {
    for (const suit of SUITS) {
      expect(contrast(SUIT_FILL[suit], SUIT_CREAM), `${suit} on cream`).toBeGreaterThanOrEqual(3);
      expect(contrast(SUIT_FILL[suit], SUIT_BADGE), `${suit} on the felt badge`).toBeGreaterThanOrEqual(3);
      const { container } = render(<SuitIcon suit={suit} badge />);
      const badge = container.querySelector('[data-icon-badge]');
      expect(badge).toHaveStyle({ backgroundColor: SUIT_BADGE });
    }
  });
});

function contrast(foreground: string, background: string): number {
  const light = (hex: string): number => {
    const value = Number.parseInt(hex.slice(1), 16);
    const channel = (shift: number): number => {
      const raw = ((value >> shift) & 255) / 255;
      return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  };
  const lighter = Math.max(light(foreground), light(background));
  const darker = Math.min(light(foreground), light(background));
  return (lighter + 0.05) / (darker + 0.05);
}
