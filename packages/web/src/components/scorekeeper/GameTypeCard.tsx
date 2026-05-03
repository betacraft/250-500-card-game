import { clsx } from 'clsx';
import type { GameType } from '@250-500/shared';

interface GameTypeCardProps {
  /** The game variant this card represents */
  gameType: GameType;
  /** Number of players for this variant */
  playerCount: number;
  /** Whether this card is currently selected */
  selected: boolean;
  /** Called when the card is tapped */
  onSelect: (gameType: GameType) => void;
}

/** Large tappable card for picking a game type (250 or 500). */
export function GameTypeCard({
  gameType,
  playerCount,
  selected,
  onSelect,
}: GameTypeCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(gameType)}
      aria-pressed={selected}
      className={clsx(
        'block w-full rounded-xl p-5 text-left transition-transform active:scale-95',
        selected
          ? 'bg-felt text-white ring-2 ring-gold'
          : 'bg-white text-stone-900 ring-1 ring-stone-200',
      )}
    >
      <div className="text-2xl font-medium">{gameType}</div>
      <div className={clsx('mt-1 text-sm', selected ? 'text-white/90' : 'text-stone-600')}>
        {playerCount} players
      </div>
    </button>
  );
}
