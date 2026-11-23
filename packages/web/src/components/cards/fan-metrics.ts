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
 * Fan geometry. Each card's centre stays clear of the next card, using a
 * second row when one row would bury it. A desktop cap keeps the dock
 * from eating the bidding controls.
 */
export function fanMetrics(count: number, container: number, compact = false, maxHeight: number | null = null): FanMetrics {
  const wide = !compact && container >= 900;
  const lift = compact ? 8 : 12;
  const rowGap = 8;
  const start = compact ? 84 : wide ? (count > 8 ? 156 : 176) : 96;
  const placed = placeCards(count, container, start, lift, rowGap, maxHeight, wide);
  const per = Math.ceil(count / placed.rows);
  const pad = swingPad(placed.cardW, wide);
  const usable = Math.max(container - pad.side * 2, placed.cardW);
  const step = per <= 1 ? 0 : Math.min(placed.cardW * 0.62, (usable - placed.cardW) / (per - 1));
  const origin = Math.max(0, (usable - (placed.cardW + step * Math.max(per - 1, 0))) / 2);
  const total = wide ? (per > 8 ? 18 : 16) : 14;
  return {
    cardW: placed.cardW,
    cardH: placed.cardH,
    height: placed.height,
    left: (index) => pad.side + origin + (index % per) * step,
    bottom: (index) => lift + (placed.rows - 1 - Math.floor(index / per)) * (placed.cardH + rowGap),
    angle: (index) => (per <= 1 ? 0 : -total / 2 + ((index % per) * total) / (per - 1)),
  };
}

/** Room the rotated rank corner needs so the fan box does not crop it. */
function swingPad(cardW: number, wide: boolean): { side: number; top: number } {
  const rad = ((wide ? 9 : 7) * Math.PI) / 180;
  const cardH = cardW * 1.4;
  return {
    side: Math.ceil(cardH * Math.sin(rad) + 4),
    top: Math.ceil((cardW / 2) * Math.sin(rad) + 10),
  };
}

function placeCards(
  count: number,
  container: number,
  start: number,
  lift: number,
  rowGap: number,
  maxHeight: number | null,
  wide: boolean,
): { cardW: number; cardH: number; rows: number; height: number } {
  let cardW = Math.min(start, container);
  let rows = 1;
  for (let guard = 0; guard < 200; guard += 1) {
    if (rowClears(count, container, cardW, 1, lift, rowGap, maxHeight, wide)) {
      rows = 1;
      break;
    }
    if (rowClears(count, container, cardW, 2, lift, rowGap, maxHeight, wide)) {
      rows = 2;
      break;
    }
    if (cardW <= 64) {
      rows = 2;
      break;
    }
    cardW -= 1;
  }
  const cardH = cardW * 1.4;
  const height = swingPad(cardW, wide).top + rows * cardH + Math.max(0, rows - 1) * rowGap + lift;
  return { cardW, cardH, rows, height };
}

/** True when this card width keeps every centre out of the next card and inside the cap. */
function rowClears(
  count: number,
  container: number,
  cardW: number,
  rows: number,
  lift: number,
  rowGap: number,
  maxHeight: number | null,
  wide: boolean,
): boolean {
  const pad = swingPad(cardW, wide);
  const usable = container - pad.side * 2;
  if (cardW < 64 || cardW > usable) return false;
  const cardH = cardW * 1.4;
  const height = pad.top + rows * cardH + Math.max(0, rows - 1) * rowGap + lift;
  if (maxHeight !== null && height > maxHeight + 0.5) return false;
  const per = Math.ceil(count / rows);
  if (per <= 1) return true;
  const step = Math.min(cardW * 0.62, (usable - cardW) / (per - 1));
  return step + 0.05 >= cardW * 0.5;
}
