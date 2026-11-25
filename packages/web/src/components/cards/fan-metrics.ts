/** Where one card sits in the fan. Positions are from the left of the viewport-wide fan. */
export interface FanMetrics {
  cardW: number;
  cardH: number;
  height: number;
  /** Width of this card. Every card in the row is the same width. */
  cardWidth: (index: number) => number;
  left: (index: number) => number;
  bottom: (index: number) => number;
  angle: (index: number) => number;
}

const END_DEGREES = 8;

/**
 * How far a card rotated around its bottom centre sticks out past its unrotated edge.
 * The top corner swings outward by the height's sine, minus the small cosine pull of the width.
 */
export function rotationOverhang(cardW: number, degrees: number): number {
  const radians = (Math.abs(degrees) * Math.PI) / 180;
  const cardH = cardW * 1.4;
  return cardH * Math.sin(radians) - (cardW / 2) * (1 - Math.cos(radians));
}

/** Side pad so the rotated corner stays at least 12px inside the screen. */
export function fanSidePad(cardW: number, degrees: number, minPad = 12): number {
  return Math.max(minPad, 12 + rotationOverhang(cardW, degrees));
}

/**
 * One overlapping row. Side pad covers the rotation overhang.
 * Usable width is the screen minus both pads, and the strip shares what is left after one card.
 */
export function fanMetrics(count: number, screen: number, compact = false, maxHeight: number | null = null): FanMetrics {
  const wide = !compact && screen >= 900;
  const lift = compact ? 8 : 12;
  const headroom = compact ? 16 : 18;
  let cardW = compact ? 108 : wide ? (count > 8 ? 156 : 176) : 96;
  if (maxHeight !== null) {
    const room = maxHeight - headroom - lift;
    if (room > 40) cardW = Math.min(cardW, room / 1.4);
  }
  const gaps = Math.max(count - 1, 0);
  const degrees = count <= 1 ? 0 : END_DEGREES;
  if (gaps > 0) {
    while (cardW > 44) {
      const pad = fanSidePad(cardW, degrees);
      const usable = screen - pad * 2;
      const strip = (usable - cardW) / gaps;
      if (strip >= 12) break;
      cardW -= 1;
    }
  }
  cardW = Math.max(maxHeight !== null ? 36 : 44, cardW);
  const pad = fanSidePad(cardW, degrees);
  const usable = Math.max(cardW, screen - pad * 2);
  const step = gaps === 0 ? 0 : (usable - cardW) / gaps;
  const cardH = cardW * 1.4;
  const used = gaps === 0 ? cardW : step * gaps + cardW;
  const origin = Math.max(pad, (screen - used) / 2);
  return {
    cardW,
    cardH,
    height: maxHeight !== null ? Math.min(maxHeight, headroom + cardH + lift) : headroom + cardH + lift,
    cardWidth: () => cardW,
    left: (index) => (gaps === 0 ? (screen - cardW) / 2 : origin + index * step),
    bottom: () => lift,
    angle: (index) => (count <= 1 ? 0 : -degrees + (index * (degrees * 2)) / (count - 1)),
  };
}

/** Viewport clearance of the rotated outer corners, in px. */
export function cornerClearance(count: number, screen: number, compact = false): { left: number; right: number } {
  const metrics = fanMetrics(count, screen, compact, null);
  const hang = rotationOverhang(metrics.cardW, Math.abs(metrics.angle(0)));
  const left = metrics.left(0) - hang;
  const last = Math.max(count - 1, 0);
  const right = screen - (metrics.left(last) + metrics.cardW + hang);
  return { left, right };
}
