import { create } from 'zustand';
import {
  chooseBid,
  chooseCalledCards,
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
  validateBid,
  validatePass,
  type BidEntry,
  type Card,
  type GameHand,
  type GameType,
  type PlayView,
  type Suit,
} from '@250-500/shared';

export const HUMAN_ID = 'p1';

export interface LocalSummary {
  bidMade: boolean;
  pointsCollected: number;
  partners: string[];
  bidAmount: number;
  bidder: string;
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
  startGame: (gameType: GameType, humanName: string) => void;
  bid: (amount: number) => void;
  pass: () => void;
  declare: (trump: Suit, called: Card[]) => void;
  play: (card: Card) => void;
  stepBot: () => void;
  nextHand: () => void;
  leave: () => void;
}

const SETUP: Pick<
  LocalPlayState,
  'phase' | 'gameType' | 'humanName' | 'seatOrder' | 'names' | 'hand' | 'bidHistory' | 'firstBidderId' | 'runningScores' | 'handsPlayed' | 'seed' | 'decision' | 'summary'
> = {
  phase: 'setup',
  gameType: '250',
  humanName: '',
  seatOrder: [],
  names: {},
  hand: null,
  bidHistory: [],
  firstBidderId: HUMAN_ID,
  runningScores: {},
  handsPlayed: 0,
  seed: 1,
  decision: 0,
  summary: null,
};

/** Local free-to-play table. The human is seat 1. Everyone else is an Easy bot. */
export const useLocalPlayStore = create<LocalPlayState>((set, get) => ({
  ...SETUP,
  startGame: (gameType, humanName) => {
    const seed = (Date.now() % 100000) + 1;
    const seats = seatIds(gameType);
    set({
      ...SETUP,
      gameType,
      humanName: humanName.trim() || 'You',
      seatOrder: seats,
      names: nameMap(seats, humanName.trim() || 'You'),
      runningScores: Object.fromEntries(seats.map((id) => [id, 0])),
      seed,
      phase: 'bidding',
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
    set({ hand, bidHistory: [], firstBidderId: first, phase: 'bidding', summary: null, seatOrder: seats });
  },
  bid: (amount) => {
    const state = get();
    const auction = auctionOf(state);
    if (nextBidder(auction) !== HUMAN_ID || !validateBid(auction, HUMAN_ID, amount).ok) return;
    set(afterBid(state, [...state.bidHistory, { playerId: HUMAN_ID, action: 'bid', amount }]));
  },
  pass: () => {
    const state = get();
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
    if (!state.hand || state.hand.toPlayerId !== HUMAN_ID) return;
    const result = playCard(state.hand, HUMAN_ID, card);
    if (!result.ok) return;
    set(afterPlay(state, result.state));
  },
  stepBot: () => {
    const state = get();
    if (!state.hand) return;
    if (state.phase === 'bidding') set(botBid(state));
    else if (state.phase === 'declaring') set(botDeclare(state));
    else if (state.phase === 'playing') set(botPlay(state));
  },
  leave: () => set({ ...SETUP }),
}));

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

function afterPlay(state: LocalPlayState, hand: GameHand): Partial<LocalPlayState> {
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
    },
  };
}

function botBid(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand) return {};
  const auction = auctionOf(state);
  if (isAuctionClosed(auction)) return afterBid(state, state.bidHistory);
  const turn = nextBidder(auction);
  if (!turn || turn === HUMAN_ID) return {};
  const rng = createRng(state.seed + state.decision + 1);
  const decision = chooseBid({
    gameType: state.gameType,
    hand: state.hand.hands[turn] ?? [],
    highBid: currentHighBid(state.bidHistory)?.amount ?? null,
    rng,
  });
  const bidHistory = [...state.bidHistory];
  if (decision.action === 'bid' && typeof decision.amount === 'number' && validateBid(auction, turn, decision.amount).ok) {
    bidHistory.push({ playerId: turn, action: 'bid', amount: decision.amount });
  } else if (validatePass(auction, turn).ok) {
    bidHistory.push({ playerId: turn, action: 'pass' });
  } else {
    return {};
  }
  return { ...afterBid(state, bidHistory), decision: state.decision + 1 };
}

function botDeclare(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand || state.hand.bidder === HUMAN_ID || !state.hand.bidder) return {};
  const cards = state.hand.hands[state.hand.bidder] ?? [];
  const trump = chooseTrump(cards);
  return { hand: declareTrumpAndPartners(state.hand, trump, chooseCalledCards(cards, trump, state.gameType)), phase: 'playing' };
}

function botPlay(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand || !state.hand.toPlayerId || state.hand.toPlayerId === HUMAN_ID || !state.hand.trump) return {};
  const turn = state.hand.toPlayerId;
  const legal = legalPlaysFor(state.hand, turn);
  const first = legal[0];
  if (!first) return {};
  const rng = createRng(state.seed + state.decision + 3);
  const card = choosePlay(legal, playView(state.hand, turn, rng));
  const result = playCard(state.hand, turn, card);
  if (!result.ok) return {};
  return { ...afterPlay(state, result.state), decision: state.decision + 1 };
}

function playView(hand: GameHand, selfId: string, rng: () => number): PlayView {
  const team = new Set([hand.bidder ?? '', ...hand.partners]);
  let teamPoints = 0;
  for (const id of team) {
    for (const card of hand.collected[id] ?? []) teamPoints += face(card);
  }
  if (hand.premiumWinner.spades && team.has(hand.premiumWinner.spades)) teamPoints += 30;
  if (hand.gameType === '500' && hand.premiumWinner.hearts && team.has(hand.premiumWinner.hearts)) teamPoints += 30;
  return {
    gameType: hand.gameType,
    selfId,
    bidderId: hand.bidder ?? selfId,
    trump: hand.trump ?? 'spades',
    slots: hand.slots,
    partners: [...hand.partners],
    seatOrder: hand.seatOrder,
    currentTrick: hand.currentTrick,
    trickCount: hand.trickCount,
    cardsPerPlayer: rulesFor(hand.gameType).CARDS_PER_PLAYER,
    teamPoints,
    bidAmount: hand.bidAmount ?? 0,
    premiumAwarded: { spades: hand.premiumWinner.spades !== null, hearts: hand.premiumWinner.hearts !== null },
    rng,
  };
}

function face(card: Card): number {
  if (card.rank === 'A' || card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10') return 10;
  if (card.rank === '5') return 5;
  return 0;
}
