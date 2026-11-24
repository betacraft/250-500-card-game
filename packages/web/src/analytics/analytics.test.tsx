import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { legalPlaysFor, nextBidder, rulesFor } from '@250-500/shared';
import { ExportAnalyticsButton } from './ExportAnalyticsButton';
import { isAnalyticsEnabled } from './flag';
import { installAnalytics, resetAnalyticsForTests } from './index';
import { setLocalTargetForTests } from './local-target';
import { registerSink, track } from './track';
import { noteHandComplete, noteSettingsChanged, trackAdWatched, trackPurchase } from './table-events';
import type { AnalyticsEvent } from './types';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';
import { useSettingsStore } from '../stores/settings-store';

function enable(): void {
  resetAnalyticsForTests();
  localStorage.setItem('analytics_enabled', '1');
  installAnalytics();
}

function names(): string[] {
  return window.__analytics?.events().map((event) => event.name) ?? [];
}

function one(name: string): AnalyticsEvent {
  const found = window.__analytics?.events().find((event) => event.name === name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

describe('analytics flag', () => {
  beforeEach(() => {
    useLocalPlayStore.getState().leave();
    resetAnalyticsForTests();
    window.history.pushState({}, '', '/');
  });

  it('is off by default and writes nothing', () => {
    expect(isAnalyticsEnabled()).toBe(false);
    installAnalytics();
    track('game_start', {});
    noteHandComplete(false, 160, 40, true, true);
    trackAdWatched();
    trackPurchase();
    expect(window.__analytics?.events()).toEqual([]);
    expect(window.__analytics?.sessionId).toBeNull();
    expect(localStorage.getItem('analytics_events')).toBeNull();
    expect(localStorage.getItem('analytics_anon_id')).toBeNull();
    expect(localStorage.getItem('analytics_visit')).toBeNull();
    expect(localStorage.getItem('analytics_first_hand')).toBeNull();
    expect(document.cookie).toBe('');
  });

  it('turns on from the query or localStorage', () => {
    window.history.pushState({}, '', '/?analytics=1');
    expect(isAnalyticsEnabled()).toBe(true);
    window.history.pushState({}, '', '/');
    expect(isAnalyticsEnabled()).toBe(false);
    localStorage.setItem('analytics_enabled', '1');
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('records a session, a return visit, and common fields', () => {
    resetAnalyticsForTests();
    localStorage.setItem('analytics_enabled', '1');
    localStorage.setItem('analytics_visit', JSON.stringify({ count: 1, last_ts: Date.now() - 2 * 86_400_000 }));
    installAnalytics();
    const start = one('session_start');
    expect(start.session_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(start.anon_player_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(start.anon_player_id).not.toContain(navigator.userAgent);
    expect(start.game).toBeNull();
    expect(start.build).toBe('dev');
    expect(typeof start.ts).toBe('number');
    expect(start.viewport === 'phone' || start.viewport === 'desktop').toBe(true);
    const visit = one('return_visit');
    expect(visit.props).toMatchObject({ days_since_last: 2, visit_count: 2 });
    expect(window.__analytics?.sessionId).toBe(start.session_id);
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    expect(names().filter((name) => name === 'session_end')).toHaveLength(1);
    expect(one('session_end').props.session_length_ms).toEqual(expect.any(Number));
    expect(names()).toEqual(expect.arrayContaining(['tab_hidden', 'pause', 'tab_visible', 'resume']));
  });

  it('keeps the last 500 events and survives a throwing sink', () => {
    enable();
    registerSink({ write(): void { throw new Error('sink failed'); } });
    for (let index = 0; index < 501; index += 1) track('ping', { index });
    const events = window.__analytics?.events() ?? [];
    expect(events).toHaveLength(500);
    expect(events.some((event) => event.props.index === 0)).toBe(false);
    expect(events.at(-1)?.props.index).toBe(500);
    expect(() => track('game_start', {})).not.toThrow();
  });

  it('does not call fetch, XHR, or sendBeacon', () => {
    const fetchMock = vi.fn();
    const beacon = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => undefined);
    const send = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    enable();
    track('game_start', {});
    trackAdWatched();
    trackPurchase();
    noteSettingsChanged('reducedMotion', 'never');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    open.mockRestore();
    send.mockRestore();
  });

  it('exports JSON and shows the debug button only for ?debug=1', () => {
    enable();
    track('game_start', {});
    const parsed = JSON.parse(window.__analytics?.export() ?? '{}') as { enabled: boolean; events: AnalyticsEvent[] };
    expect(parsed.enabled).toBe(true);
    expect(parsed.events.some((event) => event.name === 'game_start')).toBe(true);
    window.history.pushState({}, '', '/');
    const hidden = render(<ExportAnalyticsButton />);
    expect(hidden.queryByTestId('export-analytics')).toBeNull();
    hidden.unmount();
    window.history.pushState({}, '', '/?debug=1&analytics=1');
    render(<ExportAnalyticsButton />);
    expect(screen.getByRole('button', { name: 'Export analytics' })).toBeInTheDocument();
  });
});

describe('table events', () => {
  beforeEach(() => {
    localStorage.removeItem('analytics_enabled');
    useLocalPlayStore.getState().leave();
    resetAnalyticsForTests();
  });

  it('emits the hand funnel with the committed props', () => {
    enable();
    const store = useLocalPlayStore;
    store.getState().startGame('250', 'Ada');
    for (let guard = 0; guard < 800; guard += 1) {
      const state = store.getState();
      if (state.phase === 'scored') break;
      if (state.settledTrick) {
        store.getState().dismissTrick();
        continue;
      }
      if (state.phase === 'bidding') {
        const turn = nextBidder({ gameType: state.gameType, playerIds: state.seatOrder, firstBidderId: state.firstBidderId, bidHistory: state.bidHistory });
        if (turn === HUMAN_ID) store.getState().pass();
        else store.getState().stepBot();
        continue;
      }
      if (state.phase === 'declaring' && state.hand) {
        if (state.hand.bidder === HUMAN_ID) {
          const held = state.hand.hands[HUMAN_ID] ?? [];
          store.getState().declare(held[0]?.suit ?? 'spades', held.slice(0, rulesFor('250').PARTNERS_TO_CALL));
        } else store.getState().stepBot();
        continue;
      }
      if (state.phase === 'playing' && state.hand?.toPlayerId) {
        if (state.hand.toPlayerId === HUMAN_ID) {
          const card = legalPlaysFor(state.hand, HUMAN_ID)[0];
          if (!card) throw new Error('no legal card');
          store.getState().play(card);
        } else store.getState().stepBot();
      }
    }
    const summary = useLocalPlayStore.getState().summary;
    if (!summary) throw new Error('hand did not finish');
    expect(one('game_start').game).toBe('250');
    expect(one('game_start').mode).toBe('local');
    expect(one('game_start').difficulty).toBe('easy');
    expect(one('difficulty_selected').props).toEqual({ value: 'easy' });
    expect(names()).toContain('hand_start');
    const bid = one('bid_placed');
    expect(bid.props.action === 'bid' || bid.props.action === 'pass').toBe(true);
    expect(one('auction_won').props.bidder === 'human' || one('auction_won').props.bidder === 'bot').toBe(true);
    expect(typeof one('auction_won').props.bid).toBe('number');
    expect(one('cards_called').props.count).toBe(2);
    expect(one('hand_complete').props).toEqual({
      made: summary.bidMade,
      bid: summary.bidAmount,
      points: summary.pointsCollected,
      bidder_is_human: summary.bidder === HUMAN_ID,
    });
    if (!summary.bidMade) {
      expect(one('contract_failed').props).toEqual({ bid: summary.bidAmount, points: summary.pointsCollected });
    }
    expect(names().filter((name) => name === 'first_hand_finished')).toHaveLength(1);
    noteHandComplete(false, 10, 1, false, true);
    expect(names().filter((name) => name === 'first_hand_finished')).toHaveLength(1);
    expect(one('contract_failed').props.bid).toBe(summary.bidMade ? 10 : summary.bidAmount);
    useSettingsStore.getState().setReducedMotion('never');
    expect(one('settings_changed').props).toEqual({ key: 'reducedMotion', value: 'never' });
    trackAdWatched();
    trackPurchase();
    expect(names()).toEqual(expect.arrayContaining(['ad_watched', 'purchase']));
    useLocalPlayStore.getState().leave('new_game');
    expect(names()).not.toContain('game_complete');
    expect(one('game_abandoned').props).toMatchObject({ hands_played: 1, reason: 'new_game' });
    expect(typeof one('game_abandoned').props.human_score).toBe('number');
    const order = names();
    expect(order.indexOf('game_abandoned')).toBeLessThan(order.indexOf('new_game'));
  });

  it('emits game_complete only when a score reaches the target', () => {
    setLocalTargetForTests(1);
    enable();
    const store = useLocalPlayStore;
    store.getState().startGame('250', 'Ada');
    for (let hands = 0; hands < 8 && !store.getState().gameOver; hands += 1) {
      for (let guard = 0; guard < 800 && store.getState().phase !== 'scored' && !store.getState().gameOver; guard += 1) {
        const state = store.getState();
        if (state.settledTrick) {
          store.getState().dismissTrick();
          continue;
        }
        if (state.phase === 'bidding') {
          const turn = nextBidder({ gameType: state.gameType, playerIds: state.seatOrder, firstBidderId: state.firstBidderId, bidHistory: state.bidHistory });
          if (turn === HUMAN_ID) store.getState().pass();
          else store.getState().stepBot();
          continue;
        }
        if (state.phase === 'declaring' && state.hand) {
          if (state.hand.bidder === HUMAN_ID) {
            const held = state.hand.hands[HUMAN_ID] ?? [];
            store.getState().declare(held[0]?.suit ?? 'spades', held.slice(0, rulesFor('250').PARTNERS_TO_CALL));
          } else store.getState().stepBot();
          continue;
        }
        if (state.phase === 'playing' && state.hand?.toPlayerId) {
          if (state.hand.toPlayerId === HUMAN_ID) {
            const card = legalPlaysFor(state.hand, HUMAN_ID)[0];
            if (!card) throw new Error('no legal card');
            store.getState().play(card);
          } else store.getState().stepBot();
        }
      }
      if (!store.getState().gameOver && store.getState().phase === 'scored') store.getState().nextHand();
    }
    expect(store.getState().gameOver).toBe(true);
    expect(names().filter((name) => name === 'game_complete')).toHaveLength(1);
    expect(typeof one('game_complete').props.human_score).toBe('number');
    expect(['human', 'bot', 'tie']).toContain(one('game_complete').props.winner);
    expect(Number(one('game_complete').props.hands_played)).toBeGreaterThan(0);
    store.getState().leave('home');
    expect(names().filter((name) => name === 'game_complete')).toHaveLength(1);
    expect(names()).not.toContain('game_abandoned');
    setLocalTargetForTests(null);
  });

  it('records home as an abandon', () => {
    enable();
    useLocalPlayStore.getState().startGame('250', 'Ada');
    useLocalPlayStore.getState().leave('home');
    expect(names()).not.toContain('game_complete');
    expect(one('game_abandoned').props).toEqual({ hands_played: 0, human_score: 0, reason: 'home' });
  });
});
