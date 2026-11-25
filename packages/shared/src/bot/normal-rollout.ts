import { FACES, POINT_OF, RANK_OF, SEATS, STRIDE, SUIT_OF, type Work } from './normal-model';

export function rollout(work: Work, action: number, rng: () => number): number {
  work.cards.set(work.sampleCards);
  work.counts.set(work.sampleCounts);
  work.points.set(work.basePoints);
  work.slotOwner.set(work.baseSlotOwner);
  work.trickFace.set(work.baseTrickFace);
  work.trickSeat.set(work.baseTrickSeat);
  work.trickLen = work.baseTrickLen;
  work.spadesDone = work.baseSpades;
  work.heartsDone = work.baseHearts;
  let turn = playOne(work, work.actor, action);
  let guard = 0;
  while (remaining(work) > 0 && guard < 100) {
    guard += 1;
    const led = work.trickLen === 0 ? -1 : (SUIT_OF[work.trickFace[0] ?? 0] ?? 0);
    turn = playOne(work, turn, drawSerial(work, turn, led, rng));
  }
  if (work.is500 === 1) clockwise(work);
  return utility(work);
}

function playOne(work: Work, seat: number, serial: number): number {
  removeSerial(work, seat, serial);
  const face = serial % FACES;
  work.trickFace[work.trickLen] = face;
  work.trickSeat[work.trickLen] = seat;
  work.trickLen += 1;
  fillSlot(work, seat, face);
  if (work.trickLen < work.seats) return (seat + 1) % work.seats;
  const winner = trickWinner(work);
  award(work, winner);
  work.trickLen = 0;
  return winner;
}

function removeSerial(work: Work, seat: number, serial: number): void {
  const base = seat * STRIDE;
  const n = work.counts[seat] ?? 0;
  for (let i = 0; i < n; i += 1) {
    if (work.cards[base + i] !== serial) continue;
    work.cards[base + i] = work.cards[base + n - 1] ?? 0;
    work.counts[seat] = n - 1;
    return;
  }
}

function fillSlot(work: Work, seat: number, face: number): void {
  if (work.is500 === 0 || seat === work.bidder) return;
  for (let slot = 0; slot < work.slotCount; slot += 1) {
    if ((work.slotOwner[slot] ?? -1) >= 0 || work.slotFace[slot] !== face) continue;
    work.slotOwner[slot] = seat;
    return;
  }
}

function trickWinner(work: Work): number {
  let best = 0;
  let bestRank = -1;
  let bestTrump = 0;
  const led = SUIT_OF[work.trickFace[0] ?? 0] ?? 0;
  for (let i = 0; i < work.trickLen; i += 1) {
    const face = work.trickFace[i] ?? 0;
    const suit = SUIT_OF[face] ?? 0;
    const rank = RANK_OF[face] ?? 0;
    const trump = suit === work.trump ? 1 : 0;
    const betterTrump = trump === 1 && (bestTrump === 0 || rank > bestRank);
    const betterLed = trump === 0 && bestTrump === 0 && suit === led && rank > bestRank;
    if (betterTrump || betterLed) {
      best = i;
      bestRank = rank;
      bestTrump = trump;
    }
  }
  return work.trickSeat[best] ?? 0;
}

function award(work: Work, winner: number): void {
  let points = 0;
  for (let i = 0; i < work.trickLen; i += 1) {
    const face = work.trickFace[i] ?? 0;
    points += POINT_OF[face] ?? 0;
    if (work.spadesDone === 0 && face === 0) {
      points += 30;
      work.spadesDone = 1;
    }
    if (work.is500 === 1 && work.heartsDone === 0 && face === 12) {
      points += 30;
      work.heartsDone = 1;
    }
  }
  work.points[winner] = (work.points[winner] ?? 0) + points;
}

function drawSerial(work: Work, seat: number, led: number, rng: () => number): number {
  const strict = countAllowed(work, seat, led, true);
  const n = strict > 0 ? strict : countAllowed(work, seat, led, false);
  const useStrict = strict > 0;
  if (n === 0) return work.cards[seat * STRIDE] ?? 0;
  const base = seat * STRIDE;
  const len = work.counts[seat] ?? 0;
  let best = work.cards[base] ?? 0;
  let bestRank = 99;
  for (let i = 0; i < len; i += 1) {
    const serial = work.cards[base + i] ?? 0;
    if (!cardAllowed(work, seat, serial, led, useStrict)) continue;
    const rank = RANK_OF[serial % FACES] ?? 0;
    if (rank < bestRank) {
      bestRank = rank;
      best = serial;
    }
  }
  void rng;
  return best;
}

function countAllowed(work: Work, seat: number, led: number, strict: boolean): number {
  const base = seat * STRIDE;
  const len = work.counts[seat] ?? 0;
  let n = 0;
  for (let i = 0; i < len; i += 1) if (cardAllowed(work, seat, work.cards[base + i] ?? 0, led, strict)) n += 1;
  return n;
}

function cardAllowed(work: Work, seat: number, serial: number, led: number, strict: boolean): boolean {
  const face = serial % FACES;
  const suit = SUIT_OF[face] ?? 0;
  const len = work.counts[seat] ?? 0;
  const follow = led < 0 ? 0 : countSuit(work, seat, led);
  if (led >= 0 && follow > 0 && suit !== led) return false;
  if (!strict || !calledRestricted(work, seat, face, led, follow, len)) return true;
  return false;
}

function countSuit(work: Work, seat: number, suit: number): number {
  const base = seat * STRIDE;
  const len = work.counts[seat] ?? 0;
  let n = 0;
  for (let i = 0; i < len; i += 1) if ((SUIT_OF[(work.cards[base + i] ?? 0) % FACES] ?? 0) === suit) n += 1;
  return n;
}

function calledRestricted(work: Work, seat: number, face: number, led: number, follow: number, len: number): boolean {
  if (work.is500 === 0 || seat === work.bidder || len <= 1) return false;
  let open = false;
  for (let slot = 0; slot < work.slotCount; slot += 1) {
    if ((work.slotOwner[slot] ?? -1) < 0 && work.slotFace[slot] === face) open = true;
  }
  if (!open) return false;
  if (led < 0 || (SUIT_OF[face] ?? 0) !== led) return true;
  return follow > 1;
}

function clockwise(work: Work): void {
  for (let slot = 0; slot < work.slotCount; slot += 1) {
    if ((work.slotOwner[slot] ?? -1) >= 0) continue;
    for (let step = 1; step <= work.seats; step += 1) {
      const seat = (work.bidder + step) % work.seats;
      if (seat === work.bidder) continue;
      if (work.dealt0[slot] !== seat && work.dealt1[slot] !== seat) continue;
      work.slotOwner[slot] = seat;
      break;
    }
  }
}

function utility(work: Work): number {
  const team = teamPoints(work);
  const made = team >= work.bid;
  const onTeam = work.actor === work.bidder || onPartner(work, work.actor);
  if (work.actor === work.bidder) {
    const stake = work.bid + work.bonus;
    return (made ? stake : -stake) + team * 0.01;
  }
  if (onTeam) return (made ? work.bid : -work.bid) + team * 0.01;
  return (made ? -work.bid : work.bid) - team * 0.01;
}

function teamPoints(work: Work): number {
  let team = work.points[work.bidder] ?? 0;
  const seen = new Uint8Array(SEATS);
  if (work.is500 === 1) {
    for (let slot = 0; slot < work.slotCount; slot += 1) {
      const seat = work.slotOwner[slot] ?? -1;
      if (seat < 0 || seat === work.bidder || seen[seat] === 1) continue;
      seen[seat] = 1;
      team += work.points[seat] ?? 0;
    }
    return team;
  }
  for (let seat = 0; seat < work.seats; seat += 1) {
    if (work.partner[seat] === 1) team += work.points[seat] ?? 0;
  }
  return team;
}

function onPartner(work: Work, seat: number): boolean {
  if (work.is500 === 0) return work.partner[seat] === 1;
  for (let slot = 0; slot < work.slotCount; slot += 1) if (work.slotOwner[slot] === seat) return true;
  return false;
}

function remaining(work: Work): number {
  let n = 0;
  for (let seat = 0; seat < work.seats; seat += 1) n += work.counts[seat] ?? 0;
  return n;
}

