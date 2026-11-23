import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cardInstanceKey, legalPlaysFor, nextBidder, rulesFor, type Card, type GameType, type Suit } from '@250-500/shared';
import { BiddingFlow } from '../components/shared/BiddingFlow';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { SuitIcon } from '../components/shared/SuitIcon';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { HandSlider } from '../components/online/HandSlider';
import { TrickArea } from '../components/online/TrickArea';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';

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
  const decision = useLocalPlayStore((s) => s.decision);
  const startGame = useLocalPlayStore((s) => s.startGame);
  const bid = useLocalPlayStore((s) => s.bid);
  const pass = useLocalPlayStore((s) => s.pass);
  const declare = useLocalPlayStore((s) => s.declare);
  const play = useLocalPlayStore((s) => s.play);
  const stepBot = useLocalPlayStore((s) => s.stepBot);
  const nextHand = useLocalPlayStore((s) => s.nextHand);

  useEffect(() => {
    if (phase === 'setup' || phase === 'scored') return undefined;
    const timer = window.setTimeout(() => stepBot(), 40);
    return () => window.clearTimeout(timer);
  }, [phase, decision, hand?.toPlayerId, hand?.currentTrick.length, bidHistory.length, stepBot]);

  if (phase === 'setup' || !hand) return <Setup onStart={startGame} />;

  const players = seatOrder.map((id, index) => ({ id, name: names[id] ?? id, seat: index + 1 }));
  const auction = { gameType, playerIds: seatOrder, firstBidderId, bidHistory };
  const turn = nextBidder(auction);
  const humanHand = hand.hands[HUMAN_ID] ?? [];
  const legal = new Set(legalPlaysFor(hand, HUMAN_ID).map((card) => cardInstanceKey(card)));
  const myTurn = hand.toPlayerId === HUMAN_ID;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-3 px-3 pb-6 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Play vs bots · {gameType}</h1>
          <p className="text-xs text-stone-500">Free to play. No coins or stakes.</p>
        </div>
        <Link to="/" className="text-sm text-stone-600 underline">Home</Link>
      </header>
      <ScoreStrip names={names} scores={runningScores} order={seatOrder} />
      {hand.trump && (
        <p className="text-sm text-stone-700">
          Bid {hand.bidAmount} · trump <SuitIcon suit={hand.trump} size={14} />
          {hand.calledCards.length > 0 && ` · called ${hand.calledCards.map((card) => `${card.rank}${card.suit.slice(0, 1)}`).join(' ')}`}
        </p>
      )}
      {phase === 'bidding' && turn === HUMAN_ID && (
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
      {phase === 'declaring' && hand.bidder === HUMAN_ID && <DeclareForm need={rulesFor(gameType).PARTNERS_TO_CALL} onDeclare={declare} />}
      {phase === 'declaring' && hand.bidder !== HUMAN_ID && <p className="text-sm text-stone-600">{names[hand.bidder ?? ''] ?? 'Bidder'} is declaring…</p>}
      {phase === 'playing' && (
        <>
          <TrickArea played={hand.currentTrick} playerNames={names} ledSuit={hand.currentTrick[0]?.card.suit ?? null} />
          <p className="text-xs text-stone-500">{myTurn ? 'Your turn' : `${names[hand.toPlayerId ?? ''] ?? 'Bot'} to play`}</p>
          <HandSlider cards={humanHand} legalCardIds={legal} canPlay={myTurn} onPlay={play} />
        </>
      )}
      {phase === 'scored' && summary && (
        <section data-testid="hand-complete" className="rounded-xl bg-white p-4">
          <h2 className="text-lg font-medium">{summary.bidMade ? 'Bid made' : 'Bid failed'}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {names[summary.bidder] ?? 'Bidder'} bid {summary.bidAmount}. Team collected {summary.pointsCollected} points.
            Partners: {summary.partners.map((id) => names[id] ?? id).join(', ') || 'none'}.
          </p>
          <button type="button" onClick={nextHand} className="mt-4 w-full rounded-xl bg-felt p-4 text-base font-medium text-white active:scale-95">
            Next hand
          </button>
        </section>
      )}
    </main>
  );
}

function Setup({ onStart }: { onStart: (gameType: GameType, name: string) => void }): JSX.Element {
  const [gameType, setGameType] = useState<GameType>('250');
  const [name, setName] = useState('');
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-4 px-5 pt-6">
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
      <button type="button" data-testid="start-vs-bots" disabled={name.trim().length === 0} onClick={() => onStart(gameType, name)} className="rounded-xl bg-felt p-4 text-base font-medium text-white disabled:bg-stone-300">
        Deal the cards
      </button>
    </main>
  );
}

function DeclareForm({ need, onDeclare }: { need: number; onDeclare: (trump: Suit, called: Card[]) => void }): JSX.Element {
  const [trump, setTrump] = useState<Suit | null>(null);
  const [called, setCalled] = useState<Card[]>([]);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">You won the bid. Name trump and {need} cards.</h2>
      <TrumpPicker value={trump} onChange={setTrump} />
      <PartnerPicker selected={called} maxCount={need} onChange={setCalled} />
      <button type="button" disabled={!trump || called.length !== need} onClick={() => trump && onDeclare(trump, called)} className="rounded-xl bg-felt p-4 font-medium text-white disabled:bg-stone-300">
        Confirm declaration
      </button>
    </div>
  );
}

function ScoreStrip({ names, scores, order }: { names: Record<string, string>; scores: Record<string, number>; order: string[] }): JSX.Element {
  return (
    <ul className="grid grid-cols-2 gap-1 text-xs text-stone-700">
      {order.map((id) => (
        <li key={id} className="flex justify-between rounded-lg bg-white px-2 py-1">
          <span>{names[id] ?? id}</span>
          <span className="tabular-nums">{scores[id] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}
