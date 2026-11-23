import { create } from 'zustand';
import {
  chooseBid,
  chooseCalledCards,
  chooseNormalBid,
  chooseNormalPlay,
  choosePlay,
  chooseTrump,
  createRng,
  currentHighBid,
  declareTrumpAndPartners,
  finalizeHand,
  getAuctionWinner,
  isAuctionClosed,
  legalPlaysFor,
  nextBidder,
  playCard,
  rulesFor,
  setBidder,
  startHand,
  toPublicView,
  validateBid,
  validatePass,
  type BidEntry,
  type Card,
  type GameHand,
  type GameType,
  type Suit,
} from '@250-500/shared';

export const HUMAN_ID = 'p1';

export interface SettledTrick {
  plays: Array<{ playerId: string; card: Card }>;
  winnerId: string;
}

export interface LocalSummary {
  bidMade: boolean;
  pointsCollected: number;
  partners: string[];
  bidAmount: number;
  bidder: string;
  scoreDeltas: Record<string, number>;
}

interface LocalPlayState {
  phase: 'setup' | 'bidding' | 'declaring' | 'playing' | 'scored';
  gameType: GameType;
  humanName: string;
  seatOrder: string[];
  names: Record<string, string>;
  hand: GameHand | null;
  bidHistory: BidEntry[];
  firstBidderId: string;
  runningScores: Record<string, number>;
  handsPlayed: number;
  seed: number;
  decision: number;
  summary: LocalSummary | null;
  settledTrick: SettledTrick | null;
  difficulty: 'easy' | 'normal';
  startGame: (gameType: GameType, humanName: string, difficulty?: 'easy' | 'normal') => void;
  bid: (amount: number) => void;
  pass: () => void;
  declare: (trump: Suit, called: Card[]) => void;
  play: (card: Card) => void;
  stepBot: () => void;
  dismissTrick: () => void;
  nextHand: () => void;
  leave: () => void;
}

const SETUP = {
  phase: 'setup' as const,
  gameType: '250' as const,
  humanName: '',
  seatOrder: [] as string[],
  names: {} as Record<string, string>,
  hand: null as GameHand | null,
  bidHistory: [] as BidEntry[],
  firstBidderId: HUMAN_ID,
  runningScores: {} as Record<string, number>,
  handsPlayed: 0,
  seed: 1,
  decision: 0,
  summary: null as LocalSummary | null,
  settledTrick: null as SettledTrick | null,
  difficulty: 'easy' as const,
};

/** Local free-to-play table. The human is seat 1. Bots default to Easy. */
export const useLocalPlayStore = create<LocalPlayState>((set, get) => ({
  ...SETUP,
  startGame: (gameType, humanName, difficulty = 'easy') => {
    const seed = (Date.now() % 100000) + 1;
    const seats = seatIds(gameType);
    const name = humanName.trim() || 'You';
    set({
      ...SETUP,
      gameType,
      humanName: name,
      seatOrder: seats,
      names: nameMap(seats, name),
      runningScores: Object.fromEntries(seats.map((id) => [id, 0])),
      seed,
      phase: 'bidding',
      difficulty,
    });
    get().nextHand();
  },
  nextHand: () => {
    const state = get();
    const seats = state.seatOrder.length > 0 ? state.seatOrder : seatIds(state.gameType);
    const first = seats[state.handsPlayed % seats.length] ?? HUMAN_ID;
    const hand = startHand({
      gameType: state.gameType,
      seatOrder: seats,
      firstBidderId: first,
      seed: state.seed + state.handsPlayed * 97,
    });
    set({ hand, bidHistory: [], firstBidderId: first, phase: 'bidding', summary: null, settledTrick: null, seatOrder: seats });
  },
  bid: (amount) => {
    const state = get();
    if (state.settledTrick) return;
    const auction = auctionOf(state);
    if (nextBidder(auction) !== HUMAN_ID || !validateBid(auction, HUMAN_ID, amount).ok) return;
    set(afterBid(state, [...state.bidHistory, { playerId: HUMAN_ID, action: 'bid', amount }]));
  },
  pass: () => {
    const state = get();
    if (state.settledTrick) return;
    const auction = auctionOf(state);
    if (nextBidder(auction) !== HUMAN_ID || !validatePass(auction, HUMAN_ID).ok) return;
    set(afterBid(state, [...state.bidHistory, { playerId: HUMAN_ID, action: 'pass' }]));
  },
  declare: (trump, called) => {
    const state = get();
    if (!state.hand || state.phase !== 'declaring' || state.hand.bidder !== HUMAN_ID) return;
    set({ hand: declareTrumpAndPartners(state.hand, trump, called), phase: 'playing' });
  },
  play: (card) => {
    const state = get();
    if (!state.hand || state.settledTrick || state.hand.toPlayerId !== HUMAN_ID) return;
    set(applyCard(state, HUMAN_ID, card));
  },
  stepBot: () => {
    const state = get();
    if (!state.hand || state.settledTrick) return;
    if (state.phase === 'bidding') set(botBid(state));
    else if (state.phase === 'declaring') set(botDeclare(state));
    else if (state.phase === 'playing') set(botPlay(state));
  },
  dismissTrick: () => {
    const state = get();
    const finished = state.hand?.ended === true && state.summary !== null;
    set({ settledTrick: null, phase: finished ? 'scored' : state.phase });
  },
  leave: () => set({ ...SETUP }),
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __localPlay?: typeof useLocalPlayStore }).__localPlay = useLocalPlayStore;
}

function seatIds(gameType: GameType): string[] {
  return Array.from({ length: rulesFor(gameType).PLAYER_COUNT }, (_, index) => `p${index + 1}`);
}

function nameMap(seats: string[], humanName: string): Record<string, string> {
  const names: Record<string, string> = {};
  seats.forEach((id, index) => {
    names[id] = id === HUMAN_ID ? humanName : `Bot ${index + 1}`;
  });
  return names;
}

function auctionOf(state: LocalPlayState) {
  return {
    gameType: state.gameType,
    playerIds: state.seatOrder,
    firstBidderId: state.firstBidderId,
    bidHistory: state.bidHistory,
  };
}

function afterBid(state: LocalPlayState, bidHistory: BidEntry[]): Partial<LocalPlayState> {
  const auction = { ...auctionOf(state), bidHistory };
  if (!isAuctionClosed(auction) || !state.hand) return { bidHistory };
  const winner = getAuctionWinner(auction);
  if (!winner) return { bidHistory };
  return { bidHistory, hand: setBidder(state.hand, winner.playerId, winner.amount), phase: 'declaring' };
}

function applyCard(state: LocalPlayState, playerId: string, card: Card): Partial<LocalPlayState> {
  if (!state.hand) return {};
  const completing = state.hand.currentTrick.length + 1 === state.hand.seatOrder.length;
  const snapshot = completing ? [...state.hand.currentTrick, { playerId, card }] : null;
  const result = playCard(state.hand, playerId, card);
  if (!result.ok) return {};
  const settledTrick = result.trickWinnerId && snapshot ? { plays: snapshot, winnerId: result.trickWinnerId } : null;
  const next = scoreIfDone(state, result.state);
  // Keep the table on the trick until the pause ends, including the last trick.
  if (settledTrick && next.phase === 'scored') {
    return { ...next, phase: 'playing', settledTrick, decision: state.decision + 1 };
  }
  return { ...next, settledTrick, decision: state.decision + 1 };
}

function scoreIfDone(state: LocalPlayState, hand: GameHand): Partial<LocalPlayState> {
  if (!hand.ended || !hand.bidder || hand.bidAmount === null) return { hand };
  const fin = finalizeHand(hand);
  const runningScores = { ...state.runningScores };
  for (const [id, delta] of Object.entries(fin.scoreDeltas)) runningScores[id] = (runningScores[id] ?? 0) + delta;
  return {
    hand,
    phase: 'scored',
    runningScores,
    handsPlayed: state.handsPlayed + 1,
    summary: {
      bidMade: fin.bidMade,
      pointsCollected: fin.pointsCollected,
      partners: fin.partners,
      bidAmount: hand.bidAmount,
      bidder: hand.bidder,
      scoreDeltas: fin.scoreDeltas,
    },
  };
}

function botBid(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand) return {};
  const auction = auctionOf(state);
  if (isAuctionClosed(auction)) return afterBid(state, state.bidHistory);
  const turn = nextBidder(auction);
  if (!turn || turn === HUMAN_ID) return {};
  const bidArgs = {
    gameType: state.gameType,
    hand: state.hand.hands[turn] ?? [],
    highBid: currentHighBid(state.bidHistory)?.amount ?? null,
    rng: createRng(state.seed + state.decision + 1),
  };
  const decision = state.difficulty === 'normal' ? chooseNormalBid(bidArgs) : chooseBid(bidArgs);
  const bidHistory = [...state.bidHistory];
  if (decision.action === 'bid' && typeof decision.amount === 'number' && validateBid(auction, turn, decision.amount).ok) {
    bidHistory.push({ playerId: turn, action: 'bid', amount: decision.amount });
  } else if (validatePass(auction, turn).ok) {
    bidHistory.push({ playerId: turn, action: 'pass' });
  } else return {};
  return { ...afterBid(state, bidHistory), decision: state.decision + 1 };
}

function botDeclare(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand?.bidder || state.hand.bidder === HUMAN_ID) return {};
  const cards = state.hand.hands[state.hand.bidder] ?? [];
  const trump = chooseTrump(cards);
  return {
    hand: declareTrumpAndPartners(state.hand, trump, chooseCalledCards(cards, trump, state.gameType)),
    phase: 'playing',
  };
}

function botPlay(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand?.toPlayerId || state.hand.toPlayerId === HUMAN_ID || !state.hand.trump) return {};
  const turn = state.hand.toPlayerId;
  const legal = legalPlaysFor(state.hand, turn);
  const first = legal[0];
  if (!first) return {};
  const rng = createRng(state.seed + state.decision + 3);
  const view = toPublicView(state.hand, turn);
  const card = state.difficulty === 'normal' ? chooseNormalPlay({ view, legal, rng }) : choosePlay(legal, { ...view, rng });
  return applyCard(state, turn, card);
}
