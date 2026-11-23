import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cardId, cardInstanceKey, illegalReason, legalPlaysFor, nextBidder, rulesFor, visiblePartners, type Card, type GameType, type Suit } from '@250-500/shared';
import { BiddingFlow } from '../components/shared/BiddingFlow';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { SuitIcon } from '../components/shared/SuitIcon';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { CardFace } from '../components/cards/CardFace';
import { HandFan } from '../components/cards/HandFan';
import { TrickArea } from '../components/online/TrickArea';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';
import { AuctionRecap, ScoreStrip, privateNotice, scoreExplainer } from './local-table-notes';

/** Free local table: one human and five or seven Easy bots. No coins, no stakes. */
export function LocalPlayPage(): JSX.Element {
  const phase = useLocalPlayStore((s) => s.phase);
  const gameType = useLocalPlayStore((s) => s.gameType);
  const names = useLocalPlayStore((s) => s.names);
  const hand = useLocalPlayStore((s) => s.hand);
  const bidHistory = useLocalPlayStore((s) => s.bidHistory);
  const firstBidderId = useLocalPlayStore((s) => s.firstBidderId);
  const seatOrder = useLocalPlayStore((s) => s.seatOrder);
  const runningScores = useLocalPlayStore((s) => s.runningScores);
  const summary = useLocalPlayStore((s) => s.summary);
  const settledTrick = useLocalPlayStore((s) => s.settledTrick);
  const decision = useLocalPlayStore((s) => s.decision);
  const startGame = useLocalPlayStore((s) => s.startGame);
  const bid = useLocalPlayStore((s) => s.bid);
  const pass = useLocalPlayStore((s) => s.pass);
  const declare = useLocalPlayStore((s) => s.declare);
  const play = useLocalPlayStore((s) => s.play);
  const stepBot = useLocalPlayStore((s) => s.stepBot);
  const dismissTrick = useLocalPlayStore((s) => s.dismissTrick);
  const nextHand = useLocalPlayStore((s) => s.nextHand);
  const short = useShortViewport();
  const fanRef = useRef<HTMLDivElement>(null);
  const [fanHeight, setFanHeight] = useState(180);

  useEffect(() => {
    if (!settledTrick) return undefined;
    const timer = window.setTimeout(() => dismissTrick(), 1500);
    return () => window.clearTimeout(timer);
  }, [settledTrick, dismissTrick]);

  useEffect(() => {
    const node = fanRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const apply = (): void => setFanHeight(node.offsetHeight);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [phase, short, hand?.hands[HUMAN_ID]?.length, hand?.bidder]);

  useEffect(() => {
    if (phase === 'setup' || phase === 'scored' || settledTrick) return undefined;
    const timer = window.setTimeout(() => stepBot(), 40);
    return () => window.clearTimeout(timer);
  }, [phase, decision, hand?.toPlayerId, hand?.currentTrick.length, bidHistory.length, settledTrick, stepBot]);

  if (phase === 'setup' || !hand) return <Setup onStart={startGame} />;

  const players = seatOrder.map((id, index) => ({ id, name: names[id] ?? id, seat: index + 1 }));
  const auction = { gameType, playerIds: seatOrder, firstBidderId, bidHistory };
  const turn = nextBidder(auction);
  const humanHand = hand.hands[HUMAN_ID] ?? [];
  const legal = new Set(legalPlaysFor(hand, HUMAN_ID).map((card) => cardInstanceKey(card)));
  const myTurn = phase === 'playing' && hand.toPlayerId === HUMAN_ID && !settledTrick;
  const shownTrick = settledTrick?.plays ?? hand.currentTrick;
  const thirty = trickThirties(shownTrick, hand);
  const reasons = new Map(humanHand.map((card) => [cardInstanceKey(card), illegalReason(legalContext(hand), card) ?? '']));
  const docked = phase === 'bidding' || phase === 'declaring' || phase === 'playing';
  const humanDeclaring = phase === 'declaring' && hand.bidder === HUMAN_ID;
  const notice = privateNotice(humanHand, hand.calledCards, hand.bidder, gameType, hand.slots);
  const fan = (
    <HandFan
      cards={humanHand}
      legalCardIds={legal}
      canPlay={myTurn}
      onPlay={play}
      trump={hand.trump}
      thirtySuits={handThirties(hand)}
      calledIds={new Set(hand.calledCards.map((card) => cardId(card)))}
      reasons={reasons}
      compact={!myTurn || short}
    />
  );

  return (
    <div className="min-h-screen">
    <main
      className={`mx-auto flex min-h-screen w-full max-w-[980px] flex-col overflow-x-clip px-3 pt-2 ${short ? 'gap-1' : 'gap-3'}`}
      style={{ paddingBottom: docked ? fanHeight + (humanDeclaring ? 84 : 12) : 16 }}
    >
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-base font-medium">Play vs bots · {gameType}</h1>
        <Link to="/" className="text-sm text-stone-600 underline">Home</Link>
      </header>
      {!short && <p className="text-sm text-stone-500">Free to play. No coins or stakes.</p>}
      <ScoreStrip names={names} scores={runningScores} order={seatOrder} chips={short} />
      <TableStatus hand={hand} names={names} />
      {phase !== 'bidding' && (
        <AuctionRecap
          history={bidHistory}
          names={names}
          trump={hand.trump}
          called={hand.calledCards}
          winnerId={hand.bidder}
          winningBid={hand.bidAmount}
        />
      )}
      {notice && <p data-testid="private-partner" className="text-sm font-medium text-felt">{notice}</p>}
      {phase === 'bidding' && turn === HUMAN_ID && !settledTrick && (
        <div data-testid="bid-pass">
          <BiddingFlow
            players={players}
            gameType={gameType}
            firstBidderId={firstBidderId}
            bidHistory={bidHistory}
            onBid={(_id, amount) => bid(amount)}
            onPass={() => pass()}
            onAuctionClose={() => stepBot()}
          />
        </div>
      )}
      {phase === 'bidding' && turn !== HUMAN_ID && <p className="text-sm text-stone-600">Bots are bidding…</p>}
      {phase === 'declaring' && hand.bidder === HUMAN_ID && (
        <DeclareForm
          gameType={gameType}
          need={rulesFor(gameType).PARTNERS_TO_CALL}
          heldFaces={new Set(humanHand.map((card) => cardId(card)))}
          onDeclare={declare}
        />
      )}
      {phase === 'declaring' && hand.bidder !== HUMAN_ID && (
        <p className="text-sm text-stone-600">{names[hand.bidder ?? ''] ?? 'Bidder'} is declaring…</p>
      )}
      {(phase === 'playing' || settledTrick) && (
        <div data-testid={settledTrick ? 'trick-pause' : 'trick-live'} onClick={() => settledTrick && dismissTrick()} className="cursor-pointer">
          <TrickArea
            played={shownTrick}
            playerNames={names}
            ledSuit={shownTrick[0]?.card.suit ?? null}
            thirtyIndexes={thirty}
            winnerId={settledTrick?.winnerId ?? null}
          />
          {settledTrick && <p className="mt-1 text-center text-sm text-stone-600">Tap to continue · {names[settledTrick.winnerId] ?? 'Winner'} won the trick</p>}
        </div>
      )}
      {phase === 'playing' && !settledTrick && (
        <p className="text-sm text-stone-500">
          {myTurn ? 'Your turn' : `${names[hand.toPlayerId ?? ''] ?? 'Bot'} to play`}
          {myTurn && [...reasons.values()].find((reason) => reason) ? ` · ${[...reasons.values()].find((reason) => reason)}` : ''}
        </p>
      )}
      {phase === 'scored' && summary && (
        <section data-testid="hand-complete" className="rounded-xl bg-white p-4">
          <h2 className="text-lg font-medium">{summary.bidMade ? 'Bid made' : 'Bid failed'}</h2>
          <p data-testid="score-explainer" className="mt-1 text-sm text-stone-700">{scoreExplainer(gameType)}</p>
          <p className="mt-1 text-sm text-stone-600">
            {names[summary.bidder] ?? 'Bidder'} bid {summary.bidAmount}. Team collected {summary.pointsCollected}.
          </p>
          <ul className="mt-2 text-sm">
            {seatOrder.map((id) => {
              const delta = summary.scoreDeltas[id] ?? 0;
              return (
                <li key={id} className="flex justify-between">
                  <span>{names[id] ?? id}{id === summary.bidder ? ' (bidder)' : summary.partners.includes(id) ? ' (partner)' : ''}</span>
                  <span className="tabular-nums">{delta > 0 ? `+${delta}` : delta}</span>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={nextHand} className="mt-4 w-full rounded-xl bg-felt p-4 text-base font-medium text-white">
            Next hand
          </button>
        </section>
      )}
    </main>
    {docked && (
      <div ref={fanRef} data-testid="hand-dock" className="fixed inset-x-0 z-30 bg-[#F5F1E8]" style={{ bottom: humanDeclaring ? 76 : 0 }}>
        <div className="mx-auto w-full max-w-[980px] px-3">{fan}</div>
      </div>
    )}
    </div>
  );
}

function useShortViewport(): boolean {
  const [short, setShort] = useState(false);
  useEffect(() => {
    const apply = (): void => setShort(window.innerHeight <= 640);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  return short;
}

function legalContext(hand: NonNullable<ReturnType<typeof useLocalPlayStore.getState>['hand']>) {
  const led = hand.currentTrick[0]?.card.suit ?? null;
  return {
    gameType: hand.gameType,
    hand: hand.hands[HUMAN_ID] ?? [],
    ledSuit: hand.currentTrick.length === 0 ? null : led,
    isLeading: hand.currentTrick.length === 0,
    playerId: HUMAN_ID,
    bidderId: hand.bidder,
    slots: hand.slots,
    trickCount: hand.trickCount,
    cardsPerPlayer: rulesFor(hand.gameType).CARDS_PER_PLAYER,
  };
}

function handThirties(hand: { gameType: GameType; premiumWinner: { spades: string | null; hearts: string | null }; currentTrick: ReadonlyArray<{ card: Card }> }): Set<Suit> {
  const pending = new Set<Suit>();
  const trickHas = (suit: Suit): boolean => hand.currentTrick.some((play) => play.card.suit === suit && play.card.rank === '3');
  if (!hand.premiumWinner.spades && !trickHas('spades')) pending.add('spades');
  if (hand.gameType === '500' && !hand.premiumWinner.hearts && !trickHas('hearts')) pending.add('hearts');
  return pending;
}

function trickThirties(played: ReadonlyArray<{ card: Card }>, hand: { gameType: GameType; premiumWinner: { spades: string | null; hearts: string | null } }): Set<number> {
  const marks = new Set<number>();
  let spades = hand.premiumWinner.spades !== null;
  let hearts = hand.gameType !== '500' || hand.premiumWinner.hearts !== null;
  played.forEach((play, index) => {
    if (!spades && play.card.suit === 'spades' && play.card.rank === '3') {
      marks.add(index);
      spades = true;
    }
    if (!hearts && play.card.suit === 'hearts' && play.card.rank === '3') {
      marks.add(index);
      hearts = true;
    }
  });
  return marks;
}

function TableStatus({ hand, names }: { hand: NonNullable<ReturnType<typeof useLocalPlayStore.getState>['hand']>; names: Record<string, string> }): JSX.Element | null {
  if (!hand.bidder || hand.bidAmount === null) return null;
  const revealed = visiblePartners(hand);
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm text-stone-700" data-testid="table-status">
      <span>{names[hand.bidder] ?? 'Bidder'} bid {hand.bidAmount}</span>
      {hand.trump && <span className="inline-flex items-center gap-1">trump <SuitIcon suit={hand.trump} size={14} /></span>}
      {hand.calledCards.length > 0 && (
        <span className="inline-flex items-end gap-1" data-testid="called-cards">
          <span className="text-sm font-medium">Called</span>
          {hand.calledCards.map((card) => <CardFace key={cardId(card)} card={card} width={40} called />)}
        </span>
      )}
      <span>Partners: {revealed.map((id) => names[id] ?? id).join(', ') || 'none yet'}</span>
      <span data-testid="team-points">Team points {publicTeamPoints(hand)}</span>
    </div>
  );
}

function publicTeamPoints(hand: NonNullable<ReturnType<typeof useLocalPlayStore.getState>['hand']>): number {
  const known = new Set<string>([hand.bidder ?? '', ...visiblePartners(hand)]);
  let points = 0;
  for (const id of known) {
    for (const card of hand.collected[id] ?? []) {
      if (card.rank === 'A' || card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10') points += 10;
      else if (card.rank === '5') points += 5;
    }
  }
  if (hand.premiumWinner.spades && known.has(hand.premiumWinner.spades)) points += 30;
  if (hand.gameType === '500' && hand.premiumWinner.hearts && known.has(hand.premiumWinner.hearts)) points += 30;
  return points;
}

function Setup({ onStart }: { onStart: (gameType: GameType, name: string) => void }): JSX.Element {
  const [gameType, setGameType] = useState<GameType>('250');
  const [name, setName] = useState('');
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[980px] flex-col gap-4 px-5 pt-6">
      <Link to="/" className="text-sm text-stone-600 underline">Home</Link>
      <h1 className="text-2xl font-medium">Play vs bots</h1>
      <p className="text-sm text-stone-600">Free to play against 5 bots (250) or 7 bots (500). No coins, no stakes, no buy-in.</p>
      <div className="grid grid-cols-2 gap-3">
        {(['250', '500'] as const).map((type) => (
          <button key={type} type="button" onClick={() => setGameType(type)} className={`rounded-xl border p-4 text-left ${gameType === type ? 'border-felt bg-felt text-white' : 'border-stone-300 bg-white'}`}>
            <div className="text-lg font-medium">{type}</div>
            <div className="text-sm opacity-80">{type === '250' ? 'You + 5 bots' : 'You + 7 bots'}</div>
          </button>
        ))}
      </div>
      <label className="text-sm font-medium" htmlFor="local-name">Your name</label>
      <input id="local-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="You" className="h-11 rounded-lg border border-stone-300 px-3" maxLength={40} />
      <button type="button" data-testid="start-vs-bots" onClick={() => onStart(gameType, name)} className="rounded-xl bg-felt p-4 text-base font-medium text-white">
        Deal the cards
      </button>
    </main>
  );
}

function DeclareForm({
  gameType,
  need,
  heldFaces,
  onDeclare,
}: {
  gameType: GameType;
  need: number;
  heldFaces: ReadonlySet<string>;
  onDeclare: (trump: Suit, called: Card[]) => void;
}): JSX.Element {
  const [trump, setTrump] = useState<Suit | null>(null);
  const [called, setCalled] = useState<Card[]>([]);
  return (
    <div className="flex flex-col gap-3 pb-20" data-testid="declare-form">
      <h2 className="text-sm font-medium">You won the bid. Name trump and {need} cards.</h2>
      <p data-testid="score-explainer" className="text-sm text-stone-700">{scoreExplainer(gameType)}</p>
      <TrumpPicker value={trump} onChange={setTrump} />
      <PartnerPicker selected={called} maxCount={need} heldFaces={heldFaces} onChange={setCalled} />
      <div className="fixed inset-x-0 bottom-0 z-40 bg-[#F5F1E8] px-3 py-2">
        <button type="button" disabled={!trump || called.length !== need} onClick={() => trump && onDeclare(trump, called)} className="mx-auto block w-full max-w-[980px] rounded-xl bg-felt p-4 font-medium text-white disabled:bg-stone-300">
          Confirm declaration
        </button>
      </div>
    </div>
  );
}

