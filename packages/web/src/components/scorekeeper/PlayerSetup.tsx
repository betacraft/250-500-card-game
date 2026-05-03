interface PlayerSetupProps {
  /** Player names (length matches required player count) */
  names: string[];
  /** Called when a name is changed */
  onChange: (index: number, name: string) => void;
}

/** Dynamic list of name inputs for the players in the game. */
export function PlayerSetup({ names, onChange }: PlayerSetupProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-stone-700">Players</div>
      {names.map((name, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-sm font-medium text-stone-700 tabular-nums">
            {i + 1}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={`Player ${i + 1}`}
            maxLength={40}
            className="h-11 flex-1 rounded-lg border border-stone-300 px-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-felt focus:outline-none focus:ring-2 focus:ring-felt/30"
            aria-label={`Player ${i + 1} name`}
          />
        </div>
      ))}
    </div>
  );
}
