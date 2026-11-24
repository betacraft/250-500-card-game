import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cardId, cardInstanceKey, illegalReason, legalPlaysFor, nextBidder, rulesFor, visiblePartners, type Card, type GameType, type Suit } from '@250-500/shared';
import { BiddingFlow } from '../components/shared/BiddingFlow';
import { SuitIcon } from '../components/shared/SuitIcon';
import { CardFace } from '../components/cards/CardFace';
import { HandFan } from '../components/cards/HandFan';
import { TrickArea } from '../components/online/TrickArea';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';
import { DeclareForm, NewGameButton, Setup } from './local-play-forms';
import { AuctionRecap, ScoreStrip, privateNotice, scoreExplainer } from './local-table-notes';

/** Free local table: one human and five or seven bots. Easy is the default. No coins, no stakes. */
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
  const difficulty = useLocalPlayStore((s) => s.difficulty);
  const bid = useLocalPlayStore((s) => s.bid);
  const pass = useLocalPlayStore((s) => s.pass);
  const declare = useLocalPlayStore((s) => s.declare);
  const play = useLocalPlayStore((s) => s.play);
  const stepBot = useLocalPlayStore((s) => s.stepBot);
  const dismissTrick = useLocalPlayStore((s) => s.dismissTrick);
  const nextHand = useLocalPlayStore((s) => s.nextHand);
  const leave = useLocalPlayStore((s) => s.leave);
  const { short, wide, height } = useViewport();
  const [canConfirm, setCanConfirm] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    setBlocked(null);
  }, [phase, hand?.toPlayerId, hand?.currentTrick.length, settledTrick, bidHistory.length]);
  useEffect(() => {
    if (!blocked) return undefined;
    const timer = window.setTimeout(() => setBlocked(null), 4000);
    return () => window.clearTimeout(timer);
  }, [blocked]);

  useEffect(() => {
    if (!settledTrick) return undefined;
    const timer = window.setTimeout(() => dismissTrick(), 1500);
    return () => window.clearTimeout(timer);
  }, [settledTrick, dismissTrick]);

  useEffect(() => {
    if (phase === 'setup' || phase === 'scored' || settledTrick) return undefined;
    const timer = window.setTimeout(() => stepBot(), 220);
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
      compact={short || !wide}
      maxHeight={wide && !short ? Math.floor(height * 0.3) : null}
      onBlocked={(reason) => setBlocked(reason ? reason : null)}
    />
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#F5F1E8]">
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[980px] flex-col px-3 pt-2">
      <header className="flex shrink-0 items-center justify-between gap-2">
        <h1 className="text-base font-medium">Play vs bots · {gameType}</h1>
        <span className="flex items-center gap-3">
          <span className="text-sm text-stone-500">Bots: {difficulty === 'normal' ? 'Normal' : 'Easy'}</span>
          <NewGameButton onAbandon={leave} />
          <Link to="/" className="text-sm text-stone-600 underline">Home</Link>
        </span>
      </header>
      {!short && <p className="shrink-0 pt-1 text-sm text-stone-500">Free to play. No coins or stakes.</p>}
      <div className="shrink-0 pt-1">
        <ScoreStrip
          names={names}
          scores={runningScores}
          order={seatOrder}
          chips
          narrow={!wide}
          turnId={phase === 'scored' ? null : phase === 'playing' ? hand.toPlayerId : phase === 'bidding' ? turn : hand.bidder}
          bidderId={hand.bidder}
        />
      </div>
      <div data-testid="play-scroll" className="min-h-0 flex-1 overflow-y-auto py-2">
      <TableStatus hand={hand} names={names} />
      <p data-testid="disabled-reason" role="status" className="pointer-events-none h-5 overflow-hidden text-sm font-medium leading-5 text-red-700">{blocked ?? ''}</p>
      {phase !== 'bidding' && !(humanDeclaring && (short || !wide)) && (
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
            compact={height <= 900}
            onBlocked={setBlocked}
            onDraft={() => setBlocked(null)}
          />
        </div>
      )}
      {phase === 'bidding' && turn !== HUMAN_ID && <p className="text-sm text-stone-600">Bots are bidding…</p>}
      {phase === 'declaring' && hand.bidder === HUMAN_ID && (
        <DeclareForm
          gameType={gameType}
          need={rulesFor(gameType).PARTNERS_TO_CALL}
          heldFaces={new Set(humanHand.map((card) => cardId(card)))}
          compact={height <= 900}
          wide={wide}
          onCanConfirm={setCanConfirm}
          onDeclare={declare}
          onBlocked={setBlocked}
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
          {settledTrick && <p className="mt-1 text-center text-sm text-stone-600">{names[settledTrick.winnerId] ?? 'Winner'} won the trick · tap to skip</p>}
        </div>
      )}
      {phase === 'playing' && !settledTrick && (
        <p data-testid="play-status" className="mb-2 text-sm text-stone-500">
          {myTurn ? 'Your turn' : `${names[hand.toPlayerId ?? ''] ?? 'Bot'} to play`}
          {myTurn && [...reasons.values()].find((reason) => reason) ? ` · ${[...reasons.values()].find((reason) => reason)}` : ''}
        </p>
      )}
      {phase === 'scored' && summary && !settledTrick && (
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
      </div>
      {docked && (
        <div data-testid="hand-dock" className="shrink-0 pb-[env(safe-area-inset-bottom)]">
          {fan}
          {humanDeclaring && (
            <div className="py-2">
              <button type="submit" form="declare-form" aria-disabled={!canConfirm} onClick={(event) => { if (!canConfirm) { event.preventDefault(); setBlocked('Name a trump and the called cards first'); } }} className={`w-full rounded-xl p-3 text-base font-medium text-white ${canConfirm ? 'bg-felt' : 'bg-stone-300'}`}>
                Confirm declaration
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

function useViewport(): { short: boolean; wide: boolean; height: number } {
  const [size, setSize] = useState({ short: false, wide: true, height: 800 });
  useEffect(() => {
    const apply = (): void => setSize({ short: window.innerHeight <= 760, wide: window.innerWidth >= 720, height: window.innerHeight });
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  return size;
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
      {hand.trump && <span data-testid="trump-name" data-suit={hand.trump} className="inline-flex items-center gap-1">Trump: {hand.trump} <SuitIcon suit={hand.trump} size={18} className="shrink-0" /></span>}
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

