import { create } from 'zustand';
import {
  chooseBid,
  chooseCalledCards,
  chooseNormalBid,
  chooseNormalDeclaration,
  chooseNormalPlay,
  choosePlay,
  chooseTrump,
  createRng,
  currentHighBid,
  declareTrumpAndPartners,
  finalizeHand,
  gameWinners,
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
import { currentTarget, localNames, localSeatIds } from '../analytics/local-target';
import { closedBid, noteAbandoned, noteBidResult, noteCardsCalled, noteGameComplete, noteGameStart, noteHandComplete, noteHandStart, noteNewGame, scoresWithPending, tableWinner } from '../analytics/table-events';

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
  targetScore: number;
  gameOver: boolean;
  startGame: (gameType: GameType, humanName: string, difficulty?: 'easy' | 'normal') => void;
  bid: (amount: number) => void;
  pass: () => void;
  declare: (trump: Suit, called: Card[]) => void;
  play: (card: Card) => void;
  stepBot: () => void;
  dismissTrick: () => void;
  nextHand: () => void;
  leave: (reason?: 'new_game' | 'home') => void;
  playAgain: () => void;
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
  targetScore: 1000,
  gameOver: false,
};

/** Local free-to-play table. The human is seat 1. Bots default to Easy. */
export const useLocalPlayStore = create<LocalPlayState>((set, get) => ({
  ...SETUP,
  startGame: (gameType, humanName, difficulty = 'easy') => {
    const seed = (Date.now() % 100000) + 1;
    const seats = localSeatIds(rulesFor(gameType).PLAYER_COUNT);
    const name = humanName.trim() || 'You';
    set({
      ...SETUP,
      gameType,
      humanName: name,
      seatOrder: seats,
      names: localNames(seats, HUMAN_ID, name),
      runningScores: Object.fromEntries(seats.map((id) => [id, 0])),
      seed,
      phase: 'bidding',
      difficulty,
      targetScore: currentTarget(),
      gameOver: false,
    });
    noteGameStart(gameType, difficulty);
    get().nextHand();
  },
  nextHand: () => {
    const state = get();
    if (state.gameOver) return;
    const seats = state.seatOrder.length > 0 ? state.seatOrder : localSeatIds(rulesFor(state.gameType).PLAYER_COUNT);
    const first = seats[state.handsPlayed % seats.length] ?? HUMAN_ID;
    const hand = startHand({
      gameType: state.gameType,
      seatOrder: seats,
      firstBidderId: first,
      seed: state.seed + state.handsPlayed * 97,
    });
    set({ hand, bidHistory: [], firstBidderId: first, phase: 'bidding', summary: null, settledTrick: null, seatOrder: seats });
    noteHandStart();
  },
  bid: (amount) => {
    const state = get();
    if (state.settledTrick) return;
    const auction = auctionOf(state);
    if (nextBidder(auction) !== HUMAN_ID || !validateBid(auction, HUMAN_ID, amount).ok) return;
    const next = afterBid(state, [...state.bidHistory, { playerId: HUMAN_ID, action: 'bid', amount }]);
    set(next);
    noteBidResult('bid', amount, closedBid(next.phase, next.hand?.bidder, next.hand?.bidAmount, HUMAN_ID));
  },
  pass: () => {
    const state = get();
    if (state.settledTrick) return;
    const auction = auctionOf(state);
    if (nextBidder(auction) !== HUMAN_ID || !validatePass(auction, HUMAN_ID).ok) return;
    const next = afterBid(state, [...state.bidHistory, { playerId: HUMAN_ID, action: 'pass' }]);
    set(next);
    noteBidResult('pass', null, closedBid(next.phase, next.hand?.bidder, next.hand?.bidAmount, HUMAN_ID));
  },
  declare: (trump, called) => {
    const state = get();
    if (!state.hand || state.phase !== 'declaring' || state.hand.bidder !== HUMAN_ID) return;
    set({ hand: declareTrumpAndPartners(state.hand, trump, called), phase: 'playing' });
    noteCardsCalled(called.length);
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
    if (!finished || !state.summary) {
      set({ settledTrick: null });
      return;
    }
    if (state.gameOver) {
      set({ settledTrick: null });
      return;
    }
    const runningScores = { ...state.runningScores };
    for (const [id, delta] of Object.entries(state.summary.scoreDeltas)) {
      runningScores[id] = (runningScores[id] ?? 0) + delta;
    }
    const ended = gameWinners(runningScores, state.targetScore).length > 0;
    if (ended) {
      const result = tableWinner(runningScores, HUMAN_ID);
      noteGameComplete(result.winner, result.humanScore, state.handsPlayed);
    }
    set({ settledTrick: null, phase: 'scored', runningScores, gameOver: ended });
  },
  leave: (reason = 'new_game') => {
    const state = get();
    if (state.phase !== 'setup' && !state.gameOver) {
      const pending = state.summary && state.phase !== 'scored' ? state.summary.scoreDeltas : null;
      const scores = scoresWithPending(state.runningScores, pending, false);
      noteAbandoned(state.handsPlayed, scores[HUMAN_ID] ?? 0, reason);
    }
    if (state.phase !== 'setup') noteNewGame();
    set({ ...SETUP });
  },
  playAgain: () => {
    const state = get();
    if (!state.gameOver) return;
    const seed = (Date.now() % 100000) + 1;
    const seats = localSeatIds(rulesFor(state.gameType).PLAYER_COUNT);
    const name = state.humanName.trim() || 'You';
    set({
      ...SETUP,
      gameType: state.gameType,
      humanName: name,
      seatOrder: seats,
      names: localNames(seats, HUMAN_ID, name),
      runningScores: Object.fromEntries(seats.map((id) => [id, 0])),
      seed,
      phase: 'bidding',
      difficulty: state.difficulty,
      targetScore: state.targetScore,
      gameOver: false,
    });
    noteGameStart(state.gameType, state.difficulty, true);
    get().nextHand();
  },
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __localPlay?: typeof useLocalPlayStore }).__localPlay = useLocalPlayStore;
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
  const summary = next.summary;
  if (summary && !state.summary) {
    noteHandComplete(summary.bidMade, summary.bidAmount, summary.pointsCollected, summary.bidder === HUMAN_ID, state.handsPlayed === 0);
  }
  if (settledTrick && next.phase === 'scored') {
    return { ...next, runningScores: state.runningScores, phase: 'playing', settledTrick, decision: state.decision + 1 };
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
  const last = bidHistory[bidHistory.length - 1];
  const next = { ...afterBid(state, bidHistory), decision: state.decision + 1 };
  if (last && last.action === 'bid') noteBidResult('bid', last.amount ?? null, closedBid(next.phase, next.hand?.bidder, next.hand?.bidAmount, HUMAN_ID));
  else noteBidResult('pass', null, closedBid(next.phase, next.hand?.bidder, next.hand?.bidAmount, HUMAN_ID));
  return next;
}

function botDeclare(state: LocalPlayState): Partial<LocalPlayState> {
  if (!state.hand?.bidder || state.hand.bidder === HUMAN_ID) return {};
  const cards = state.hand.hands[state.hand.bidder] ?? [];
  const trump = chooseTrump(cards);
  const choice = state.difficulty === 'normal'
    ? chooseNormalDeclaration(cards, state.gameType)
    : { trump, called: chooseCalledCards(cards, trump, state.gameType) };
  noteCardsCalled(choice.called.length);
  return { hand: declareTrumpAndPartners(state.hand, choice.trump, choice.called), phase: 'playing' };
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
