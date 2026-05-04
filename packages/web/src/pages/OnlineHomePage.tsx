import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { GameType, RoomState } from '@250-500/shared';
import { useConnectionStore } from '../stores/connection-store';
import { useOnlineRoomStore } from '../stores/online-room-store';
import { GameTypeCard } from '../components/scorekeeper/GameTypeCard';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

export function OnlineHomePage(): JSX.Element {
  const navigate = useNavigate();
  const status = useConnectionStore((s) => s.status);
  const socket = useConnectionStore((s) => s.socket);
  const connect = useConnectionStore((s) => s.connect);
  const setRoom = useOnlineRoomStore((s) => s.setRoom);
  const setSeat = useOnlineRoomStore((s) => s.setSeat);

  const [mode, setMode] = useState<'pick' | 'host' | 'join'>('pick');
  const [gameType, setGameType] = useState<GameType>('250');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) connect(SOCKET_URL || window.location.origin);
  }, [socket, connect]);

  useEffect(() => {
    if (!socket) return;
    const onCreated = (payload: { room: RoomState; yourSeat: number }) => {
      setRoom(payload.room);
      setSeat(payload.yourSeat);
      navigate('/online/lobby');
    };
    const onJoined = (payload: { room: RoomState }) => {
      setRoom(payload.room);
      navigate('/online/lobby');
    };
    const onError = (e: { code: string; message: string }) => setError(e.message);
    socket.on('room:created', onCreated);
    socket.on('room:joined', onJoined);
    socket.on('error', onError);
    return () => {
      socket.off('room:created', onCreated);
      socket.off('room:joined', onJoined);
      socket.off('error', onError);
    };
  }, [socket, navigate, setRoom, setSeat]);

  const handleHost = () => {
    if (!socket || name.trim().length === 0) return;
    socket.emit('room:create', { gameType, hostName: name.trim() });
  };

  const handleJoin = () => {
    if (!socket || code.trim().length !== 6) return;
    socket.emit('room:join', { code: code.trim().toUpperCase() });
  };

  return (
    <main className="flex min-h-screen flex-col px-5 pt-4">
      <header className="mb-4 flex items-center gap-2">
        <Link to="/" aria-label="Back to home" className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 active:bg-stone-200">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-medium">Play online</h1>
        {status !== 'connected' && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{status}</span>
        )}
      </header>

      {mode === 'pick' && (
        <div className="flex flex-1 flex-col gap-3">
          <button type="button" onClick={() => setMode('host')} className="rounded-xl bg-felt p-5 text-left text-white active:scale-95 active:bg-felt-dark">
            <div className="text-lg font-medium">Host a game</div>
            <div className="mt-1 text-sm opacity-90">Get a room code, share with friends.</div>
          </button>
          <button type="button" onClick={() => setMode('join')} className="rounded-xl border border-stone-300 bg-white p-5 text-left text-stone-900 active:scale-95">
            <div className="text-lg font-medium">Join a game</div>
            <div className="mt-1 text-sm text-stone-600">Enter the code your host gave you.</div>
          </button>
        </div>
      )}

      {mode === 'host' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-stone-700">Game type</h2>
          <div className="grid grid-cols-2 gap-3">
            <GameTypeCard gameType="250" playerCount={6} selected={gameType === '250'} onSelect={setGameType} />
            <GameTypeCard gameType="500" playerCount={8} selected={gameType === '500'} onSelect={setGameType} />
          </div>
          <label className="text-sm font-medium text-stone-700" htmlFor="host-name">Your name</label>
          <input id="host-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mayuresh" className="h-11 rounded-lg border border-stone-300 px-3" maxLength={40} />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="mt-auto flex flex-col gap-2 pb-6 pt-4">
            <button type="button" onClick={handleHost} disabled={!name.trim() || status !== 'connected'} className="rounded-xl bg-felt p-4 text-base font-medium text-white active:scale-95 active:bg-felt-dark disabled:bg-stone-300 disabled:text-stone-500">Create room</button>
            <button type="button" onClick={() => setMode('pick')} className="rounded-xl border border-stone-300 p-3 text-stone-700">Back</button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-stone-700" htmlFor="room-code">Room code</label>
          <input id="room-code" type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCDEF" className="h-14 rounded-lg border border-stone-300 px-3 text-center text-2xl tracking-widest font-medium tabular-nums" maxLength={6} autoCapitalize="characters" autoComplete="off" />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="mt-auto flex flex-col gap-2 pb-6 pt-4">
            <button type="button" onClick={handleJoin} disabled={code.trim().length !== 6 || status !== 'connected'} className="rounded-xl bg-felt p-4 text-base font-medium text-white active:scale-95 active:bg-felt-dark disabled:bg-stone-300 disabled:text-stone-500">Join room</button>
            <button type="button" onClick={() => setMode('pick')} className="rounded-xl border border-stone-300 p-3 text-stone-700">Back</button>
          </div>
        </div>
      )}
    </main>
  );
}
