import {
  type Card,
  type Suit,
  type GameType,
  cardId,
  buildDeck,
  shuffle,
  deal,
  cardPointValue,
  trickWinner,
  isLegalPlay,
  initSlots,
  applyCardToSlots,
  applyClockwiseDefault,
  partnersFromSlots,
  wouldBeSelfReveal,
  scoreHand,
  rulesFor,
  type PlayedCard,
  type PartnerSlot,
} from '@250-500/shared';

export interface GameHand {
  /** Game variant */
  gameType: GameType;
  /** Player ids in seat order (clockwise) */
  seatOrder: readonly string[];
  /** Map playerId -> private hand */
  hands: Record<string, Card[]>;
  /** Current bidder (after auction) */
  bidder: string | null;
  bidAmount: number | null;
  /** Trump suit declared by bidder */
  trump: Suit | null;
  /** Cards bidder called as partners */
  calledCards: Card[];
  /** Partner slot tracking */
  slots: PartnerSlot[];
  /** Set of revealed partner ids (excludes bidder) */
  partners: Set<string>;
  /** Cards played in the current (in-progress) trick */
  currentTrick: PlayedCard[];
  /** Whose turn it is to play */
  toPlayerId: string | null;
  /** Tricks won, mapped to the cards collected by each player team-side
   *  Keyed by playerId: cards collected when THIS player won the trick */
  collected: Record<string, Card[]>;
  /** Tricks completed in this hand */
  trickCount: number;
  /** Hand finished? */
  ended: boolean;
  /** First-played 30-pt card tracking (500): which copy of 3♠ / 3♥ was the first.
   * Records which playerId played the first copy, or null if not played yet. */
  first3sPlayed: { spades: string | null; hearts: string | null };
  /** Initial holders by cardId — captured at deal time for clockwise-default rule.
   * Maps cardId (e.g. "Qh") to the set of playerIds who were dealt that card. */
  holdersByCardId: Map<string, Set<string>>;
}

/** Build a fresh hand state. Optionally pass a seed for deterministic dealing. */
export function startHand(args: {
  gameType: GameType;
  seatOrder: readonly string[];
  /** Player who starts the bidding (typically left of dealer; here just the first) */
  firstBidderId: string;
  seed?: number;
}): GameHand {
  const rules = rulesFor(args.gameType);
  if (args.seatOrder.length !== rules.PLAYER_COUNT) {
    throw new Error(`${args.gameType} requires ${rules.PLAYER_COUNT} players`);
  }
  const deck = shuffle(buildDeck(args.gameType), args.seed);
  const dealt = deal(deck, rules.PLAYER_COUNT);
  const hands: Record<string, Card[]> = {};
  const collected: Record<string, Card[]> = {};
  const holdersByCardId = new Map<string, Set<string>>();
  args.seatOrder.forEach((id, i) => {
    const hand = dealt[i] ?? [];
    hands[id] = hand;
    collected[id] = [];
    for (const c of hand) {
      const k = `${c.rank}${c.suit[0]}`;
      let set = holdersByCardId.get(k);
      if (!set) {
        set = new Set();
        holdersByCardId.set(k, set);
      }
      set.add(id);
    }
  });
  return {
    gameType: args.gameType,
    seatOrder: args.seatOrder,
    hands,
    bidder: null,
    bidAmount: null,
    trump: null,
    calledCards: [],
    slots: [],
    partners: new Set(),
    currentTrick: [],
    toPlayerId: null,
    collected,
    trickCount: 0,
    ended: false,
    first3sPlayed: { spades: null, hearts: null },
    holdersByCardId,
  };
}

/** Set bidder + bid amount (called after the auction closes). */
export function setBidder(state: GameHand, bidder: string, amount: number): GameHand {
  return { ...state, bidder, bidAmount: amount, toPlayerId: bidder };
}

/** Bidder declares trump and called partners. */
export function declareTrumpAndPartners(
  state: GameHand,
  trump: Suit,
  calledCards: readonly Card[],
): GameHand {
  const rules = rulesFor(state.gameType);
  if (calledCards.length !== rules.PARTNERS_TO_CALL) {
    throw new Error(`Need exactly ${rules.PARTNERS_TO_CALL} called cards`);
  }
  return {
    ...state,
    trump,
    calledCards: calledCards.slice(),
    slots: initSlots(calledCards),
  };
}

export type PlayResult =
  | { ok: true; state: GameHand; trickWinnerId: string | null; newPartner: string | null }
  | { ok: false; code: string; message: string };

/** Attempt to play a card. Validates turn, ownership, follow-suit, and 500's no-self-reveal rule. */
export function playCard(state: GameHand, playerId: string, card: Card): PlayResult {
  if (state.ended) return { ok: false, code: 'HAND_OVER', message: 'Hand already complete' };
  if (state.toPlayerId !== playerId)
    return { ok: false, code: 'NOT_YOUR_TURN', message: 'Not your turn' };
  if (!state.trump) return { ok: false, code: 'NOT_DECLARED', message: 'Trump not declared yet' };
  const hand = state.hands[playerId] ?? [];
  const isLeading = state.currentTrick.length === 0;
  const ledSuit = isLeading ? null : state.currentTrick[0]!.card.suit;
  if (!isLegalPlay({ card, hand, ledSuit })) {
    return { ok: false, code: 'ILLEGAL_PLAY', message: 'Card violates follow-suit rules' };
  }
  if (state.gameType === '500') {
    const lastTrick = state.trickCount === rulesFor('500').CARDS_PER_PLAYER - 1;
    if (
      !lastTrick &&
      wouldBeSelfReveal({ playerId, card, isLeadingTrick: isLeading, bidderId: state.bidder!, slots: state.slots })
    ) {
      return { ok: false, code: 'CANNOT_SELF_REVEAL', message: 'You cannot lead a called card to declare yourself partner' };
    }
  }

  const newHand = hand.filter((c) => !(c.suit === card.suit && c.rank === card.rank));
  const newTrick = [...state.currentTrick, { playerId, card }];
  let newSlots = state.slots;
  let newPartners = new Set(state.partners);
  let newPartnerAdded: string | null = null;
  if (state.calledCards.length > 0 && state.bidder) {
    const slotResult = applyCardToSlots({
      playerId,
      card,
      bidderId: state.bidder,
      currentPartners: state.partners,
      slots: state.slots,
    });
    newSlots = slotResult.slots;
    if (slotResult.newPartner) {
      newPartners = new Set([...state.partners, slotResult.newPartner]);
      newPartnerAdded = slotResult.newPartner;
    }
  }
  const newFirst3s = { ...state.first3sPlayed };
  if (card.suit === 'spades' && card.rank === '3' && newFirst3s.spades === null) {
    newFirst3s.spades = playerId;
  }
  if (state.gameType === '500' && card.suit === 'hearts' && card.rank === '3' && newFirst3s.hearts === null) {
    newFirst3s.hearts = playerId;
  }

  const updated: GameHand = {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    currentTrick: newTrick,
    slots: newSlots,
    partners: newPartners,
    first3sPlayed: newFirst3s,
  };

  // Trick complete?
  if (newTrick.length === state.seatOrder.length) {
    const winner = trickWinner(newTrick, state.trump);
    if (!winner) return { ok: false, code: 'INTERNAL_ERROR', message: 'No trick winner' };
    const winnerId = winner.playerId;
    const collected = newTrick.map((p) => p.card);
    const updatedCollected = {
      ...updated.collected,
      [winnerId]: [...(updated.collected[winnerId] ?? []), ...collected],
    };
    const trickCount = state.trickCount + 1;
    const ended = trickCount === rulesFor(state.gameType).CARDS_PER_PLAYER;
    return {
      ok: true,
      state: {
        ...updated,
        currentTrick: [],
        toPlayerId: ended ? null : winnerId,
        collected: updatedCollected,
        trickCount,
        ended,
      },
      trickWinnerId: winnerId,
      newPartner: newPartnerAdded,
    };
  }

  // Advance turn to next seat
  const idx = state.seatOrder.indexOf(playerId);
  const nextId = state.seatOrder[(idx + 1) % state.seatOrder.length];
  return {
    ok: true,
    state: { ...updated, toPlayerId: nextId ?? null },
    trickWinnerId: null,
    newPartner: newPartnerAdded,
  };
}

/** Compute final score for the hand (after all tricks played). Applies clockwise-default
 * for any unfilled partner slots, using the deal-time holder tracking captured in state. */
export function finalizeHand(state: GameHand): {
  bidMade: boolean;
  pointsCollected: number;
  partners: string[];
  scoreDeltas: Record<string, number>;
} {
  if (!state.bidder || state.bidAmount === null) {
    throw new Error('Cannot finalize hand without bidder + bid');
  }

  const finalSlots = applyClockwiseDefault({
    slots: state.slots,
    bidderId: state.bidder,
    seatOrder: state.seatOrder,
    holdersByCardId: state.holdersByCardId,
  });
  const partners = partnersFromSlots(finalSlots, state.bidder);
  const teamIds = new Set([state.bidder, ...partners]);

  // Find which player won the FIRST 3♠ and 3♥ tricks (RULES.md: only first-played counts)
  const collectorOf = (predicate: (c: Card) => boolean): string | null => {
    for (const [pid, cards] of Object.entries(state.collected)) {
      if (cards.some(predicate)) return pid;
    }
    return null;
  };

  let teamPoints = 0;
  for (const playerId of teamIds) {
    for (const card of state.collected[playerId] ?? []) {
      teamPoints += cardPointValue(card);
    }
  }
  // 30-point bonuses, applied ONCE (for the first-played copy only)
  if (state.first3sPlayed.spades) {
    const winner3s = collectorOf((c) => c.suit === 'spades' && c.rank === '3');
    if (winner3s && teamIds.has(winner3s)) teamPoints += 30;
  }
  if (state.gameType === '500' && state.first3sPlayed.hearts) {
    const winner3h = collectorOf((c) => c.suit === 'hearts' && c.rank === '3');
    if (winner3h && teamIds.has(winner3h)) teamPoints += 30;
  }
  void cardId;

  const bidMade = teamPoints >= state.bidAmount;
  const result = scoreHand({
    gameType: state.gameType,
    allPlayerIds: state.seatOrder,
    bidder: state.bidder,
    bidAmount: state.bidAmount,
    partners,
    bidMade,
  });

  return {
    bidMade,
    pointsCollected: teamPoints,
    partners,
    scoreDeltas: result.deltas,
  };
}
