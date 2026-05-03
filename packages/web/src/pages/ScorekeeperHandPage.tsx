import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { type Card, type Suit, rulesFor, gameWinners } from '@250-500/shared';
import { useScorekeeperStore } from '../stores/scorekeeper-store';
import { BiddingFlow } from '../components/shared/BiddingFlow';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { HandResultEntry } from '../components/shared/HandResultEntry';
import { ScoreBoard } from '../components/shared/ScoreBoard';
import { SuitIcon } from '../components/shared/SuitIcon';

export function ScorekeeperHandPage(): JSX.Element {
  const navigate = useNavigate();
  const settings = useScorekeeperStore((s) => s.settings);
  const currentHand = useScorekeeperStore((s) => s.currentHand);
  const runningScores = useScorekeeperStore((s) => s.runningScores);
  const recordBid = useScorekeeperStore((s) => s.recordBid);
  const recordPass = useScorekeeperStore((s) => s.recordPass);
  const closeBidding = useScorekeeperStore((s) => s.closeBidding);
  const declareTrump = useScorekeeperStore((s) => s.declareTrump);
  const callPartners = useScorekeeperStore((s) => s.callPartners);
  const applyHandResult = useScorekeeperStore((s) => s.applyHandResult);
  const startNextHand = useScorekeeperStore((s) => s.startNextHand);
  const resetGame = useScorekeeperStore((s) => s.resetGame);

  const [draftTrump, setDraftTrump] = useState<Suit | null>(null);
  const [draftPartners, setDraftPartners] = useState<Card[]>([]);

  if (!settings || !currentHand) {
    return <Navigate to="/scorekeeper/setup" replace />;
  }

  const winners = gameWinners(runningScores, settings.targetScore);
  const isGameOver = winners.length > 0;
  const partnersNeeded = rulesFor(settings.gameType).PARTNERS_TO_CALL;
  const bidder = currentHand.bidder;
  const inBidding = !bidder;
  const inDeclaration = bidder && currentHand.calledCards.length === 0 && currentHand.bidMade === undefined;
  const inResultEntry = bidder && currentHand.calledCards.length === partnersNeeded && currentHand.bidMade === undefined;
  const handCompleted = bidder && currentHand.bidMade !== undefined;

  const handleConfirmDeclaration = () => {
    if (!draftTrump || draftPartners.length !== partnersNeeded) return;
    declareTrump(draftTrump);
    callPartners(draftPartners);
    setDraftTrump(null);
    setDraftPartners([]);
  };

  if (isGameOver) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 pb-24 pt-4">
        <Trophy size={48} className="text-gold" />
        <h1 className="mt-4 text-2xl font-medium">
          {winners.length === 1 ? 'Winner!' : "It's a tie!"}
        </h1>
        <p className="mt-2 text-center text-stone-700">
          {winners.map((w) => settings.players.find((p) => p.id === w)?.name).join(', ')}
        </p>
        <div className="mt-8 w-full">
          <ScoreBoard
            players={settings.players}
            runningScores={runningScores}
            targetScore={settings.targetScore}
          />
        </div>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              resetGame();
              navigate('/scorekeeper/setup');
            }}
            className="w-full rounded-xl bg-felt p-3 text-base font-medium text-white active:scale-95"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={() => {
              resetGame();
              navigate('/');
            }}
            className="w-full rounded-xl border border-stone-300 p-3 text-base font-medium text-stone-700 active:scale-95"
          >
            Leave game
          </button>
        </div>
      </main>
    );
  }

  if (handCompleted) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-24 pt-4">
        <h1 className="text-xl font-medium">Hand {currentHand.handNumber} done</h1>
        <div className="mt-4">
          <ScoreBoard
            players={settings.players}
            runningScores={runningScores}
            targetScore={settings.targetScore}
            highlightPlayerId={bidder}
          />
        </div>
        <button
          type="button"
          onClick={startNextHand}
          className="mt-6 w-full rounded-xl bg-felt p-4 text-base font-medium text-white active:scale-95 active:bg-felt-dark"
        >
          Start hand {currentHand.handNumber + 1}
        </button>
      </main>
    );
  }

  if (inResultEntry) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-6 pt-4">
        <header className="mb-4">
          <h1 className="text-xl font-medium">Hand {currentHand.handNumber} — result</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-stone-600">
            <span>{settings.players.find((p) => p.id === bidder)?.name}</span>
            <span className="tabular-nums">@ {currentHand.bidAmount}</span>
            {currentHand.trump && <SuitIcon suit={currentHand.trump} size={14} />}
          </div>
        </header>
        <HandResultEntry
          players={settings.players}
          gameType={settings.gameType}
          bidder={bidder}
          bidAmount={currentHand.bidAmount!}
          onApply={applyHandResult}
        />
      </main>
    );
  }

  if (inDeclaration) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-32 pt-4">
        <header className="mb-4">
          <h1 className="text-xl font-medium">Hand {currentHand.handNumber}</h1>
          <p className="text-xs text-stone-500">
            {settings.players.find((p) => p.id === bidder)?.name} declares trump and partners
          </p>
        </header>

        <section className="mb-5">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Step 1 — Trump</h2>
          <TrumpPicker value={draftTrump} onChange={setDraftTrump} />
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-sm font-medium text-stone-700">
            Step 2 — Pick {partnersNeeded} partner card{partnersNeeded > 1 ? 's' : ''}
          </h2>
          <PartnerPicker
            selected={draftPartners}
            maxCount={partnersNeeded}
            onChange={setDraftPartners}
          />
        </section>

        <div
          className="fixed inset-x-0 bottom-0 bg-surface-warm/95 px-5 pb-6 pt-3 backdrop-blur"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <button
            type="button"
            onClick={handleConfirmDeclaration}
            disabled={!draftTrump || draftPartners.length !== partnersNeeded}
            className="w-full rounded-xl bg-felt p-4 text-base font-medium text-white shadow-sm transition active:scale-95 active:bg-felt-dark disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          >
            Confirm declaration
          </button>
        </div>
      </main>
    );
  }

  if (inBidding) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-6 pt-4">
        <header className="mb-4">
          <h1 className="text-xl font-medium">Hand {currentHand.handNumber}</h1>
          <p className="text-xs text-stone-500">Target: first to {settings.targetScore}</p>
        </header>

        <BiddingFlow
          players={settings.players}
          gameType={settings.gameType}
          firstBidderId={settings.players[(currentHand.handNumber - 1) % settings.players.length]!.id}
          bidHistory={currentHand.bidHistory}
          onBid={recordBid}
          onPass={recordPass}
          onAuctionClose={closeBidding}
        />
      </main>
    );
  }

  return <main className="p-5">Loading…</main>;
}
