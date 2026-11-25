import { describe, expect, it } from 'vitest';
import { declareTrumpAndPartners, playCard, setBidder, startHand, toPublicView, visiblePartners } from '@250-500/shared';
import { holdsSecretCall } from './secret-call';

describe('secret called card', () => {
  it('starts hollow for the human and fills only after the called card is played', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    let hand = startHand({ gameType: '500', seatOrder: seats, firstBidderId: 'p2', seed: 9 });
    const bidder = 'p2';
    const secret = (hand.hands.p1 ?? []).find((card) => card.suit === 'spades');
    const other = (hand.hands.p3 ?? []).find((card) => card.id !== secret?.id);
    const third = (hand.hands.p4 ?? []).find((card) => card.id !== secret?.id && card.id !== other?.id);
    if (!secret || !other || !third) throw new Error('deal had no called cards');
    hand = setBidder(hand, bidder, 300);
    hand = declareTrumpAndPartners(hand, 'hearts', [secret, other, third]);
    expect(holdsSecretCall(hand, 'p1')).toBe(true);
    expect(visiblePartners(hand)).not.toContain('p1');
    const bot = toPublicView(hand, 'p3');
    expect(bot.revealedPartners).not.toContain('p1');
    expect(bot).not.toHaveProperty('hands');
    expect(bot.slots.every((slot) => slot.filledBy === null)).toBe(true);
    expect(bot.hand.some((card) => card.id === secret.id)).toBe(false);
    const only = [secret, ...(hand.hands.p1 ?? []).filter((card) => card.suit !== secret.suit)];
    const played = playCard({
      ...hand,
      hands: { ...hand.hands, p1: only },
      toPlayerId: 'p1',
      currentTrick: [{ playerId: 'p2', card: { suit: secret.suit, rank: '4', id: 'lead' } }],
    }, 'p1', secret);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(visiblePartners(played.state)).toContain('p1');
    expect(holdsSecretCall(played.state, 'p1')).toBe(false);
    expect(toPublicView(played.state, 'p3').revealedPartners).toContain('p1');
  });
});
