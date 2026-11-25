import { useEffect, useState } from 'react';
import { cardId, cardInstanceKey, illegalReason, legalPlaysFor, nextBidder, rulesFor, visiblePartners } from '@250-500/shared';
import { BiddingFlow } from '../components/shared/BiddingFlow';
import { HandFan } from '../components/cards/HandFan';
import { TrickArea } from '../components/online/TrickArea';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';
import { useSettingsStore } from '../stores/settings-store';
import { ExportAnalyticsButton } from '../analytics/ExportAnalyticsButton';
import { DeclareForm, Setup } from './local-play-forms';
import { PlayBar } from './play-bar';
import { chipCue, handThirties, legalContext, scoreText, TableStatus, trickThirties, useViewport } from './local-play-helpers';
import { AuctionRecap, ScoreStrip, scoreExplainer } from './local-table-notes';
import { PartnerToast } from './partner-toast';
import { RecapHeading } from './recap-heading';
import { holdsSecretCall, privateNotice } from './secret-call';
import { useTablePace } from './use-table-pace';
import { usePartnerReveal } from './use-partner-reveal';

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
  const playAgain = useLocalPlayStore((s) => s.playAgain);
  const gameOver = useLocalPlayStore((s) => s.gameOver);
  const dealId = useLocalPlayStore((s) => s.dealId);
  const pace = useTablePace();
  const reveal = usePartnerReveal(hand, names, pace.banner !== null, dealId, phase);
  const soundMuted = useSettingsStore((s) => s.soundMuted);
  const setSoundMuted = useSettingsStore((s) => s.setSoundMuted);
  const playSpeed = useSettingsStore((s) => s.playSpeed);
  const setPlaySpeed = useSettingsStore((s) => s.setPlaySpeed);
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
    if (phase === 'setup') {
      document.body.removeAttribute('data-final-banner');
      document.body.removeAttribute('data-final-banner-at');
      document.body.removeAttribute('data-result-at');
      return undefined;
    }
    const lastTrick = settledTrick !== null && (hand?.hands[HUMAN_ID] ?? []).length === 0;
    if (lastTrick && document.body.getAttribute('data-final-banner') !== '1') {
      document.body.setAttribute('data-final-banner', '1');
      document.body.setAttribute('data-final-banner-at', String(performance.now()));
    }
    if (phase === 'scored' && document.body.getAttribute('data-final-banner-at') && !document.body.getAttribute('data-result-at')) {
      document.body.setAttribute('data-result-at', String(performance.now()));
    }
    return undefined;
  }, [phase, settledTrick, hand]);

  if (phase === 'setup' || !hand) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#F5F1E8]">
        <div className="shrink-0 px-3 pt-2">
          <ExportAnalyticsButton />
        </div>
        <Setup onStart={startGame} />
      </div>
    );
  }

  const players = seatOrder.map((id, index) => ({ id, name: names[id] ?? id, seat: index + 1 }));
  const auction = { gameType, playerIds: seatOrder, firstBidderId, bidHistory };
  const turn = nextBidder(auction);
  const humanHand = hand.hands[HUMAN_ID] ?? [];
  const legal = new Set(legalPlaysFor(hand, HUMAN_ID).map((card) => cardInstanceKey(card)));
  const myTurn = phase === 'playing' && hand.toPlayerId === HUMAN_ID && !settledTrick;
  const shownTrick = settledTrick?.plays ?? hand.currentTrick;
  const thirty = trickThirties(shownTrick, hand);
  const reasons = new Map(humanHand.map((card) => [cardInstanceKey(card), illegalReason(legalContext(hand), card) ?? '']));
  const cramped = !wide && height <= 600;
  const shortPlay = (height <= 500 || cramped) && (phase === 'playing' || Boolean(settledTrick));
  const shortScore = phase === 'scored' && !settledTrick && height <= 500;
  const dockNext = phase === 'scored' && !gameOver && height <= 500;
  const docked = phase === 'bidding' || phase === 'declaring' || phase === 'playing' || gameOver || dockNext;
  const humanDeclaring = phase === 'declaring' && hand.bidder === HUMAN_ID;
  const notice = privateNotice(humanHand, hand.calledCards, hand.bidder, gameType, hand.slots, names[hand.bidder ?? ''] ?? 'Bidder', visiblePartners(hand).includes(HUMAN_ID));
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
maxHeight={height <= 500 || cramped ? 72 : wide && !short ? Math.floor(height * 0.3) : wide ? null : Math.floor(height * 0.32) - 86}
      onBlocked={(reason) => setBlocked(reason ? reason : null)}
      forcedId={pace.forcedId}
      liftForced={!reveal.reduced}
    />
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#F5F1E8]">
    <div className={`mx-auto flex h-full min-h-0 w-full max-w-[980px] flex-col px-3 ${short ? 'pt-1' : 'pt-2'}`}>
      <ExportAnalyticsButton />
      <PlayBar gameType={gameType} difficulty={difficulty} playSpeed={playSpeed} soundMuted={soundMuted} onSpeed={() => setPlaySpeed(playSpeed === 'fast' ? 'normal' : 'fast')} onSound={() => setSoundMuted(!soundMuted)} onLeave={leave} />
      {!short && <p className="shrink-0 pt-1 text-sm text-stone-500">Free to play. No coins or stakes.</p>}
      <div className="shrink-0 pt-1">
        <ScoreStrip
          names={names}
          scores={runningScores}
          order={seatOrder}
          chips
          narrow={!wide}
          turnId={chipCue()?.turnId ?? (phase === 'scored' ? null : phase === 'playing' ? hand.toPlayerId : phase === 'bidding' ? turn : hand.bidder)}
          bidderId={chipCue()?.bidderId ?? hand.bidder}
          selfId={HUMAN_ID}
          partnerIds={reveal.partnerIds}
          glowIds={reveal.reduced || !reveal.current ? [] : [reveal.current.playerId]}
          bidderBid={height <= 500 && hand.trump && hand.bidAmount !== null && phase !== 'bidding' ? { suit: hand.trump, amount: hand.bidAmount } : null}
          privateHolderId={holdsSecretCall(hand, HUMAN_ID) ? HUMAN_ID : null}
        />
      </div>
      <div data-testid="play-scroll" className={`flex min-h-0 flex-1 flex-col overflow-hidden ${gameOver && height <= 500 ? 'py-1' : 'py-2'}`}>
      <div className="shrink-0">
      {!(gameOver && height <= 500) && !shortPlay && !(short && !wide && phase === 'declaring') && <TableStatus hand={hand} names={names} scoredPartners={phase === 'scored' && summary ? summary.partners : null} faces={!shortScore} />}
      {!(gameOver && height <= 500) && !shortPlay && !shortScore && <p data-testid="disabled-reason" role="status" className="pointer-events-none h-5 overflow-hidden text-sm font-medium leading-5 text-red-700">{blocked ?? ''}</p>}
      {phase !== 'bidding' && !(humanDeclaring && (short || !wide)) && !(gameOver && height <= 500) && !shortPlay && !shortScore && (
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
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
      {phase === 'bidding' && turn === HUMAN_ID && !settledTrick && (
        <div data-testid="bid-pass" className="h-full">
          <BiddingFlow
            players={players}
            gameType={gameType}
            firstBidderId={firstBidderId}
            bidHistory={bidHistory}
            onBid={(_id, amount) => bid(amount)}
            onPass={() => pass()}
            onAuctionClose={() => stepBot()}
            compact={height <= 900}
            contained
            tight={short}
            onBlocked={setBlocked}
            onDraft={() => setBlocked(null)}
          />
        </div>
      )}
      {!(phase === 'bidding' && turn === HUMAN_ID && !settledTrick) && (
      <div className={shortScore ? 'absolute inset-0' : 'h-full overflow-y-auto'}>
      {phase === 'bidding' && turn !== HUMAN_ID && <p className="text-sm text-stone-600">Bots are bidding…</p>}
      {phase === 'declaring' && hand.bidder === HUMAN_ID && (
        <DeclareForm
          gameType={gameType}
          need={rulesFor(gameType).PARTNERS_TO_CALL}
          heldFaces={new Set(humanHand.map((card) => cardId(card)))}
          compact={height <= 900}
          brief={short && !wide}
          wide={wide}
          onCanConfirm={setCanConfirm}
          onDeclare={declare}
          onBlocked={setBlocked}
        />
      )}
      {phase === 'declaring' && hand.bidder !== HUMAN_ID && (
        <p className="text-sm text-stone-600">{names[hand.bidder ?? ''] ?? 'Bidder'} is declaring…</p>
      )}
      {pace.banner && (
        <p data-testid="bid-lock-banner" data-lock={pace.banner} className={`pointer-events-none mx-auto my-1 w-fit rounded-full px-4 py-2 text-base font-semibold text-white shadow-lg ${pace.banner === 'made' ? 'bg-felt' : 'bg-[#7A3E2E]'} ${reveal.reduced ? 'bid-lock-fade' : 'bid-lock-pop'}`}>
          {pace.banner === 'made' ? 'Bid made!' : 'Bid sunk!'}
        </p>
      )}
      {(phase === 'playing' || settledTrick) && (
        <div data-testid={settledTrick ? 'trick-pause' : 'trick-live'} onClick={() => settledTrick && dismissTrick()} className="relative cursor-pointer">
          <TrickArea
            played={shownTrick}
            playerNames={names}
            ledSuit={shownTrick[0]?.card.suit ?? null}
            thirtyIndexes={thirty}
            winnerId={settledTrick?.winnerId ?? null}
            trump={hand.trump}
            compact={height <= 500 || cramped}
          />
          {!pace.banner && <PartnerToast notice={reveal.current} reduced={reveal.reduced} />}
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
        <section data-testid="hand-complete" className={`rounded-xl bg-white ${shortScore ? `h-full touch-pan-y overflow-y-auto overscroll-contain ${gameOver ? 'max-h-[230px] p-3' : 'max-h-[172px] px-3 py-1'}` : gameOver ? 'max-h-full overflow-y-auto p-3' : 'p-3'}`}>
          {gameOver && <h2 data-testid="game-over" className="text-lg font-medium">Game over</h2>}
          <RecapHeading made={summary.bidMade} lastTrick={pace.lastTrick} reduced={reveal.reduced} />
          {shortScore && (
            <p data-testid="your-result" className="mt-1 text-base font-medium">
              You {scoreText(summary.scoreDeltas[HUMAN_ID] ?? 0)} ({summary.bidder === HUMAN_ID ? 'bidder' : summary.partners.includes(HUMAN_ID) ? 'partner' : 'opponent'})
            </p>
          )}
          <p data-testid="score-explainer" className="mt-1 text-sm text-stone-700">{scoreExplainer(gameType)}</p>
          <p className="mt-1 text-sm text-stone-600">
            {names[summary.bidder] ?? 'Bidder'} bid {summary.bidAmount}. Team collected {summary.pointsCollected}.
          </p>
          <ul className="mt-2 text-sm">
            {seatOrder.map((id) => {
              const delta = summary.scoreDeltas[id] ?? 0;
              return (
                <li key={id} data-testid="score-delta" data-role={id === summary.bidder ? 'bidder' : summary.partners.includes(id) ? 'partner' : 'seat'} className={shortScore && !gameOver ? 'flex justify-between text-xs leading-4' : 'flex justify-between py-px text-sm leading-5'}>
                  <span>{names[id] ?? id}{id === summary.bidder ? ' (bidder)' : summary.partners.includes(id) ? ' (partner)' : ''}</span>
                  <span className="tabular-nums">{delta > 0 ? `+${delta}` : delta}</span>
                </li>
              );
            })}
          </ul>
          {!gameOver && !dockNext && (
            <button type="button" data-testid="next-hand" onClick={nextHand} className="mt-4 w-full rounded-xl bg-felt p-4 text-base font-medium text-white">
              Next hand
            </button>
          )}
        </section>
      )}
      </div>
      )}
      </div>
      </div>
      {docked && (
        <div data-testid="hand-dock" className="hand-dock shrink-0">
          {gameOver ? (
            <button type="button" data-testid="play-again" onClick={playAgain} className={`min-h-11 w-full rounded-xl bg-felt text-base font-medium text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${height <= 500 ? 'py-2' : 'p-4'}`}>
              Play again
            </button>
          ) : dockNext ? (
            <button type="button" data-testid="next-hand" onClick={nextHand} className="min-h-11 w-full rounded-xl bg-felt py-2 text-base font-medium text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]">
              Next hand
            </button>
          ) : (
            <>
              {pace.showFinish && (
                <button type="button" data-testid="finish-hand" onClick={pace.startFinish} className="mb-1 min-h-11 w-full rounded-xl bg-[#4A3000] py-2 text-base font-medium text-white">
                  Finish hand ⏩
                </button>
              )}
              {fan}
              {humanDeclaring && (
                <div className="pt-1">
                  <button type="submit" form="declare-form" aria-disabled={!canConfirm} onClick={(event) => { if (!canConfirm) { event.preventDefault(); setBlocked('Name a trump and the called cards first'); } }} className={`w-full rounded-xl p-3 text-base font-medium text-white ${canConfirm ? 'bg-felt' : 'bg-stone-300'}`}>
                    Confirm declaration
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

