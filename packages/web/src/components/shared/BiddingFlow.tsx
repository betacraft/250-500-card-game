import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  type Player,
  type GameType,
  type BidEntry,
  rulesFor,
  currentHighBid,
  passedPlayers,
  isAuctionClosed,
  getAuctionWinner,
  nextBidder,
  validateBid,
  suggestedNextBid,
} from '@250-500/shared';

interface BiddingFlowProps {
  /** All players in seat order */
  players: Player[];
  /** Game type (250 or 500) */
  gameType: GameType;
  /** Player who starts the bidding round */
  firstBidderId: string;
  /** Current bid history */
  bidHistory: BidEntry[];
  /** Called when a player bids */
  onBid: (playerId: string, amount: number) => void;
  /** Called when a player passes */
  onPass: (playerId: string) => void;
  /** Called when auction closes (winner + amount) */
  onAuctionClose: (winnerId: string, amount: number) => void;
}

/** Round-robin bidding flow for the current hand. */
export function BiddingFlow({
  players,
  gameType,
  firstBidderId,
  bidHistory,
  onBid,
  onPass,
  onAuctionClose,
}: BiddingFlowProps): JSX.Element {
  const rules = rulesFor(gameType);
  const playerIds = players.map((p) => p.id);
  const auctionState = { gameType, playerIds, firstBidderId, bidHistory };
  const closed = isAuctionClosed(auctionState);
  const currentTurnId = nextBidder(auctionState);
  const high = currentHighBid(bidHistory);
  const passed = passedPlayers(bidHistory);
  const winner = closed ? getAuctionWinner(auctionState) : null;

  const [draftAmount, setDraftAmount] = useState<number>(() => suggestedNextBid(auctionState));
  const playerById = useMemo(() => {
    const map: Record<string, Player> = {};
    for (const p of players) map[p.id] = p;
    return map;
  }, [players]);

  const currentPlayer = currentTurnId ? playerById[currentTurnId] : null;
  const validation = currentPlayer
    ? validateBid(auctionState, currentPlayer.id, draftAmount)
    : { ok: false as const, code: 'NOT_YOUR_TURN' as const, message: '' };

  const adjust = (delta: number) => {
    const next = Math.max(rules.MIN_BID, Math.min(rules.MAX_BID, draftAmount + delta));
    setDraftAmount(Math.round(next / rules.BID_INCREMENT) * rules.BID_INCREMENT);
  };

  const handleBid = () => {
    if (!currentPlayer || !validation.ok) return;
    onBid(currentPlayer.id, draftAmount);
    setDraftAmount(Math.min(draftAmount + rules.BID_INCREMENT, rules.MAX_BID));
  };

  const handlePass = () => {
    if (!currentPlayer) return;
    onPass(currentPlayer.id);
  };

  if (closed && winner) {
    return (
      <div className="rounded-xl bg-white p-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">Bidding closed</div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-lg font-medium text-gold-dark">
            {playerById[winner.playerId]?.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-lg font-medium">{playerById[winner.playerId]?.name}</div>
            <div className="text-sm text-stone-600">won the bid at {winner.amount}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAuctionClose(winner.playerId, winner.amount)}
          className="mt-4 w-full rounded-xl bg-felt p-3 text-base font-medium text-white active:scale-95 active:bg-felt-dark"
        >
          Continue to declaration
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Current high</div>
        {high ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-medium tabular-nums">{high.amount}</span>
            <span className="text-sm text-stone-600">by {playerById[high.playerId]?.name}</span>
          </div>
        ) : (
          <div className="mt-1 text-sm text-stone-500">No bids yet — minimum {rules.MIN_BID}</div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">Bidding history</div>
        {bidHistory.length === 0 ? (
          <div className="text-sm text-stone-500">No actions yet.</div>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {bidHistory.map((entry, i) => {
              const p = playerById[entry.playerId];
              return (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-stone-700">{p?.name ?? entry.playerId}</span>
                  {entry.action === 'bid' ? (
                    <span className="font-medium tabular-nums">{entry.amount}</span>
                  ) : (
                    <span className="text-stone-500">passed</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {currentPlayer && (
        <section className="rounded-xl border-2 border-felt bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-felt"></div>
            <div className="text-sm font-medium text-stone-700">
              <span className="text-felt">{currentPlayer.name}</span>'s turn
            </div>
          </div>

          <div className="mb-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => adjust(-rules.BID_INCREMENT)}
              aria-label="Decrease bid by 5"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95 active:bg-stone-200"
              disabled={draftAmount <= rules.MIN_BID}
            >
              <Minus size={18} />
            </button>
            <div className="min-w-[6rem] text-center text-3xl font-medium tabular-nums">{draftAmount}</div>
            <button
              type="button"
              onClick={() => adjust(rules.BID_INCREMENT)}
              aria-label="Increase bid by 5"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95 active:bg-stone-200"
              disabled={draftAmount >= rules.MAX_BID}
            >
              <Plus size={18} />
            </button>
          </div>

          {!validation.ok && validation.message && (
            <div className="mb-3 text-center text-xs text-red-600" role="alert">
              {validation.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePass}
              className="flex-1 rounded-xl border border-stone-300 p-3 text-base font-medium text-stone-700 active:scale-95 active:bg-stone-50"
            >
              Pass
            </button>
            <button
              type="button"
              onClick={handleBid}
              disabled={!validation.ok}
              className="flex-1 rounded-xl bg-felt p-3 text-base font-medium text-white active:scale-95 active:bg-felt-dark disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              Bid {draftAmount}
            </button>
          </div>
        </section>
      )}

      <div className="text-center text-xs text-stone-500">
        {playerIds.length - passed.size} players remaining in bidding · auction closes when only one is left
      </div>
    </div>
  );
}
