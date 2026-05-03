import { Navigate, useNavigate } from 'react-router-dom';
import { useScorekeeperStore } from '../stores/scorekeeper-store';
import { BiddingFlow } from '../components/shared/BiddingFlow';

/**
 * Hand page — orchestrates bidding → declaration → result for the current hand.
 * E03 implements bidding; later epics add declaration and result.
 */
export function ScorekeeperHandPage(): JSX.Element {
  const navigate = useNavigate();
  const settings = useScorekeeperStore((s) => s.settings);
  const currentHand = useScorekeeperStore((s) => s.currentHand);
  const recordBid = useScorekeeperStore((s) => s.recordBid);
  const recordPass = useScorekeeperStore((s) => s.recordPass);
  const closeBidding = useScorekeeperStore((s) => s.closeBidding);

  if (!settings || !currentHand) {
    return <Navigate to="/scorekeeper/setup" replace />;
  }

  const handleAuctionClose = (winnerId: string, amount: number) => {
    closeBidding(winnerId, amount);
    // Declaration UI lands in E04. For now, log + nav back to setup as placeholder.
    console.log('Auction closed; declaration coming in E04', { winnerId, amount });
  };

  if (currentHand.bidder) {
    return (
      <main className="flex min-h-screen flex-col px-5 pb-24 pt-4">
        <h1 className="text-xl font-medium">Hand {currentHand.handNumber}</h1>
        <div className="mt-6 rounded-xl bg-white p-4">
          <p className="text-sm text-stone-600">
            Bidder: <span className="font-medium">{settings.players.find((p) => p.id === currentHand.bidder)?.name}</span>
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Bid: <span className="font-medium tabular-nums">{currentHand.bidAmount}</span>
          </p>
          <p className="mt-3 text-xs text-stone-500">Trump declaration + partner picker land in E04.</p>
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
        onAuctionClose={handleAuctionClose}
      />
    </main>
  );
}
