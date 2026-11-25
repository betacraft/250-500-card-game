/** Where one card sits in the fan. */
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

/**
 * Layout gap between cards. A 1px border makes the tappable sliver about
 * one pixel narrower, so 25px here still measures at least 24px.
 */
const MIN_SLIVER = 25;

/**
 * One overlapping row. Every card is the same width, and the whole row,
 * including the last card, stays inside the container. A 12-card phone row
 * shrinks the faces (about 72px at 360) so the slivers stay at least 24px.
 * A wide window can also shrink the row so the dock stays under the given height.
 */
export function fanMetrics(count: number, container: number, compact = false, maxHeight: number | null = null): FanMetrics {
  const wide = !compact && container >= 900;
  const lift = compact ? 8 : 12;
  const headroom = compact ? 16 : 18;
  const side = !compact ? 28 : count <= 8 ? 12 : 0;
  let cardW = compact ? 84 : wide ? (count > 8 ? 156 : 176) : 96;
  if (maxHeight !== null) {
    const room = maxHeight - headroom - lift;
    if (room > 40) cardW = Math.min(cardW, room / 1.4);
  }
  const inner = Math.max(container - side * 2, 48);
  cardW = Math.min(cardW, inner);
  const gaps = Math.max(count - 1, 0);
  if (gaps > 0 && (inner - cardW) / gaps < MIN_SLIVER) {
    cardW = Math.max(48, inner - MIN_SLIVER * gaps);
  }
  const step = gaps === 0 ? 0 : Math.min(cardW * 0.62, (inner - cardW) / gaps);
  const cardH = cardW * 1.4;
  const used = gaps === 0 ? cardW : step * gaps + cardW;
  const origin = Math.max(0, (inner - used) / 2);
  const crowded = compact && gaps > 0 && step < 30;
  const total = crowded ? 0 : wide ? (count > 8 ? 16 : 14) : 8;
  return {
    cardW,
    cardH,
    height: headroom + cardH + lift,
    cardWidth: () => cardW,
    left: (index) => side + origin + index * step,
    bottom: () => lift,
    angle: (index) => (count <= 1 || crowded ? 0 : -total / 2 + (index * total) / (count - 1)),
  };
}
