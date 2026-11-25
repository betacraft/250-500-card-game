import { describe, expect, it } from 'vitest';
import { declareTrumpAndPartners, playCard, setBidder, startHand } from '@250-500/shared';
import { headerPartnerIds } from './partner-header';

describe('partner header', () => {
  it('lists a partner as soon as they play a called card, and not before', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    let hand = startHand({ gameType: '250', seatOrder: seats, firstBidderId: 'p2', seed: 4 });
    const bidder = 'p2';
    const called = (hand.hands.p1 ?? []).slice(0, 1);
    const other = (hand.hands.p4 ?? []).find((card) => called.every((item) => item.id !== card.id));
    if (!called[0] || !other) throw new Error('deal had no called cards');
    hand = setBidder(hand, bidder, 170);
    hand = declareTrumpAndPartners(hand, 'hearts', [called[0], other]);
    expect(headerPartnerIds(hand, null)).toEqual([]);
    const played = playCard({ ...hand, toPlayerId: 'p1', currentTrick: [] }, 'p1', called[0]);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(headerPartnerIds(played.state, null)).toEqual(['p1']);
    expect(headerPartnerIds(played.state, null)).not.toContain('p4');
  });

  it('uses the scored partner list once the hand is over, even if nobody played the card', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    let hand = startHand({ gameType: '250', seatOrder: seats, firstBidderId: 'p2', seed: 4 });
    const first = (hand.hands.p1 ?? [])[0];
    const second = (hand.hands.p3 ?? [])[0];
    if (!first || !second) throw new Error('deal had no called cards');
    hand = setBidder(hand, 'p2', 170);
    hand = declareTrumpAndPartners(hand, 'hearts', [first, second]);
    expect(headerPartnerIds(hand, null)).toEqual([]);
    expect(headerPartnerIds(hand, ['p3', 'p1', 'p2'])).toEqual(['p1', 'p3']);
  });
});
