import {
  type GameType,
  type Card,
  type BidEntry,
  type Suit,
  cardId,
  rulesFor,
  isAuctionClosed,
  getAuctionWinner,
  validateBid,
  validatePass,
} from '@250-500/shared';
import {
  startHand,
  setBidder as engineSetBidder,
  declareTrumpAndPartners,
  playCard,
  finalizeHand,
  type GameHand,
} from './engine';

export interface RoomGameState {
  gameType: GameType;
  seatOrder: string[];
  /** Player who starts the auction this hand (rotates each hand) */
  firstBidderId: string;
  bidHistory: BidEntry[];
  hand: GameHand | null;
  /** Running cumulative scores across hands */
  runningScores: Record<string, number>;
  handsPlayed: number;
  /** Phase tracker for the FE */
  phase: 'lobby' | 'bidding' | 'declaring' | 'playing' | 'scored';
  /** Seed for deterministic test play (optional) */
  seed?: number;
}

/** Initialize fresh per-room game state (running scores zeroed, no hand yet). */
export function initRoomGame(args: {
  gameType: GameType;
  seatOrder: string[];
  seed?: number;
}): RoomGameState {
  return {
    gameType: args.gameType,
    seatOrder: args.seatOrder,
    firstBidderId: args.seatOrder[0]!,
    bidHistory: [],
    hand: null,
    runningScores: Object.fromEntries(args.seatOrder.map((id) => [id, 0])),
    handsPlayed: 0,
    phase: 'lobby',
    seed: args.seed,
  };
}

/** Begin a new hand: deal cards, rotate firstBidder per hand (clockwise from initial dealer). */
/** Deal a fresh hand. Rotates firstBidderId clockwise per hand. */
export function beginHand(state: RoomGameState): RoomGameState {
  const startIdx = state.handsPlayed % state.seatOrder.length;
  const firstBidderId = state.seatOrder[startIdx]!;
  const hand = startHand({
    gameType: state.gameType,
    seatOrder: state.seatOrder,
    firstBidderId,
    seed: state.seed,
  });
  return { ...state, hand, phase: 'bidding', bidHistory: [], firstBidderId };
}

export type BidActionResult =
  | { ok: true; state: RoomGameState; auctionClosed: boolean }
  | { ok: false; code: string; message: string };

/** Record a player's bid. Auto-closes the auction if N-1 have passed. */
export function recordBid(state: RoomGameState, playerId: string, amount: number): BidActionResult {
  const auctionState = {
    gameType: state.gameType,
    playerIds: state.seatOrder,
    firstBidderId: state.firstBidderId,
    bidHistory: state.bidHistory,
  };
  const v = validateBid(auctionState, playerId, amount);
  if (!v.ok) return { ok: false, code: v.code, message: v.message };
  const entry: BidEntry = { playerId, action: 'bid', amount };
  const next = { ...state, bidHistory: [...state.bidHistory, entry] };
  const closed = isAuctionClosed({ ...auctionState, bidHistory: next.bidHistory });
  if (closed) {
    const winner = getAuctionWinner({ ...auctionState, bidHistory: next.bidHistory });
    if (winner && next.hand) {
      next.hand = engineSetBidder(next.hand, winner.playerId, winner.amount);
      next.phase = 'declaring';
    }
  }
  return { ok: true, state: next, auctionClosed: closed };
}

/** Record a player's pass. Auto-closes the auction if N-1 have passed. */
export function recordPass(state: RoomGameState, playerId: string): BidActionResult {
  const auctionState = {
    gameType: state.gameType,
    playerIds: state.seatOrder,
    firstBidderId: state.firstBidderId,
    bidHistory: state.bidHistory,
  };
  const v = validatePass(auctionState, playerId);
  if (!v.ok) return { ok: false, code: v.code, message: v.message };
  const entry: BidEntry = { playerId, action: 'pass' };
  const next = { ...state, bidHistory: [...state.bidHistory, entry] };
  const closed = isAuctionClosed({ ...auctionState, bidHistory: next.bidHistory });
  if (closed) {
    const winner = getAuctionWinner({ ...auctionState, bidHistory: next.bidHistory });
    if (winner && next.hand) {
      next.hand = engineSetBidder(next.hand, winner.playerId, winner.amount);
      next.phase = 'declaring';
    }
  }
  return { ok: true, state: next, auctionClosed: closed };
}

export type DeclareResult =
  | { ok: true; state: RoomGameState }
  | { ok: false; code: string; message: string };

/** Bidder declares trump + called partner cards. */
export function declare(
  state: RoomGameState,
  playerId: string,
  trump: Suit,
  calledCards: readonly Card[],
): DeclareResult {
  if (!state.hand) return { ok: false, code: 'INVALID_PHASE', message: 'No hand in progress' };
  if (state.hand.bidder !== playerId)
    return { ok: false, code: 'NOT_BIDDER', message: 'Only the bidder can declare' };
  const rules = rulesFor(state.gameType);
  if (calledCards.length !== rules.PARTNERS_TO_CALL)
    return { ok: false, code: 'INVALID_CALLED', message: `Need ${rules.PARTNERS_TO_CALL} called cards` };
  const updated = declareTrumpAndPartners(state.hand, trump, calledCards);
  return { ok: true, state: { ...state, hand: updated, phase: 'playing' } };
}

export type PlayResult =
  | { ok: true; state: RoomGameState; trickWinnerId: string | null; newPartner: string | null; handEnded: boolean; breakdown: { bidMade: boolean; pointsCollected: number; partners: string[]; scoreDeltas: Record<string, number> } | null }
  | { ok: false; code: string; message: string };

/** Current player plays a card. Returns trick winner + new partner if applicable, plus score breakdown if hand ended. */
export function play(state: RoomGameState, playerId: string, card: Card): PlayResult {
  if (!state.hand) return { ok: false, code: 'INVALID_PHASE', message: 'No hand in progress' };
  const result = playCard(state.hand, playerId, card);
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  const next: RoomGameState = { ...state, hand: result.state };
  let breakdown: { bidMade: boolean; pointsCollected: number; partners: string[]; scoreDeltas: Record<string, number> } | null = null;
  if (result.state.ended) {
    breakdown = finalizeHand(result.state);
    next.runningScores = Object.fromEntries(
      Object.entries(state.runningScores).map(([id, s]) => [id, s + (breakdown!.scoreDeltas[id] ?? 0)]),
    );
    next.handsPlayed = state.handsPlayed + 1;
    next.phase = 'scored';
  }
  void cardId;
  return {
    ok: true,
    state: next,
    trickWinnerId: result.trickWinnerId,
    newPartner: result.newPartner,
    handEnded: result.state.ended,
    breakdown,
  };
}

/** Finalize for clients: returns score breakdown to broadcast via game:hand-scored. */
export function getScoreBreakdown(state: RoomGameState): { bidMade: boolean; pointsCollected: number; partners: string[]; scoreDeltas: Record<string, number> } | null {
  if (!state.hand || !state.hand.ended) return null;
  return finalizeHand(state.hand);
}
