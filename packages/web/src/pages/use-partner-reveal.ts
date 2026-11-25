import { useEffect, useRef, useState } from 'react';
import type { GameHand } from '@250-500/shared';
import { HUMAN_ID } from '../stores/local-play-store';
import { useSettingsStore } from '../stores/settings-store';
import { headerPartnerIds } from './partner-header';
import { playRevealChime } from './reveal-chime';
import {
  EMPTY_REVEAL_QUEUE,
  pushReveals,
  revealNotices,
  tickReveal,
  type RevealNotice,
  type RevealQueue,
} from './reveal-queue';

/** What the table paints for partners the cards have revealed. */
export interface RevealCue {
  current: RevealNotice | null;
  partnerIds: readonly string[];
  reduced: boolean;
}

/** Queue a toast for each newly revealed partner. Hidden partners never enter the list. */
export function usePartnerReveal(hand: GameHand | null, names: Record<string, string>): RevealCue {
  const revealed = hand ? headerPartnerIds(hand, null) : [];
  const key = revealed.join('|');
  const [queue, setQueue] = useState<RevealQueue>(EMPTY_REVEAL_QUEUE);
  const seen = useRef<readonly string[] | null>(null);
  const chimed = useRef('');
  const namesRef = useRef(names);
  const revealedRef = useRef(revealed);
  namesRef.current = names;
  revealedRef.current = revealed;
  const reduced = useReducedMotion();

  useEffect(() => {
    const currentIds = revealedRef.current;
    const prior = seen.current ?? [];
    const notices = revealNotices(prior, currentIds, namesRef.current, HUMAN_ID);
    seen.current = currentIds;
    if (notices.length > 0) {
      const stamp = notices.map((notice) => notice.playerId).join('|');
      if (chimed.current !== stamp) {
        chimed.current = stamp;
        playRevealChime(useSettingsStore.getState().soundMuted);
      }
      setQueue((current) => pushReveals(current, notices, Date.now()));
    }
    return () => {
      seen.current = prior;
    };
  }, [key]);

  useEffect(() => {
    if (!queue.current) return undefined;
    const delay = Math.max(0, queue.until - Date.now());
    const timer = window.setTimeout(() => {
      setQueue((current) => tickReveal(current, Date.now()));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [queue]);

  return { current: queue.current, partnerIds: revealed, reduced };
}

function useReducedMotion(): boolean {
  const mode = useSettingsStore((s) => s.reducedMotion);
  const [os, setOs] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => setOs(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return os;
}
