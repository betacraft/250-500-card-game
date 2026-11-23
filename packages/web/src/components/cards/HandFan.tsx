import { Fragment, useEffect, useRef, useState } from 'react';
import { cardId, cardInstanceKey, type Card, type Suit } from '@250-500/shared';
import { CardFace } from './CardFace';

interface HandFanProps {
  cards: readonly Card[];
  legalCardIds?: Set<string>;
  canPlay: boolean;
  onPlay: (card: Card) => void;
  trump?: Suit | null;
  /** Suits whose first 3 has not been played yet. */
  thirtySuits?: ReadonlySet<Suit>;
  calledIds?: ReadonlySet<string>;
  reasons?: ReadonlyMap<string, string>;
}

/**
 * Overlapping fan. Rotation is around the bottom centre.
 * 500 portrait is a 16° fan; the index is a 44px hit box above the overlap.
 */
export function HandFan({
  cards,
  legalCardIds,
  canPlay,
  onPlay,
  trump = null,
  thirtySuits,
  calledIds,
  reasons,
}: HandFanProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const apply = (): void => setWidth(node.clientWidth);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const metrics = fanMetrics(cards.length, width);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const chosen = cards.find((card) => cardInstanceKey(card) === selectedId) ?? null;
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height: metrics.cardH + 72 }} data-testid="hand-fan">
      {cards.map((card, index) => {
        const key = cardInstanceKey(card);
        const legal = !legalCardIds || legalCardIds.has(key);
        const angle = metrics.angle(index);
        const isSelected = selectedId === key;
        return (
          <Fragment key={key}>
          <div
            className="pointer-events-none absolute"
            style={{
              left: metrics.left(index),
              bottom: 56,
              width: metrics.cardW,
              zIndex: isSelected ? 20 : index + 1,
              transform: `rotate(${angle}deg) translateY(${isSelected ? -18 : 0}px)`,
              transformOrigin: 'bottom center',
            }}
          >
            <CardFace
              card={card}
              width={metrics.cardW}
              selected={isSelected}
              playable={canPlay && legal && !isSelected}
              disabled={!legal}
              trump={trump === card.suit}
              called={calledIds?.has(cardId(card)) ?? false}
              thirty={thirtySuits?.has(card.suit) === true && card.rank === '3'}
            />
          </div>
          <button
            type="button"
            data-testid="hand-card"
            aria-label={`${card.rank} of ${card.suit}`}
            title={reasons?.get(key) || undefined}
            disabled={!canPlay || !legal}
            onClick={() => setSelectedId(key)}
            className={`absolute top-0 h-11 min-w-11 bg-transparent ${legal ? 'z-40' : 'pointer-events-none z-20'}`}
            style={{ left: metrics.hitLeft(index), width: metrics.hitW }}
          />
          </Fragment>
        );
      })}
      {canPlay && chosen && (
        <button
          type="button"
          data-testid="confirm-play"
          onClick={() => {
            onPlay(chosen);
            setSelectedId(null);
          }}
          className="absolute inset-x-2 bottom-0 z-50 h-12 rounded-xl bg-[#E8A317] text-base font-medium text-[#1C1C24]"
        >
          Play {chosen.rank}
        </button>
      )}
    </div>
  );
}

function fanMetrics(count: number, container: number): {
  cardW: number;
  cardH: number;
  left: (index: number) => number;
  angle: (index: number) => number;
  hitLeft: (index: number) => number;
  hitW: number;
} {
  const wide = container >= 1000;
  const inset = wide ? 48 : 40;
  const base = wide ? (count > 8 ? 156 : 176) : count > 8 ? 84 : 96;
  const span = Math.max(container - inset * 2, 220);
  const cardW = Math.min(base, span);
  const step = count <= 1 ? 0 : Math.min(cardW * 0.62, (span - cardW) / Math.max(count - 1, 1));
  const cardH = cardW * 1.4;
  const total = wide ? (count > 8 ? 18 : 16) : 14;
  const origin = (span - (cardW + step * Math.max(count - 1, 0))) / 2;
  const hitW = count <= 1 ? 48 : Math.max(44, Math.floor((span + inset) / count));
  return {
    cardW,
    cardH,
    left: (index) => inset + origin + index * step,
    angle: (index) => (count <= 1 ? 0 : -total / 2 + (index * total) / (count - 1)),
    hitLeft: (index) => (count <= 1 ? 8 : index * ((span - hitW) / (count - 1))),
    hitW,
  };
}
