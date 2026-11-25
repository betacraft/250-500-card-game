import { describe, expect, it } from 'vitest';
import { legalPlaysFor, nextBidder, rulesFor } from '@250-500/shared';
import { HUMAN_ID, useLocalPlayStore } from './local-play-store';

describe('local play store', () => {
  it('holds the last trick on the table until it is dismissed', () => {
    const store = useLocalPlayStore;
    store.getState().leave();
    store.getState().startGame('250', 'Ada', 'easy', 17);
    for (let guard = 0; guard < 800; guard += 1) {
      const state = store.getState();
      if (state.settledTrick && state.hand?.ended) {
        expect(state.phase).toBe('playing');
        expect(state.summary?.scoreDeltas).toBeTruthy();
        expect(Object.values(state.runningScores).every((score) => score === 0)).toBe(true);
        store.getState().dismissTrick();
        expect(store.getState().phase).toBe('scored');
        expect(store.getState().settledTrick).toBeNull();
        return;
      }
      if (state.settledTrick) {
        store.getState().dismissTrick();
        continue;
      }
      if (state.phase === 'bidding') {
        const turn = nextBidder({
          gameType: state.gameType,
          playerIds: state.seatOrder,
          firstBidderId: state.firstBidderId,
          bidHistory: state.bidHistory,
        });
        if (turn === HUMAN_ID) store.getState().pass();
        else store.getState().stepBot();
        continue;
      }
      if (state.phase === 'declaring' && state.hand) {
        if (state.hand.bidder === HUMAN_ID) {
          const held = state.hand.hands[HUMAN_ID] ?? [];
          const trump = held[0]?.suit ?? 'spades';
          store.getState().declare(trump, held.slice(0, rulesFor('250').PARTNERS_TO_CALL));
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
    throw new Error('the hand never finished');
  });
});
