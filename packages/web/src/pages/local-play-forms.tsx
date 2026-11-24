import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Card, GameType, Suit } from '@250-500/shared';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { scoreExplainer } from './local-table-notes';

/** Leaves the current hand after a confirm, then the variant picker is shown again. */
export function NewGameButton({ onAbandon }: { onAbandon: () => void }): JSX.Element {
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <button type="button" data-testid="new-game" onClick={() => setAsk(true)} className="text-sm text-stone-700 underline">
        New game
      </button>
    );
  }
  return (
    <span data-testid="abandon-confirm" className="flex items-center gap-2">
      <button type="button" data-testid="abandon-keep" onClick={() => setAsk(false)} className="text-sm text-stone-700 underline">
        Keep playing
      </button>
      <button type="button" data-testid="abandon-yes" onClick={onAbandon} className="text-sm font-medium text-red-700 underline">
        Start a new game
      </button>
    </span>
  );
}

/** Name and variant before the first deal. */
export function Setup({ onStart }: { onStart: (gameType: GameType, name: string) => void }): JSX.Element {
  const [gameType, setGameType] = useState<GameType>('250');
  const [name, setName] = useState('');
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[980px] flex-col gap-4 px-5 pt-6">
      <Link to="/" className="text-sm text-stone-600 underline">Home</Link>
      <h1 className="text-2xl font-medium">Play vs bots</h1>
      <p className="text-sm text-stone-600">Free to play against 5 bots (250) or 7 bots (500). No coins, no stakes, no buy-in.</p>
      <div data-testid="variant-picker" className="grid grid-cols-2 gap-3">
        {(['250', '500'] as const).map((type) => (
          <button key={type} type="button" data-variant={type} aria-pressed={gameType === type} onPointerDown={(event) => { event.preventDefault(); setGameType(type); }} className={`rounded-xl border p-4 text-left ${gameType === type ? 'border-felt bg-felt text-white' : 'border-stone-300 bg-white'}`}>
            <div className="text-lg font-medium">{type}</div>
            <div className="text-sm opacity-80">{type === '250' ? 'You + 5 bots' : 'You + 7 bots'}</div>
          </button>
        ))}
      </div>
      <label className="text-sm font-medium" htmlFor="local-name">Your name</label>
      <input id="local-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="You" className="h-11 rounded-lg border border-stone-300 px-3" maxLength={40} />
      <button type="button" data-testid="start-vs-bots" onClick={() => onStart(gameType, name)} className="rounded-xl bg-felt p-4 text-base font-medium text-white">
        Deal the cards
      </button>
    </main>
  );
}

/** Trump and called cards. The scroll parent owns the overflow, so the grid can move. */
export function DeclareForm({
  gameType,
  need,
  heldFaces,
  compact,
  wide,
  onCanConfirm,
  onDeclare,
  onBlocked,
}: {
  gameType: GameType;
  need: number;
  heldFaces: ReadonlySet<string>;
  compact: boolean;
  wide: boolean;
  onCanConfirm: (ready: boolean) => void;
  onDeclare: (trump: Suit, called: Card[]) => void;
  onBlocked?: (reason: string) => void;
}): JSX.Element {
  const [trump, setTrump] = useState<Suit | null>(null);
  const [called, setCalled] = useState<Card[]>([]);
  const trumpRef = useRef(trump);
  const calledRef = useRef(called);
  trumpRef.current = trump;
  calledRef.current = called;
  const ready = trump !== null && called.length === need;
  useLayoutEffect(() => { onCanConfirm(ready); }, [onCanConfirm, ready]);
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const currentTrump = trumpRef.current;
    const currentCalled = calledRef.current;
    if (!currentTrump || currentCalled.length !== need) return;
    onDeclare(currentTrump, currentCalled);
  };
  return (
    <form id="declare-form" data-testid="declare-form" className={compact && wide ? 'flex flex-col gap-0' : compact ? 'flex flex-col gap-1' : 'flex flex-col gap-3'} onSubmit={submit}>
      <p data-testid="declare-instruction" className="text-sm leading-snug text-stone-800">
        <span className="font-medium">You won the bid. Name trump and {need} cards. </span>
        <span data-testid="score-explainer" className="text-stone-700">{scoreExplainer(gameType, compact)}</span>
      </p>
      <TrumpPicker value={trump} onChange={setTrump} compact={compact} />
      <PartnerPicker selected={called} maxCount={need} heldFaces={heldFaces} compact={compact} wide={wide} onChange={setCalled} onBlocked={onBlocked} />
    </form>
  );
}
