import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { type Card, type Suit, cardId, isLegalPlay, rulesFor, wouldBeSelfReveal } from '@250-500/shared';
import { useConnectionStore } from '../stores/connection-store';
import { useOnlineRoomStore } from '../stores/online-room-store';
import { TopStateStrip } from '../components/online/TopStateStrip';
import { OpponentsRow } from '../components/online/OpponentsRow';
import { TrickArea } from '../components/online/TrickArea';
import { HandSlider } from '../components/online/HandSlider';
import { ConnectionStatus } from '../components/online/ConnectionStatus';
import { ReconnectionBanner } from '../components/online/ReconnectionBanner';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { BiddingFlow } from '../components/shared/BiddingFlow';

interface PublicHandState {
  phase: 'bidding' | 'declaring' | 'playing' | 'scored';
  handNumber: number;
  bidHistory: Array<{ playerId: string; action: 'bid' | 'pass'; amount?: number }>;
  bidder: string | null;
  bidAmount: number | null;
  trump: Suit | null;
  calledCards: Card[];
  partners: string[];
  currentTrick: Array<{ playerId: string; card: Card }>;
  toPlayerId: string | null;
  trickCount: number;
  cardsPerPlayer: Record<string, number>;
  runningScores: Record<string, number>;
}

export function OnlineGamePage(): JSX.Element {
  const socket = useConnectionStore((s) => s.socket);
  const status = useConnectionStore((s) => s.status);
  const connect = useConnectionStore((s) => s.connect);
  const room = useOnlineRoomStore((s) => s.room);

  const [handState, setHandState] = useState<PublicHandState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [draftTrump, setDraftTrump] = useState<Suit | null>(null);
  const [draftPartners, setDraftPartners] = useState<Card[]>([]);

  useEffect(() => {
    if (!socket) return;
    const onState = (s: PublicHandState) => setHandState(s);
    const onHand = (p: { hand: Card[] }) => setMyHand(p.hand);
    socket.on('game:state-updated', onState);
    socket.on('game:hand-dealt', onHand);
    return () => {
      socket.off('game:state-updated', onState);
      socket.off('game:hand-dealt', onHand);
    };
  }, [socket]);

  const myPlayer = useMemo(
    () => room?.players.find((p) => p.socketId === socket?.id),
    [room, socket],
  );

  if (!room || !myPlayer) return <Navigate to="/online" replace />;

  const playerNames: Record<string, string> = {};
  for (const p of room.players) playerNames[p.id] = p.name;

  const isBidder = handState?.bidder === myPlayer.id;
  const isMyTurn = handState?.toPlayerId === myPlayer.id;
  const partnersNeeded = rulesFor(room.gameType).PARTNERS_TO_CALL;

  const ledSuit = handState?.currentTrick[0]?.card.suit ?? null;
  const isLeading = (handState?.currentTrick.length ?? 0) === 0;
  const legalIds = new Set<string>();
  for (const c of myHand) {
    if (!isLegalPlay({ card: c, hand: myHand, ledSuit })) continue;
    // 500: cannot self-lead a called card (server enforces; surface in UI as illegal).
    if (
      room.gameType === '500' &&
      handState?.bidder &&
      wouldBeSelfReveal({
        playerId: myPlayer.id,
        card: c,
        isLeadingTrick: isLeading,
        bidderId: handState.bidder,
        slots: handState.calledCards.map((cc, i) => ({ card: cc, filledBy: handState.partners[i] ?? null })),
      })
    ) {
      continue;
    }
    legalIds.add(cardId(c));
  }

  const sendBid = (amount: number) => socket?.emit('game:bid', { amount });
  const sendPass = () => socket?.emit('game:pass', {});
  const sendDeclare = () => {
    if (!draftTrump || draftPartners.length !== partnersNeeded) return;
    socket?.emit('game:declare', { trump: draftTrump, calledCards: draftPartners });
    setDraftTrump(null);
    setDraftPartners([]);
  };
  const sendPlay = (card: Card) => socket?.emit('game:play-card', { card });

  return (
    <main className="flex min-h-screen flex-col gap-3 px-3 pb-4 pt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Hand {handState?.handNumber ?? 1}</h1>
        <ConnectionStatus status={status} />
      </div>

      {(status === 'disconnected' || status === 'error' || status === 'connecting') && (
        <ReconnectionBanner status={status} onRetry={() => connect(window.location.origin)} />
      )}

      <TopStateStrip
        trump={handState?.trump ?? null}
        bid={handState?.bidAmount ?? null}
        bidderName={handState?.bidder ? (playerNames[handState.bidder] ?? null) : null}
        yourScore={handState?.runningScores[myPlayer.id] ?? 0}
      />

      <OpponentsRow
        players={room.players
          .filter((p) => p.id !== myPlayer.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            cardCount: handState?.cardsPerPlayer[p.id] ?? 0,
            status:
              handState?.toPlayerId === p.id
                ? ('turn' as const)
                : handState?.bidder === p.id
                  ? ('bidder' as const)
                  : (handState?.partners.includes(p.id) ? ('partner' as const) : ('connected' as const)),
          }))}
      />

      {handState?.phase === 'bidding' && (
        <BiddingFlow
          players={room.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat }))}
          gameType={room.gameType}
          firstBidderId={room.players[((handState?.handNumber ?? 1) - 1) % room.players.length]!.id}
          bidHistory={handState.bidHistory}
          onBid={(_id, amount) => sendBid(amount)}
          onPass={() => sendPass()}
          onAuctionClose={() => {}}
        />
      )}

      {handState?.phase === 'declaring' && isBidder && (
        <div className="flex flex-col gap-3 pb-20">
          <h2 className="text-sm font-medium text-stone-700">Trump</h2>
          <TrumpPicker value={draftTrump} onChange={setDraftTrump} />
          <h2 className="text-sm font-medium text-stone-700">Partners ({partnersNeeded})</h2>
          <PartnerPicker selected={draftPartners} maxCount={partnersNeeded} onChange={setDraftPartners} />
          <button
            type="button"
            onClick={sendDeclare}
            disabled={!draftTrump || draftPartners.length !== partnersNeeded}
            className="rounded-xl bg-felt p-4 text-base font-medium text-white active:scale-95 active:bg-felt-dark disabled:bg-stone-300 disabled:text-stone-500"
          >
            Confirm declaration
          </button>
        </div>
      )}

      {handState?.phase === 'declaring' && !isBidder && (
        <div className="rounded-xl bg-white p-4 text-sm text-stone-600 text-center">
          Waiting for {handState.bidder ? playerNames[handState.bidder] : 'bidder'} to declare…
        </div>
      )}

      {handState?.phase === 'playing' && (
        <>
          <TrickArea played={handState.currentTrick} playerNames={playerNames} ledSuit={ledSuit} />
          <div className="mt-auto">
            <HandSlider cards={myHand} legalCardIds={legalIds} canPlay={isMyTurn} onPlay={sendPlay} />
          </div>
        </>
      )}

      {handState?.phase === 'scored' && (
        <div className="rounded-xl bg-white p-4 text-center">
          <h2 className="font-medium">Hand complete</h2>
          <p className="text-sm text-stone-600 mt-1">Scores updated. Waiting for next hand…</p>
          <div className="mt-3 flex flex-col gap-1 text-sm">
            {room.players.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="font-medium tabular-nums">{handState.runningScores[p.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
