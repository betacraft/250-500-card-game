/** Where one card sits in the fan. */
export interface FanMetrics {
  cardW: number;
  cardH: number;
  height: number;
  left: (index: number) => number;
  bottom: (index: number) => number;
  angle: (index: number) => number;
}

/**
 * One overlapping row. Phones keep an 84px card. A wide window can shrink
 * the row so the dock stays under the given height.
 */
export function fanMetrics(count: number, container: number, compact = false, maxHeight: number | null = null): FanMetrics {
  const wide = !compact && container >= 900;
  const lift = compact ? 8 : 12;
  const headroom = compact ? 16 : 18;
  const side = compact ? 12 : 28;
  let cardW = compact ? 84 : wide ? (count > 8 ? 156 : 176) : 96;
  if (maxHeight !== null) {
    const room = maxHeight - headroom - lift;
    if (room > 40) cardW = Math.min(cardW, room / 1.4);
  }
  cardW = Math.min(cardW, Math.max(container - side * 2, 44));
  const cardH = cardW * 1.4;
  const usable = Math.max(container - side * 2, cardW);
  const step = count <= 1 ? 0 : Math.min(cardW * 0.62, (usable - cardW) / Math.max(count - 1, 1));
  const origin = Math.max(0, (usable - cardW - step * Math.max(count - 1, 0)) / 2);
  const total = wide ? (count > 8 ? 16 : 14) : 8;
  return {
    cardW,
    cardH,
    height: headroom + cardH + lift,
    left: (index) => side + origin + index * step,
    bottom: () => lift,
    angle: (index) => (count <= 1 ? 0 : -total / 2 + (index * total) / (count - 1)),
  };
}
