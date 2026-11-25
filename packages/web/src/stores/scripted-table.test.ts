import { afterEach, describe, expect, it } from 'vitest';
import { forcedAuctionAction, scriptedOpening } from './scripted-table';

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('scripted table', () => {
  it('bids the floor until the auction is long, then passes', () => {
    window.history.pushState({}, '', '/play?script=long');
    expect(forcedAuctionAction('250', [])).toEqual({ action: 'bid', amount: 160 });
    const long = Array.from({ length: 11 }, () => ({ playerId: 'p2', action: 'bid' as const, amount: 160 }));
    expect(forcedAuctionAction('250', long)).toEqual({ action: 'pass' });
    window.history.pushState({}, '', '/play');
    expect(forcedAuctionAction('250', [])).toBeNull();
  });

  it('opens a made contract that ends at target 1 and stays open at 1000', () => {
    window.history.pushState({}, '', '/play?script=over&target=1');
    const ended = scriptedOpening('500', 'Ada');
    const endedSummary = ended?.summary;
    if (!ended || !endedSummary) throw new Error('missing 500 result');
    expect(ended.gameOver).toBe(true);
    expect(endedSummary.bidMade).toBe(true);
    expect(endedSummary.partners.length).toBeGreaterThan(0);
    expect(endedSummary.scoreDeltas[endedSummary.bidder]).toBe(endedSummary.bidAmount + 200);
    window.history.pushState({}, '', '/play?script=over');
    const open = scriptedOpening('250', 'Ada');
    const openSummary = open?.summary;
    if (!open || !openSummary) throw new Error('missing 250 result');
    expect(open.gameOver).toBe(false);
    expect(openSummary.bidMade).toBe(true);
    expect(openSummary.scoreDeltas[openSummary.bidder]).toBe(openSummary.bidAmount + 100);
  });

  it('opens a declared hand with nobody revealed, and keeps a reveal on the table', () => {
    window.history.pushState({}, '', '/play?script=declared');
    const declared = scriptedOpening('250', 'Ada');
    expect(declared?.hand.trump).toBe('hearts');
    expect(declared?.hand.bidAmount).toBe(160);
    expect(declared?.hand.toPlayerId).toBe('p1');
    expect(declared?.hand.shownPartners.size).toBe(0);
    window.history.pushState({}, '', '/play?script=reveal');
    const reveal = scriptedOpening('250', 'Ada');
    expect(reveal?.hand.toPlayerId).toBeNull();
    expect(reveal?.hand.currentTrick).toHaveLength(1);
    expect(reveal?.hand.shownPartners.size).toBe(1);
    const five = scriptedOpening('500', 'Ada');
    expect(five?.hand.toPlayerId).toBeNull();
    expect(five?.hand.currentTrick.length).toBeGreaterThan(1);
    expect(five?.hand.slots.some((slot) => slot.filledBy)).toBe(true);
  });

  it('opens a trick the human has not led', () => {
    window.history.pushState({}, '', '/play?script=trick');
    const table = scriptedOpening('250', 'Ada');
    expect(table?.phase).toBe('playing');
    expect(table?.hand.currentTrick.length).toBeGreaterThan(0);
    expect(table?.hand.toPlayerId).toBe('p1');
  });
});
