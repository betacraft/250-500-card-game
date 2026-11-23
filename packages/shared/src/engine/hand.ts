import type { Card, Suit } from '../cards/types';
import { buildDeck, cardPointValue, deal, shuffle } from '../cards/deck';
import { removeOneCard } from '../cards/remove-one';
import type { GameType } from '../games/types';
import { rulesFor } from '../games';
import { partnersFromCalledHolders } from '../partners/deal-partners';
import {
  applyCardToSlots,
  applyClockwiseDefault,
  DEFAULT_CLOCKWISE_FLAG,
  initSlots,
  partnersFromSlots,
  type ClockwiseDefaultFlag,
  type PartnerSlot,
} from '../partners/slots';
import { scoreHand } from '../scoring/score-hand';
import { canPlayCard, listLegalCards, type LegalPlayContext } from '../legal/legal-moves';
import { trickWinner, type PlayedCard } from '../trick/winner';

export interface GameHand {
  gameType: GameType;
  seatOrder: readonly string[];
  hands: Record<string, Card[]>;
  bidder: string | null;
  bidAmount: number | null;
  trump: Suit | null;
  calledCards: Card[];
  /** 500 only. 250 leaves this empty. */
  slots: PartnerSlot[];
  /** Revealed 500 partners, or 250 partners fixed at declaration. Excludes the bidder. */
  partners: Set<string>;
  currentTrick: PlayedCard[];
  toPlayerId: string | null;
  collected: Record<string, Card[]>;
  trickCount: number;
  ended: boolean;
  /** Who played the first premium 3. Informational. Scoring uses `premiumWinner`. */
  first3sPlayed: { spades: string | null; hearts: string | null };
  /** Trick winner who captured the first 3♠ / first 3♥. That win is worth 30. */
  premiumWinner: { spades: string | null; hearts: string | null };
  holdersByCardId: Map<string, Set<string>>;
}

export type PlayResult =
  | { ok: true; state: GameHand; trickWinnerId: string | null; newPartner: string | null }
  | { ok: false; code: string; message: string };

/** Build a fresh hand state. Pass a seed for a deterministic deal. */
export function startHand(args: {
  gameType: GameType;
  seatOrder: readonly string[];
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
    for (const card of hand) {
      const key = `${card.rank}${card.suit[0]}`;
      const set = holdersByCardId.get(key) ?? new Set<string>();
      set.add(id);
      holdersByCardId.set(key, set);
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
    premiumWinner: { spades: null, hearts: null },
    holdersByCardId,
  };
}

/** Set bidder and bid amount after the auction closes. Bidder leads. */
export function setBidder(state: GameHand, bidder: string, amount: number): GameHand {
  return { ...state, bidder, bidAmount: amount, toPlayerId: bidder };
}

/** Bidder names trump. 250 partners are the dealt holders. 500 opens empty slots. */
export function declareTrumpAndPartners(
  state: GameHand,
  trump: Suit,
  calledCards: readonly Card[],
): GameHand {
  const rules = rulesFor(state.gameType);
  if (!state.bidder) throw new Error('Cannot declare before a bidder is set');
  if (calledCards.length !== rules.PARTNERS_TO_CALL) {
    throw new Error(`Need exactly ${rules.PARTNERS_TO_CALL} called cards`);
  }
  const faces = new Set(calledCards.map((card) => `${card.rank}${card.suit}`));
  if (faces.size !== calledCards.length) throw new Error('Called cards must be different faces');
  if (state.gameType === '250') {
    const partners = partnersFromCalledHolders({
      calledCards,
      bidderId: state.bidder,
      holdersByCardId: state.holdersByCardId,
    });
    return {
      ...state,
      trump,
      calledCards: calledCards.slice(),
      slots: [],
      partners: new Set(partners),
    };
  }
  return {
    ...state,
    trump,
    calledCards: calledCards.slice(),
    slots: initSlots(calledCards),
    partners: new Set(),
  };
}

/** Legal plays for the seat that is about to act, from the current hand. */
export function legalPlaysFor(state: GameHand, playerId: string): Card[] {
  return listLegalCards(legalContext(state, playerId));
}

/** Play one card. Removes a single physical copy. 250 does not touch partner slots. */
export function playCard(state: GameHand, playerId: string, card: Card): PlayResult {
  const rejected = rejectPlay(state, playerId, card);
  if (rejected) return rejected;
  const hand = state.hands[playerId] ?? [];
  const slotUpdate = apply500Slot(state, playerId, card);
  const updated = applyPlayedCard(state, playerId, card, removeOneCard(hand, card), slotUpdate);
  if (updated.currentTrick.length !== state.seatOrder.length) {
    return advanceSeat(updated, playerId, slotUpdate.newPartner);
  }
  return finishTrick(updated, slotUpdate.newPartner);
}

export interface FinalizeOptions {
  clockwise?: ClockwiseDefaultFlag;
}

/** Score the hand. 250 uses declaration partners. 500 applies clockwise default. */
export function finalizeHand(state: GameHand, options?: FinalizeOptions): {
  bidMade: boolean;
  pointsCollected: number;
  partners: string[];
  scoreDeltas: Record<string, number>;
} {
  if (!state.bidder || state.bidAmount === null) {
    throw new Error('Cannot finalize hand without bidder + bid');
  }
  const partners = resolvedPartners(state, options?.clockwise ?? DEFAULT_CLOCKWISE_FLAG);
  const teamIds = new Set([state.bidder, ...partners]);
  const teamPoints = pointsForPlayers(state, teamIds);
  const bidMade = teamPoints >= state.bidAmount;
  const result = scoreHand({
    gameType: state.gameType,
    allPlayerIds: state.seatOrder,
    bidder: state.bidder,
    bidAmount: state.bidAmount,
    partners,
    bidMade,
  });
  return { bidMade, pointsCollected: teamPoints, partners, scoreDeltas: result.deltas };
}

/** Face values of collected cards plus 30 for each premium trick already won. */
export function playedPointTotal(state: GameHand): number {
  const everyone = new Set(state.seatOrder);
  return pointsForPlayers(state, everyone);
}

/** Cards still in hands, in the current trick, or in won piles. */
export function physicalCardCount(state: GameHand): number {
  let count = state.currentTrick.length;
  for (const id of state.seatOrder) {
    count += state.hands[id]?.length ?? 0;
    count += state.collected[id]?.length ?? 0;
  }
  return count;
}

function legalContext(state: GameHand, playerId: string): LegalPlayContext {
  const isLeading = state.currentTrick.length === 0;
  const first = state.currentTrick[0];
  return {
    gameType: state.gameType,
    hand: state.hands[playerId] ?? [],
    ledSuit: !isLeading && first ? first.card.suit : null,
    isLeading,
    playerId,
    bidderId: state.bidder,
    slots: state.slots,
    trickCount: state.trickCount,
    cardsPerPlayer: rulesFor(state.gameType).CARDS_PER_PLAYER,
  };
}

function rejectPlay(state: GameHand, playerId: string, card: Card): PlayResult | null {
  if (state.ended) return { ok: false, code: 'HAND_OVER', message: 'Hand already complete' };
  if (state.toPlayerId !== playerId) return { ok: false, code: 'NOT_YOUR_TURN', message: 'Not your turn' };
  if (!state.trump) return { ok: false, code: 'NOT_DECLARED', message: 'Trump not declared yet' };
  const hand = state.hands[playerId] ?? [];
  const inHand = card.id
    ? hand.some((c) => c.id === card.id)
    : hand.some((c) => c.suit === card.suit && c.rank === card.rank);
  if (!inHand) return { ok: false, code: 'ILLEGAL_PLAY', message: 'Card is not in hand' };
  if (!canPlayCard(legalContext(state, playerId), card)) {
    const leadBan = state.gameType === '500' && state.currentTrick.length === 0;
    return leadBan
      ? { ok: false, code: 'CANNOT_SELF_REVEAL', message: 'You cannot lead a called card to declare yourself partner' }
      : { ok: false, code: 'ILLEGAL_PLAY', message: 'Card violates follow-suit rules' };
  }
  return null;
}

function apply500Slot(
  state: GameHand,
  playerId: string,
  card: Card,
): { slots: PartnerSlot[]; partners: Set<string>; newPartner: string | null } {
  if (state.gameType !== '500' || !state.bidder || state.calledCards.length === 0) {
    return { slots: state.slots, partners: state.partners, newPartner: null };
  }
  const slotResult = applyCardToSlots({
    playerId,
    card,
    bidderId: state.bidder,
    currentPartners: state.partners,
    slots: state.slots,
  });
  const partners = new Set(state.partners);
  if (slotResult.newPartner) partners.add(slotResult.newPartner);
  return { slots: slotResult.slots, partners, newPartner: slotResult.newPartner };
}

function markPlayedPremium(state: GameHand, playerId: string, card: Card): GameHand['first3sPlayed'] {
  const next = { ...state.first3sPlayed };
  if (card.suit === 'spades' && card.rank === '3' && next.spades === null) next.spades = playerId;
  if (state.gameType === '500' && card.suit === 'hearts' && card.rank === '3' && next.hearts === null) {
    next.hearts = playerId;
  }
  return next;
}

function applyPlayedCard(
  state: GameHand,
  playerId: string,
  card: Card,
  hand: Card[],
  slots: { slots: PartnerSlot[]; partners: Set<string> },
): GameHand {
  return {
    ...state,
    hands: { ...state.hands, [playerId]: hand },
    currentTrick: [...state.currentTrick, { playerId, card }],
    slots: slots.slots,
    partners: slots.partners,
    first3sPlayed: markPlayedPremium(state, playerId, card),
  };
}

function advanceSeat(state: GameHand, playerId: string, newPartner: string | null): PlayResult {
  const idx = state.seatOrder.indexOf(playerId);
  const nextId = state.seatOrder[(idx + 1) % state.seatOrder.length] ?? null;
  return { ok: true, state: { ...state, toPlayerId: nextId }, trickWinnerId: null, newPartner };
}

function finishTrick(state: GameHand, newPartner: string | null): PlayResult {
  if (!state.trump) return { ok: false, code: 'NOT_DECLARED', message: 'Trump not declared yet' };
  const winner = trickWinner(state.currentTrick, state.trump);
  if (!winner) return { ok: false, code: 'INTERNAL_ERROR', message: 'No trick winner' };
  const winnerId = winner.playerId;
  const collected = state.currentTrick.map((play) => play.card);
  const trickCount = state.trickCount + 1;
  const ended = trickCount === rulesFor(state.gameType).CARDS_PER_PLAYER;
  return {
    ok: true,
    trickWinnerId: winnerId,
    newPartner,
    state: {
      ...state,
      currentTrick: [],
      toPlayerId: ended ? null : winnerId,
      collected: {
        ...state.collected,
        [winnerId]: [...(state.collected[winnerId] ?? []), ...collected],
      },
      trickCount,
      ended,
      premiumWinner: awardPremium(state, winnerId),
    },
  };
}

function awardPremium(state: GameHand, winnerId: string): GameHand['premiumWinner'] {
  const next = { ...state.premiumWinner };
  const has = (suit: Suit): boolean => state.currentTrick.some((play) => play.card.suit === suit && play.card.rank === '3');
  if (next.spades === null && has('spades')) next.spades = winnerId;
  if (state.gameType === '500' && next.hearts === null && has('hearts')) next.hearts = winnerId;
  return next;
}

function resolvedPartners(state: GameHand, flag: ClockwiseDefaultFlag): string[] {
  if (!state.bidder) return [];
  if (state.gameType === '250') return [...state.partners].filter((id) => id !== state.bidder);
  const slots = applyClockwiseDefault({
    slots: state.slots,
    bidderId: state.bidder,
    seatOrder: state.seatOrder,
    holdersByCardId: state.holdersByCardId,
    flag,
  });
  return partnersFromSlots(slots, state.bidder);
}

function pointsForPlayers(state: GameHand, teamIds: ReadonlySet<string>): number {
  let points = 0;
  for (const playerId of teamIds) {
    for (const card of state.collected[playerId] ?? []) points += cardPointValue(card);
  }
  if (state.premiumWinner.spades && teamIds.has(state.premiumWinner.spades)) points += 30;
  if (state.gameType === '500' && state.premiumWinner.hearts && teamIds.has(state.premiumWinner.hearts)) points += 30;
  return points;
}
