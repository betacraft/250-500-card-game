import { clsx } from 'clsx';
import type { Player } from '@250-500/shared';

interface ScoreBoardProps {
  players: Player[];
  runningScores: Record<string, number>;
  targetScore: number;
  /** Highlight a specific player (e.g. current bidder) */
  highlightPlayerId?: string;
}

/** Vertical list of all players with running totals; winners highlighted. */
export function ScoreBoard({
  players,
  runningScores,
  targetScore,
  highlightPlayerId,
}: ScoreBoardProps): JSX.Element {
  const sorted = [...players].sort(
    (a, b) => (runningScores[b.id] ?? 0) - (runningScores[a.id] ?? 0),
  );
  return (
    <div className="rounded-xl bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Running scores
        </div>
        <div className="text-xs text-stone-500">target: {targetScore}</div>
      </div>
      <ul className="flex flex-col gap-2">
        {sorted.map((p) => {
          const score = runningScores[p.id] ?? 0;
          const winner = score >= targetScore;
          const highlight = p.id === highlightPlayerId;
          return (
            <li
              key={p.id}
              className={clsx(
                'flex items-center justify-between rounded-lg px-3 py-2',
                winner
                  ? 'bg-gold/30 ring-1 ring-gold-border'
                  : highlight
                    ? 'bg-felt/10'
                    : 'bg-stone-50',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-900">{p.name}</span>
                {winner && (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-medium text-gold-dark">
                    Winner
                  </span>
                )}
              </div>
              <span
                className={clsx(
                  'font-medium tabular-nums',
                  score >= 0 ? 'text-stone-900' : 'text-red-700',
                )}
              >
                {score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
