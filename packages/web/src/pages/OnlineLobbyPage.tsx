import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import { Copy, Check } from 'lucide-react';
import type { RoomState } from '@250-500/shared';
import { useConnectionStore } from '../stores/connection-store';
import { useOnlineRoomStore } from '../stores/online-room-store';

export function OnlineLobbyPage(): JSX.Element {
  const navigate = useNavigate();
  const socket = useConnectionStore((s) => s.socket);
  const room = useOnlineRoomStore((s) => s.room);
  const yourSeat = useOnlineRoomStore((s) => s.yourSeat);
  const setRoom = useOnlineRoomStore((s) => s.setRoom);
  const setSeat = useOnlineRoomStore((s) => s.setSeat);
  const setRejoinCredentials = useOnlineRoomStore((s) => s.setRejoinCredentials);

  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (next: RoomState) => setRoom(next);
    const onSeatClaimed = (payload: { yourSeat: number; rejoinToken?: string; code?: string }) => {
      setSeat(payload.yourSeat);
      if (payload.rejoinToken && payload.code) {
        setRejoinCredentials(payload.code, payload.rejoinToken);
      }
    };
    const onError = (e: { code: string; message: string }) => setError(e.message);
    const onGameState = () => navigate('/online/game');
    socket.on('room:state-updated', onUpdate);
    socket.on('room:seat-claimed', onSeatClaimed);
    socket.on('error', onError);
    socket.on('game:state-updated', onGameState);
    return () => {
      socket.off('room:state-updated', onUpdate);
      socket.off('room:seat-claimed', onSeatClaimed);
      socket.off('error', onError);
      socket.off('game:state-updated', onGameState);
    };
  }, [socket, setRoom, setSeat]);

  if (!room) return <Navigate to="/online" replace />;

  const claimSeat = (seat: number) => {
    if (!socket || name.trim().length === 0) return;
    socket.emit('room:claim-seat', { seat, name: name.trim() });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const occupiedSeats = new Set(room.players.map((p) => p.seat));
  const allFilled = room.players.length === room.capacity;

  return (
    <main className="flex min-h-screen flex-col px-5 pb-6 pt-4">
      <header>
        <h1 className="text-xl font-medium">Lobby — {room.gameType}</h1>
        <p className="text-xs text-stone-500">{room.players.length} of {room.capacity} players</p>
      </header>

      <section className="mt-4 flex items-center gap-2 rounded-xl bg-white p-4">
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Room code</div>
          <div className="mt-1 text-3xl font-medium tabular-nums tracking-widest">{room.code}</div>
        </div>
        <button type="button" onClick={copyCode} aria-label="Copy room code" className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 active:bg-stone-200">
          {copied ? <Check size={20} className="text-felt" /> : <Copy size={20} />}
        </button>
      </section>

      {!yourSeat && (
        <section className="mt-4 rounded-xl bg-white p-4">
          <label className="text-sm font-medium text-stone-700" htmlFor="lobby-name">Your name</label>
          <input id="lobby-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="mt-2 h-11 w-full rounded-lg border border-stone-300 px-3" maxLength={40} />
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          <p className="mt-2 text-xs text-stone-500">Then tap an empty seat below.</p>
        </section>
      )}

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-medium text-stone-700">Seats</h2>
        <ul className="grid grid-cols-2 gap-2">
          {Array.from({ length: room.capacity }, (_, i) => i + 1).map((seat) => {
            const player = room.players.find((p) => p.seat === seat);
            const occupied = occupiedSeats.has(seat);
            const isYou = yourSeat === seat;
            return (
              <li key={seat}>
                {occupied ? (
                  <div className={`rounded-xl p-3 ${isYou ? 'bg-felt text-white' : 'bg-white'}`}>
                    <div className="text-xs opacity-70">Seat {seat}</div>
                    <div className="font-medium">{player?.name}{isYou ? ' (you)' : ''}</div>
                    {!player?.connected && <div className="mt-1 text-xs text-amber-600">disconnected</div>}
                  </div>
                ) : (
                  <button type="button" onClick={() => claimSeat(seat)} disabled={!name.trim() || !!yourSeat} className="w-full rounded-xl border-2 border-dashed border-stone-300 p-3 text-stone-500 active:scale-95 disabled:cursor-not-allowed">
                    <div className="text-xs">Seat {seat}</div>
                    <div className="font-medium">Empty</div>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        {allFilled && socket?.id === room.hostSocketId && (
          <button
            type="button"
            onClick={() => {
              socket.emit('game:start-hand', {});
              navigate('/online/game');
            }}
            className="rounded-xl bg-felt p-4 text-base font-medium text-white active:scale-95 active:bg-felt-dark"
          >
            Start hand
          </button>
        )}
        {allFilled && socket?.id !== room.hostSocketId && (
          <p className="text-center text-sm text-stone-500">Waiting for host to start…</p>
        )}
        {!allFilled && (
          <p className="text-center text-sm text-stone-500">Waiting for {room.capacity - room.players.length} more player{room.capacity - room.players.length === 1 ? '' : 's'}…</p>
        )}
      </div>
    </main>
  );
}
