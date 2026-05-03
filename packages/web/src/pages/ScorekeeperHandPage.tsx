import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { Card, Suit } from '@250-500/shared';
import { rulesFor } from '@250-500/shared';
import { useScorekeeperStore } from '../stores/scorekeeper-store';
import { BiddingFlow } from '../components/shared/BiddingFlow';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { SuitIcon } from '../components/shared/SuitIcon';

/** Hand page — bidding → declaration → result (E03 + E04 implemented; E05 next). */
export function ScorekeeperHandPage(): JSX.Element {
  const navigate = useNavigate();
  const settings = useScorekeeperStore((s) => s.settings);
  const currentHand = useScorekeeperStore((s) => s.currentHand);
  const recordBid = useScorekeeperStore((s) => s.recordBid);
  const recordPass = useScorekeeperStore((s) => s.recordPass);
  const closeBidding = useScorekeeperStore((s) => s.closeBidding);
  const declareTrump = useScorekeeperStore((s) => s.declareTrump);
  const callPartners = useScorekeeperStore((s) => s.callPartners);

  const [draftTrump, setDraftTrump] = useState<Suit | null>(null);
  const [draftPartners, setDraftPartners] = useState<Card[]>([]);

  if (!settings || !currentHand) {
    return <Navigate to="/scorekeeper/setup" replace />;
  }

  const partnersNeeded = rulesFor(settings.gameType).PARTNERS_TO_CALL;
  const bidder = currentHand.bidder;
  const inDeclaration = bidder && !currentHand.bidMade && currentHand.calledCards.length === 0;
  const declarationDone = bidder && currentHand.calledCards.length === partnersNeeded;

  const handleConfirmDeclaration = () => {
    if (!draftTrump || draftPartners.length !== partnersNeeded) return;
    declareTrump(draftTrump);
    callPartners(draftPartners);
  };

  if (declarationDone) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-24 pt-4">
        <h1 className="text-xl font-medium">Hand {currentHand.handNumber}</h1>
        <div className="mt-4 rounded-xl bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Declaration</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm">Bidder:</span>
            <span className="font-medium">
              {settings.players.find((p) => p.id === bidder)?.name}
            </span>
            <span className="text-sm tabular-nums">@ {currentHand.bidAmount}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span>Trump:</span>
            {currentHand.trump && <SuitIcon suit={currentHand.trump} size={16} />}
            <span className="capitalize">{currentHand.trump}</span>
          </div>
          <div className="mt-2 text-sm">
            Called:{' '}
            {currentHand.calledCards.map((c, i) => (
              <span key={i} className="ml-1 inline-flex items-center gap-0.5 font-medium">
                {c.rank}
                <SuitIcon suit={c.suit} size={12} />
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">Hand result entry coming in E05.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 w-full rounded-xl border border-stone-300 p-3 text-base font-medium text-stone-700 active:scale-95"
          >
            Back to home (placeholder)
          </button>
        </div>
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

  if (currentHand.bidder) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-24 pt-4">
        <h1 className="text-xl font-medium">Hand {currentHand.handNumber}</h1>
        <p className="mt-4">Awaiting next phase…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-6 pt-4">
      <header className="mb-4">
        <h1 className="text-xl font-medium">Hand {currentHand.handNumber}</h1>
        <p className="text-xs text-stone-500">Target: first to {settings.targetScore}</p>
      </header>

      <BiddingFlow
        players={settings.players}
        gameType={settings.gameType}
        firstBidderId={settings.players[0]!.id}
        bidHistory={currentHand.bidHistory}
        onBid={recordBid}
        onPass={recordPass}
        onAuctionClose={closeBidding}
      />
    </main>
  );
}
