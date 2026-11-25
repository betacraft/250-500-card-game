import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameType } from '@250-500/shared';
import { NewGameButton } from './local-play-forms';

/** Title and table controls. A narrow phone keeps the game name on its own line. */
export function PlayBar({
  gameType,
  difficulty,
  playSpeed,
  soundMuted,
  onSpeed,
  onSound,
  onLeave,
}: {
  gameType: GameType;
  difficulty: 'easy' | 'normal';
  playSpeed: 'normal' | 'fast';
  soundMuted: boolean;
  onSpeed: () => void;
  onSound: () => void;
  onLeave: (reason: 'new_game' | 'home') => void;
}): JSX.Element {
  const narrow = useNarrow();
  const fast = playSpeed === 'fast';
  return (
    <header className={narrow ? 'flex shrink-0 flex-col gap-0.5' : 'flex shrink-0 items-center justify-between gap-2'}>
      <h1 data-testid="table-title" className={narrow ? 'text-sm font-medium' : 'min-w-0 truncate text-sm font-medium'}>Play vs bots · {gameType}</h1>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-stone-500">Bots: {difficulty === 'normal' ? 'Normal' : 'Easy'}</span>
        <button type="button" data-testid="speed-toggle" aria-pressed={fast} aria-label="Double speed" onClick={onSpeed} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-lg text-stone-800 ${narrow ? '-my-1' : '-my-3'}`}>{fast ? '⏩' : '▶'}</button>
        <button type="button" data-testid="sound-toggle" aria-pressed={!soundMuted} onClick={onSound} className="text-sm text-stone-600 underline">{soundMuted ? 'Sound off' : 'Sound on'}</button>
        <NewGameButton onAbandon={() => onLeave('new_game')} />
        <Link to="/" onClick={() => onLeave('home')} className="text-sm text-stone-600 underline">Home</Link>
      </span>
    </header>
  );
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const apply = (): void => setNarrow(window.innerWidth <= 400);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  return narrow;
}
