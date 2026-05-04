import { clsx } from 'clsx';

interface PlayerCell {
  id: string;
  name: string;
  cardCount: number;
  status?: 'turn' | 'bidder' | 'partner' | 'passed' | 'connected' | 'disconnected';
}

interface OpponentsRowProps {
  players: PlayerCell[];
}

export function OpponentsRow({ players }: OpponentsRowProps): JSX.Element {
  const colorFor = (id: string): string => {
    const palette = ['#c97f2c', '#5a8fb5', '#6a9c5b', '#b56a8a', '#8a6ab5', '#509a8a', '#b58a4a'];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return palette[Math.abs(h) % palette.length] ?? palette[0]!;
  };

  return (
    <div className="rounded-xl bg-white p-2">
      <div className="text-xs text-stone-500 uppercase tracking-wider px-1 pb-1">Other players</div>
      <div className="flex gap-2 overflow-x-auto px-1 pb-1">
        {players.map((p) => (
          <div key={p.id} className="flex flex-shrink-0 flex-col items-center gap-1">
            <div
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium text-white',
                p.status === 'turn' && 'ring-2 ring-gold',
                p.status === 'disconnected' && 'opacity-50',
              )}
              style={{ backgroundColor: colorFor(p.id) }}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-[11px] font-medium leading-tight text-stone-800">{p.name}</div>
            <div className="text-[10px] leading-tight text-stone-500">
              {p.status === 'turn' ? 'turn' : p.status === 'bidder' ? 'bidder' : p.status === 'partner' ? 'partner' : `${p.cardCount} cards`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
