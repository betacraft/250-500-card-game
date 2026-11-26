import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Card, GameType, Suit } from '@250-500/shared';
import { PartnerPicker } from '../components/shared/PartnerPicker';
import { TrumpPicker } from '../components/shared/TrumpPicker';
import { useSettingsStore } from '../stores/settings-store';
import { scoreExplainer } from './local-table-notes';

/** Leaves the current hand after a confirm, then the variant picker is shown again. */
export function NewGameButton({ onAbandon, compact = false }: { onAbandon: () => void; compact?: boolean }): JSX.Element {
  const [ask, setAsk] = useState(false);
  const text = compact ? 'text-xs text-stone-700 underline' : 'text-sm text-stone-700 underline';
  if (!ask) {
    return (
      <button type="button" data-testid="new-game" onClick={() => setAsk(true)} className={text}>
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

/** Name, variant, and bot strength before the first deal. */
export function Setup({ onStart }: { onStart: (gameType: GameType, name: string, difficulty?: 'easy' | 'normal') => void }): JSX.Element {
  const [gameType, setGameType] = useState<GameType>('250');
  const [name, setName] = useState('');
  const difficulty = useSettingsStore((s) => s.botDifficulty);
  const setDifficulty = useSettingsStore((s) => s.setBotDifficulty);
  const autoPlay = useSettingsStore((s) => s.autoPlayForced);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlayForced);
  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[980px] flex-1 flex-col gap-1.5 overflow-hidden px-4 py-2">
      <Link to="/" className="shrink-0 text-sm text-stone-600 underline">Home</Link>
      <h1 className="shrink-0 text-xl font-medium">Play vs bots</h1>
      <p className="shrink-0 text-sm leading-snug text-stone-600">Free to play against 5 bots (250) or 7 bots (500). No coins, no stakes, no buy-in.</p>
      <div data-testid="variant-picker" className="grid shrink-0 grid-cols-2 gap-2">
        {(['250', '500'] as const).map((type) => (
          <button key={type} type="button" data-variant={type} aria-pressed={gameType === type} onPointerDown={(event) => { event.preventDefault(); setGameType(type); }} className={`rounded-xl border px-3 py-2 text-left ${gameType === type ? 'border-felt bg-felt text-white' : 'border-stone-300 bg-white'}`}>
            <div className="text-lg font-medium leading-6">{type}</div>
            <div className="text-sm opacity-80">{type === '250' ? 'You + 5 bots' : 'You + 7 bots'}</div>
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="text-sm font-medium">Bot difficulty</p>
        <button type="button" data-testid="autoplay-toggle" aria-pressed={autoPlay} onClick={() => setAutoPlay(!autoPlay)} className="-my-3 inline-flex h-11 shrink-0 items-center text-sm font-medium text-stone-800">
          Auto-play: {autoPlay ? 'On' : 'Off'}
        </button>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2" data-testid="difficulty-picker">
        {(['easy', 'normal'] as const).map((level) => (
          <button
            key={level}
            type="button"
            data-testid={`difficulty-${level}`}
            aria-pressed={difficulty === level}
            onPointerDown={(event) => { event.preventDefault(); setDifficulty(level); }}
            className={`h-11 rounded-xl border text-base font-medium ${difficulty === level ? 'border-felt bg-felt text-white' : 'border-stone-300 bg-white'}`}
          >
            {level === 'easy' ? 'Easy' : 'Normal'}
          </button>
        ))}
      </div>
      <label className="shrink-0 text-sm font-medium" htmlFor="local-name">Your name</label>
      <input id="local-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="You" className="h-11 shrink-0 rounded-lg border border-stone-300 px-3" maxLength={40} />
      <button type="button" data-testid="start-vs-bots" onClick={() => onStart(gameType, name, difficulty)} className="mt-auto h-11 shrink-0 rounded-xl bg-felt px-4 text-base font-medium text-white">
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
  brief = false,
  wide,
  onCanConfirm,
  onDeclare,
  onBlocked,
}: {
  gameType: GameType;
  need: number;
  heldFaces: ReadonlySet<string>;
  compact: boolean;
  brief?: boolean;
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
        {!brief && <span data-testid="score-explainer" className="text-stone-700">{scoreExplainer(gameType, compact)}</span>}
      </p>
      <TrumpPicker value={trump} onChange={setTrump} compact={compact} />
      <PartnerPicker selected={called} maxCount={need} heldFaces={heldFaces} compact={compact} wide={wide} onChange={setCalled} onBlocked={onBlocked} />
    </form>
  );
}
