import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { cardId, cardInstanceKey, type Card, type Suit } from '@250-500/shared';
import { CardFace } from './CardFace';
import { fanMetrics } from './fan-metrics';

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
  /** Short window: one size for every phase, larger than the old 58px fan. */
  compact?: boolean;
  /** Largest fan height, in px. Big desktops pass 30% of the viewport. */
  maxHeight?: number | null;
  /** A tap on a card that cannot be played. Touch has no hover tooltip. */
  onBlocked?: (reason: string) => void;
}

/**
 * Overlapping fan. Each card's button is the visible face, rotated around
 * its bottom centre, so a click on the face hits that card. A later card
 * paints above an earlier one and wins the overlap.
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
  compact = false,
  maxHeight = null,
  onBlocked,
}: HandFanProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 360 : Math.min(window.innerWidth, 980) - 24));
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const apply = (): void => setWidth(node.clientWidth);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const metrics = fanMetrics(cards.length, width, compact, maxHeight);
  const selectedRef = useRef<Card | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const live = useRef({ canPlay, onPlay, onBlocked });
  live.current = { canPlay, onPlay, onBlocked };
  const assign = (card: Card | null): void => {
    selectedRef.current = card;
    const id = card ? cardInstanceKey(card) : null;
    flushSync(() => setSelectedId(id));
  };
  useEffect(() => {
    if (canPlay) return;
    selectedRef.current = null;
    setSelectedId(null);
  }, [canPlay]);

  const choose = (card: Card, legal: boolean): void => {
    const now = live.current;
    const key = cardInstanceKey(card);
    if (!now.canPlay || !legal) {
      now.onBlocked?.(reasons?.get(key) || (now.canPlay ? 'Not a legal play' : 'Wait for your turn'));
      return;
    }
    assign(card);
    now.onBlocked?.('');
  };
  const playChosen = (): void => {
    const now = live.current;
    const card = selectedRef.current;
    if (!now.canPlay || !card) {
      now.onBlocked?.(now.canPlay ? 'Choose a card first' : 'Wait for your turn');
      return;
    }
    selectedRef.current = null;
    setSelectedId(null);
    now.onPlay(card);
  };

  const chosen = cards.find((card) => cardInstanceKey(card) === selectedId) ?? null;
  return (
    <div>
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height: metrics.height }} data-testid="hand-fan" data-card-width={metrics.cardW}>
      {cards.map((card, index) => {
        const key = cardInstanceKey(card);
        const legal = !legalCardIds || legalCardIds.has(key);
        const angle = metrics.angle(index);
        const faceW = metrics.cardWidth(index);
        const isSelected = selectedId === key;
        return (
          <button
            key={key}
            type="button"
            data-testid="hand-card"
            data-suit={card.suit}
            data-rank={card.rank}
            aria-label={`${card.rank} of ${card.suit}`}
            aria-disabled={!canPlay || !legal}
            onPointerDown={(event) => {
              event.preventDefault();
              choose(card, legal);
            }}
            className="absolute bg-transparent p-0 touch-manipulation focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#0F766E]"
            style={{
              left: metrics.left(index),
              bottom: metrics.bottom(index),
              width: faceW,
              height: metrics.cardH,
              zIndex: isSelected ? 30 : index + 1,
              transform: `rotate(${angle}deg) translateY(${isSelected ? -18 : 0}px)`,
              transformOrigin: 'bottom center',
            }}
          >
            <span className="absolute bottom-0 left-0">
            <CardFace
              card={card}
              width={faceW}
              selected={isSelected}
              playable={canPlay && legal && !isSelected}
              disabled={!legal}
              trump={trump === card.suit}
              called={calledIds?.has(cardId(card)) ?? false}
              thirty={thirtySuits?.has(card.suit) === true && card.rank === '3'}
            />
            </span>
          </button>
        );
      })}
    </div>
    {canPlay && (
      <button
        type="button"
        data-testid="confirm-play"
        aria-disabled={!chosen}
        onPointerDown={(event) => {
          event.preventDefault();
          playChosen();
        }}
        className={`mt-1 h-12 w-full touch-manipulation rounded-xl text-base font-medium ${chosen ? 'bg-[#E8A317] text-[#1C1C24]' : 'bg-stone-300 text-stone-600'}`}
      >
        {chosen ? `Play ${chosen.rank}` : 'Play'}
      </button>
    )}
    </div>
  );
}
