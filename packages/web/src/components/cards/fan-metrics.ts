/** Where one card sits in the fan. */
export interface FanMetrics {
  cardW: number;
  cardH: number;
  height: number;
  /** Width of this card. The last card narrows when a 12-card row needs a 24px sliver. */
  cardWidth: (index: number) => number;
  left: (index: number) => number;
  bottom: (index: number) => number;
  angle: (index: number) => number;
}

/** Each covered card must leave at least this many CSS pixels free to tap. */
const MIN_SLIVER = 26;

/**
 * One overlapping row. Phones keep an 84px card when the row has room.
 * A 12-card phone row tightens the side margins and the last card so every
 * visible sliver stays at least 24px. A wide window can shrink the row so
 * the dock stays under the given height.
 */
export function fanMetrics(count: number, container: number, compact = false, maxHeight: number | null = null): FanMetrics {
  const wide = !compact && container >= 900;
  const lift = compact ? 8 : 12;
  const headroom = compact ? 16 : 18;
  const side = compact ? (count > 8 ? 0 : 12) : 28;
  const rightPad = compact && count > 8 ? 12 : 0;
  let cardW = compact ? 84 : wide ? (count > 8 ? 156 : 176) : 96;
  if (maxHeight !== null) {
    const room = maxHeight - headroom - lift;
    if (room > 40) cardW = Math.min(cardW, room / 1.4);
  }
  const inner = Math.max(container - side * 2 - rightPad, 48);
  cardW = Math.min(cardW, inner);
  const gaps = Math.max(count - 1, 1);
  let step = count <= 1 ? 0 : Math.min(cardW * 0.62, (inner - cardW) / gaps);
  let lastW = cardW;
  if (count > 1 && step < MIN_SLIVER) {
    step = MIN_SLIVER;
    lastW = Math.max(MIN_SLIVER, inner - step * (count - 1));
    if (lastW === MIN_SLIVER) step = (inner - lastW) / gaps;
  }
  const cardH = cardW * 1.4;
  const origin = Math.max(0, (inner - (count <= 1 ? cardW : step * (count - 1) + lastW)) / 2);
  const crowded = compact && count > 8;
  const total = crowded ? 0 : wide ? (count > 8 ? 16 : 14) : 8;
  return {
    cardW,
    cardH,
    height: headroom + cardH + lift,
    cardWidth: (index) => (count > 1 && index === count - 1 ? lastW : cardW),
    left: (index) => side + origin + index * step,
    bottom: () => lift,
    angle: (index) => (count <= 1 || crowded ? 0 : -total / 2 + (index * total) / (count - 1)),
  };
}
