import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { bidLock, botPlayDelay, cardInstanceKey, isForcedFollow, legalPlaysFor, remainingDelay, trickPause, type Card } from '@250-500/shared';
import { notePace } from '../analytics/table-events';
import { useSettingsStore } from '../stores/settings-store';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';
import { playStinger } from './stingers';

interface PaceSample {
  forced: number;
  taps: number;
  started: number;
  twoX: number;
  ticks: number;
  lockTrick: number | null;
  lockKind: 'made' | 'sunk' | null;
}

const EMPTY_PACE: PaceSample = { forced: 0, taps: 0, started: 0, twoX: 0, ticks: 0, lockTrick: null, lockKind: null };

/** Pace timers, the bid lock, and forced-card auto-play for the local table. */
export function useTablePace(): {
  lock: 'made' | 'sunk' | null;
  banner: 'made' | 'sunk' | null;
  forcedId: string | null;
  finishing: boolean;
  startFinish: () => void;
} {
  const phase = useLocalPlayStore((s) => s.phase);
  const hand = useLocalPlayStore((s) => s.hand);
  const settledTrick = useLocalPlayStore((s) => s.settledTrick);
  const speed = useSettingsStore((s) => s.playSpeed);
  const autoPlay = useSettingsStore((s) => s.autoPlayForced);
  const lock = hand && (phase === 'playing' || settledTrick) ? bidLock(hand) : null;
  const [finishing, setFinishing] = useState(false);
  const pace = useRef<PaceSample>({ ...EMPTY_PACE });
  const banner = useLockBanner(lock, phase, pace);
  usePaceReset(phase, pace, setFinishing);
  useTrickPause(settledTrick, speed, lock);
  useBotClock(phase, settledTrick, speed, lock, finishing, pace);
  const forcedId = useForcedPlay(phase, hand, settledTrick, autoPlay, finishing, pace);
  usePaceReport(phase, pace);
  return {
    lock,
    banner,
    forcedId,
    finishing,
    startFinish: () => {
      pace.current.taps += 1;
      setFinishing(true);
    },
  };
}

function usePaceReset(phase: string, pace: MutableRefObject<PaceSample>, setFinishing: (value: boolean) => void): void {
  useEffect(() => {
    if (phase !== 'bidding') return;
    pace.current = { ...EMPTY_PACE, started: performance.now() };
    setFinishing(false);
  }, [phase, pace, setFinishing]);
}

function useLockBanner(lock: 'made' | 'sunk' | null, phase: string, pace: MutableRefObject<PaceSample>): 'made' | 'sunk' | null {
  const [banner, setBanner] = useState<'made' | 'sunk' | null>(null);
  const announced = useRef(false);
  useEffect(() => {
    if (phase !== 'bidding') return;
    announced.current = false;
    setBanner(null);
  }, [phase]);
  useEffect(() => {
    if (!lock || announced.current) return undefined;
    announced.current = true;
    pace.current.lockTrick = useLocalPlayStore.getState().hand?.trickCount ?? null;
    pace.current.lockKind = lock;
    setBanner(lock);
    playStinger(lock, useSettingsStore.getState().soundMuted);
    const timer = window.setTimeout(() => setBanner(null), 1200);
    return () => window.clearTimeout(timer);
  }, [lock, pace]);
  return banner;
}

function useTrickPause(settledTrick: unknown, speed: 'normal' | 'fast', lock: 'made' | 'sunk' | null): void {
  const dismissTrick = useLocalPlayStore((s) => s.dismissTrick);
  useEffect(() => {
    if (!settledTrick) return undefined;
    const timer = window.setTimeout(() => dismissTrick(), trickPause(speed, lock !== null));
    return () => window.clearTimeout(timer);
  }, [settledTrick, dismissTrick, speed, lock]);
}

function useBotClock(phase: string, settledTrick: unknown, speed: 'normal' | 'fast', lock: 'made' | 'sunk' | null, finishing: boolean, pace: MutableRefObject<PaceSample>): void {
  const decision = useLocalPlayStore((s) => s.decision);
  const hand = useLocalPlayStore((s) => s.hand);
  const bidHistory = useLocalPlayStore((s) => s.bidHistory);
  const lastComputeMs = useLocalPlayStore((s) => s.lastComputeMs);
  const stepBot = useLocalPlayStore((s) => s.stepBot);
  const finishStep = useLocalPlayStore((s) => s.finishStep);
  useEffect(() => {
    if (phase === 'setup' || phase === 'scored' || settledTrick) return undefined;
    const playing = phase === 'playing';
    const target = playing ? botPlayDelay(speed, lock !== null) : 220;
    const wait = playing ? remainingDelay(target, lastComputeMs) : 220;
    pace.current.ticks += 1;
    if (speed === 'fast') pace.current.twoX += 1;
    const timer = window.setTimeout(() => {
      if (finishing && playing) finishStep();
      else stepBot();
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, decision, hand?.toPlayerId, hand?.currentTrick.length, bidHistory.length, settledTrick, stepBot, finishStep, speed, lock, lastComputeMs, finishing, pace]);
}

function useForcedPlay(
  phase: string,
  hand: ReturnType<typeof useLocalPlayStore.getState>['hand'],
  settledTrick: unknown,
  autoPlay: boolean,
  finishing: boolean,
  pace: MutableRefObject<PaceSample>,
): string | null {
  const play = useLocalPlayStore((s) => s.play);
  const legalCards = hand && phase === 'playing' && hand.toPlayerId === HUMAN_ID && !settledTrick ? legalPlaysFor(hand, HUMAN_ID) : [];
  const forced = autoPlay && !finishing && isForcedFollow((hand?.currentTrick.length ?? 0) === 0, legalCards);
  const card = forced ? legalCards[0] ?? null : null;
  const key = card ? cardInstanceKey(card) : '';
  const held = useRef<Card | null>(null);
  held.current = card;
  useEffect(() => {
    const next = held.current;
    if (!next) return undefined;
    pace.current.forced += 1;
    const timer = window.setTimeout(() => play(next), 300);
    return () => window.clearTimeout(timer);
  }, [key, play, pace]);
  return key || null;
}

function usePaceReport(phase: string, pace: MutableRefObject<PaceSample>): void {
  const reported = useRef(false);
  useEffect(() => {
    if (phase === 'bidding') reported.current = false;
  }, [phase]);
  useEffect(() => {
    if (phase !== 'scored' || reported.current) return;
    reported.current = true;
    const sample = pace.current;
    const share = sample.ticks === 0 ? 0 : sample.twoX / sample.ticks;
    notePace({
      duration_ms: Math.round(performance.now() - sample.started),
      forced_autoplay: sample.forced,
      lock_trick: sample.lockTrick,
      lock_type: sample.lockKind,
      finish_taps: sample.taps,
      speed_2x_share: Math.round(share * 1000) / 1000,
    });
  }, [phase, pace]);
}
