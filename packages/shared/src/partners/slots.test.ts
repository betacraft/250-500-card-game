import { describe, it, expect } from 'vitest';
import {
  initSlots,
  applyCardToSlots,
  applyClockwiseDefault,
  partnersFromSlots,
  wouldBeSelfReveal,
} from './slots';
import type { Card } from '../cards/types';

const QH: Card = { suit: 'hearts', rank: 'Q' };
const KD: Card = { suit: 'diamonds', rank: 'K' };
const JS: Card = { suit: 'spades', rank: 'J' };

describe('partner slots', () => {
  it('initSlots creates one slot per called card, all unfilled', () => {
    const slots = initSlots([QH, KD]);
    expect(slots).toEqual([
      { card: QH, filledBy: null },
      { card: KD, filledBy: null },
    ]);
  });

  it('first non-bidder play fills the slot and creates a new partner', () => {
    const slots = initSlots([QH, KD]);
    const result = applyCardToSlots({
      playerId: 'p3',
      card: QH,
      bidderId: 'p1',
      currentPartners: new Set(),
      slots,
    });
    expect(result.slotIndex).toBe(0);
    expect(result.newPartner).toBe('p3');
    expect(result.slots[0]?.filledBy).toBe('p3');
  });

  it('bidder play of a called card does NOT consume the slot', () => {
    const slots = initSlots([QH, KD]);
    const result = applyCardToSlots({
      playerId: 'p1',
      card: QH,
      bidderId: 'p1',
      currentPartners: new Set(),
      slots,
    });
    expect(result.slotIndex).toBeNull();
    expect(result.newPartner).toBeNull();
    expect(result.slots[0]?.filledBy).toBeNull();
  });

  it('already-partner playing another called card consumes slot but adds no new partner', () => {
    const slots = initSlots([QH, KD]);
    // p3 is already a partner via a different mechanism
    const result = applyCardToSlots({
      playerId: 'p3',
      card: QH,
      bidderId: 'p1',
      currentPartners: new Set(['p3']),
      slots,
    });
    expect(result.slotIndex).toBe(0);
    expect(result.newPartner).toBeNull();
    expect(result.slots[0]?.filledBy).toBe('p3');
  });

  it('second copy played by someone else does NOT fill slot (already filled)', () => {
    let slots = initSlots([QH]);
    slots = applyCardToSlots({ playerId: 'p3', card: QH, bidderId: 'p1', currentPartners: new Set(), slots }).slots;
    const result = applyCardToSlots({ playerId: 'p5', card: QH, bidderId: 'p1', currentPartners: new Set(['p3']), slots });
    expect(result.slotIndex).toBeNull();
    expect(result.newPartner).toBeNull();
  });

  it('clockwise-default fills unfilled slots with closest-clockwise non-bidder holder', () => {
    const slots = initSlots([QH, KD, JS]);
    const seatOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const holders = new Map<string, ReadonlySet<string>>([
      ['Qh', new Set(['p1', 'p4'])], // p1 is bidder; p4 is the only non-bidder holder
      ['Kd', new Set(['p7', 'p3'])], // closest clockwise from p1 is p3
      ['Js', new Set(['p1', 'p1'])], // both copies with bidder — slot stays empty
    ]);
    const result = applyClockwiseDefault({ slots, bidderId: 'p1', seatOrder, holdersByCardId: holders });
    expect(result[0]?.filledBy).toBe('p4'); // QH
    expect(result[1]?.filledBy).toBe('p3'); // KD
    expect(result[2]?.filledBy).toBeNull(); // JS — both with bidder
  });

  it('partnersFromSlots dedupes (same player filling multiple slots)', () => {
    const slots = [
      { card: QH, filledBy: 'p3' },
      { card: KD, filledBy: 'p3' },
      { card: JS, filledBy: 'p5' },
    ];
    expect(partnersFromSlots(slots, 'p1').sort()).toEqual(['p3', 'p5']);
  });

  it('partnersFromSlots excludes bidder if somehow listed', () => {
    const slots = [{ card: QH, filledBy: 'p1' }];
    expect(partnersFromSlots(slots, 'p1')).toEqual([]);
  });

  it('wouldBeSelfReveal: true if leading a called card and not bidder', () => {
    const slots = initSlots([QH]);
    const result = wouldBeSelfReveal({
      playerId: 'p3',
      card: QH,
      isLeadingTrick: true,
      bidderId: 'p1',
      slots,
    });
    expect(result).toBe(true);
  });

  it('wouldBeSelfReveal: false if not leading (forced to follow suit)', () => {
    const slots = initSlots([QH]);
    expect(
      wouldBeSelfReveal({
        playerId: 'p3',
        card: QH,
        isLeadingTrick: false,
        bidderId: 'p1',
        slots,
      }),
    ).toBe(false);
  });

  it('wouldBeSelfReveal: false for bidder leading their own called card', () => {
    const slots = initSlots([QH]);
    expect(
      wouldBeSelfReveal({
        playerId: 'p1',
        card: QH,
        isLeadingTrick: true,
        bidderId: 'p1',
        slots,
      }),
    ).toBe(false);
  });

  it('wouldBeSelfReveal: false if leading a non-called card', () => {
    const slots = initSlots([QH]);
    expect(
      wouldBeSelfReveal({
        playerId: 'p3',
        card: KD,
        isLeadingTrick: true,
        bidderId: 'p1',
        slots,
      }),
    ).toBe(false);
  });
});
