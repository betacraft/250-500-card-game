import type { Suit } from '@250-500/shared';
import { SuitIcon } from '../components/shared/SuitIcon';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

/** Large copy of the trump and led labels, for checking the four pips. */
export function SuitLabelSheet(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col gap-4 bg-[#F5F1E8] px-4 py-6" data-testid="suit-label-sheet">
      <h1 className="text-base font-medium">Suit labels at 2.5× the 18px header size</h1>
      <section className="flex flex-col gap-3 rounded-xl bg-white p-4">
        {SUITS.map((suit) => (
          <p key={`trump-${suit}`} className="flex items-center gap-3 text-lg">
            Trump: {suit} <SuitIcon suit={suit} size={46} className="shrink-0" />
          </p>
        ))}
      </section>
      <section className="flex flex-col gap-3 rounded-xl bg-felt p-4 text-lg text-white">
        {SUITS.map((suit) => (
          <p key={`led-${suit}`} className="flex items-center gap-3">
            Led: {suit} <SuitIcon suit={suit} size={46} className="shrink-0" />
          </p>
        ))}
      </section>
    </main>
  );
}
