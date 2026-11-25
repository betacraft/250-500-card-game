import { useEffect, useMemo, useState } from 'react';
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
  /** Less padding so Pass and Bid stay above a pinned hand. */
  compact?: boolean;
  /** A tap landed on a control that cannot do anything right now. */
  onBlocked?: (reason: string) => void;
  /** The draft amount changed, so an old warning no longer applies. */
  onDraft?: () => void;
  /**
   * Keep Pass and Bid inside the space above a pinned hand.
   * Older bids collapse so the recap cannot push those buttons under the dock.
   */
  contained?: boolean;
  /** Short landscape: one row of stepper controls, no separate high-bid card. */
  tight?: boolean;
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
  compact = false,
  onBlocked,
  onDraft,
  contained = false,
  tight = false,
}: BiddingFlowProps): JSX.Element {
  const rules = rulesFor(gameType);
  const playerIds = players.map((p) => p.id);
  const auctionState = { gameType, playerIds, firstBidderId, bidHistory };
  const closed = isAuctionClosed(auctionState);
  const currentTurnId = nextBidder(auctionState);
  const high = currentHighBid(bidHistory);
  const passed = passedPlayers(bidHistory);
  const winner = closed ? getAuctionWinner(auctionState) : null;

  const nextLegal = suggestedNextBid(auctionState);
  const [draftAmount, setDraftAmount] = useState<number>(nextLegal);
  useEffect(() => {
    setDraftAmount((current) => (current < nextLegal ? nextLegal : current));
  }, [nextLegal]);
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
    onDraft?.();
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
        <div className="mb-2 text-sm font-medium uppercase tracking-wider text-stone-500">Bidding closed</div>
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

  const pad = compact ? 'p-2' : 'p-4';
  const actions = (
    <div data-testid="bid-actions" className="flex gap-2">
      <button
        type="button"
        onClick={handlePass}
        className={`min-h-11 flex-1 rounded-xl border border-stone-300 text-base font-medium text-stone-700 active:scale-95 active:bg-stone-50 ${tight ? 'py-2' : 'p-3'}`}
      >
        Pass
      </button>
      <button
        type="button"
        onClick={() => (validation.ok ? handleBid() : onBlocked?.(validation.message ?? 'That bid is not allowed'))}
        aria-disabled={!validation.ok}
        className={`min-h-11 flex-1 rounded-xl bg-felt text-base font-medium text-white active:scale-95 active:bg-felt-dark aria-disabled:bg-stone-300 aria-disabled:text-stone-500 ${tight ? 'py-2' : 'p-3'}`}
      >
        Bid {draftAmount}
      </button>
    </div>
  );
  const remaining = (
    <div className="text-center text-sm text-stone-500">
      {playerIds.length - passed.size} players remaining in bidding · auction closes when only one is left
    </div>
  );
  if (tight && currentPlayer) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-end gap-1">
        <section data-testid="bid-stepper" data-min={rules.MIN_BID} data-max={rules.MAX_BID} className="shrink-0 rounded-xl border-2 border-felt bg-white px-2 py-1.5">
          <BidRecap history={bidHistory} nameOf={(id) => playerById[id]?.name ?? id} flush />
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm leading-5">
            <span className="min-w-0 truncate"><span className="font-medium text-felt">{currentPlayer.name}</span>&apos;s turn</span>
            <span className="shrink-0 text-stone-600">{high ? `High ${high.amount}` : `Min ${rules.MIN_BID}`}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <StepButton label="Decrease bid by 5" disabled={draftAmount <= rules.MIN_BID} onClick={() => (draftAmount <= rules.MIN_BID ? onBlocked?.(`The lowest bid is ${rules.MIN_BID}`) : adjust(-rules.BID_INCREMENT))}>
              <Minus size={18} />
            </StepButton>
            <div data-testid="draft-amount" className="min-w-[3.5rem] text-center text-2xl font-medium tabular-nums">{draftAmount}</div>
            <StepButton label="Increase bid by 5" disabled={draftAmount >= rules.MAX_BID} onClick={() => (draftAmount >= rules.MAX_BID ? onBlocked?.(`The highest bid is ${rules.MAX_BID}`) : adjust(rules.BID_INCREMENT))}>
              <Plus size={18} />
            </StepButton>
            {[5, 10, 20].map((step) => (
              <button
                key={step}
                type="button"
                aria-label={`Add ${step} to the bid`}
                onClick={() => (draftAmount >= rules.MAX_BID ? onBlocked?.(`The highest bid is ${rules.MAX_BID}`) : adjust(step))}
                aria-disabled={draftAmount >= rules.MAX_BID}
                className="h-11 min-w-11 shrink-0 rounded-full border border-stone-300 px-2 text-sm font-medium text-stone-700 active:scale-95 aria-disabled:opacity-40"
              >
                +{step}
              </button>
            ))}
          </div>
        </section>
        {actions}
      </div>
    );
  }
  return (
    <div className={contained ? 'flex max-h-full min-h-0 flex-col overflow-hidden' : compact ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
      <div className={contained ? 'flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain' : 'contents'} style={contained ? { flex: '0 1 auto' } : undefined}>
      <section className={`rounded-xl bg-white ${pad}`}>
        <div className="text-sm font-medium uppercase tracking-wider text-stone-500">Current high</div>
        {high ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-medium tabular-nums">{high.amount}</span>
            <span className="text-sm text-stone-600">by {playerById[high.playerId]?.name}</span>
          </div>
        ) : (
          <div className="mt-1 text-sm text-stone-500">No bids yet — minimum {rules.MIN_BID}</div>
        )}
      </section>

      {!contained && <BidRecap history={bidHistory} nameOf={(id) => playerById[id]?.name ?? id} />}

      {currentPlayer && (
        <section data-testid="bid-stepper" data-min={rules.MIN_BID} data-max={rules.MAX_BID} className={`rounded-xl border-2 border-felt bg-white ${pad}`}>
          <div className={compact ? 'mb-2 flex items-center gap-2' : 'mb-3 flex items-center gap-2'}>
            <div className="h-2 w-2 animate-pulse rounded-full bg-felt"></div>
            <div className="text-sm font-medium text-stone-700">
              <span className="text-felt">{currentPlayer.name}</span>'s turn
            </div>
          </div>

          <div className="mb-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => (draftAmount <= rules.MIN_BID ? onBlocked?.(`The lowest bid is ${rules.MIN_BID}`) : adjust(-rules.BID_INCREMENT))}
              aria-label="Decrease bid by 5"
              aria-disabled={draftAmount <= rules.MIN_BID}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95 active:bg-stone-200"
            >
              <Minus size={18} />
            </button>
            <div data-testid="draft-amount" className="min-w-[6rem] text-center text-3xl font-medium tabular-nums">{draftAmount}</div>
            <button
              type="button"
              onClick={() => (draftAmount >= rules.MAX_BID ? onBlocked?.(`The highest bid is ${rules.MAX_BID}`) : adjust(rules.BID_INCREMENT))}
              aria-label="Increase bid by 5"
              aria-disabled={draftAmount >= rules.MAX_BID}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95 active:bg-stone-200"
            >
              <Plus size={18} />
            </button>
          </div>

          {!validation.ok && validation.message && (
            <div className="mb-3 text-center text-sm text-red-600" role="alert">
              {validation.message}
            </div>
          )}

          <div className="mb-3 flex justify-center gap-2">
            {[5, 10, 20].map((step) => (
              <button
                key={step}
                type="button"
                aria-label={`Add ${step} to the bid`}
                onClick={() => (draftAmount >= rules.MAX_BID ? onBlocked?.(`The highest bid is ${rules.MAX_BID}`) : adjust(step))}
                aria-disabled={draftAmount >= rules.MAX_BID}
                className="h-11 min-w-11 rounded-full border border-stone-300 px-3 text-sm font-medium text-stone-700 active:scale-95 aria-disabled:opacity-40"
              >
                +{step}
              </button>
            ))}
          </div>

          {!contained && actions}
        </section>
      )}
      {!contained && remaining}
      </div>
      {contained && (
        <div className="shrink-0 bg-[#F5F1E8] pt-2">
          <BidRecap history={bidHistory} nameOf={(id) => playerById[id]?.name ?? id} />
          {actions}
          <div className="pt-1">{remaining}</div>
        </div>
      )}
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: JSX.Element }): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95 active:bg-stone-200"
    >
      {children}
    </button>
  );
}

/** Latest bids stay on one short row. Older ones collapse so the row cannot grow under the hand. */
function BidRecap({ history, nameOf, flush = false }: { history: readonly BidEntry[]; nameOf: (id: string) => string; flush?: boolean }): JSX.Element | null {
  if (history.length === 0) return null;
  const keep = 3;
  const format = (entry: BidEntry): string => {
    const name = nameOf(entry.playerId);
    return entry.action === 'bid' ? `${name} ${entry.amount ?? ''}`.trim() : `${name} pass`;
  };
  const earlier = Math.max(0, history.length - keep);
  const text = history.slice(-keep).map(format).join(', ');
  return (
    <p data-testid="bid-history" data-count={history.length} className={`shrink-0 truncate text-sm leading-5 text-stone-600 ${flush ? 'mb-1' : 'mb-2'}`}>
      {earlier > 0 ? `${earlier} earlier bids · ` : ''}
      {text}
    </p>
  );
}
