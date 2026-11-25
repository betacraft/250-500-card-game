import type { Card } from '../cards/types';
import { cardId } from '../cards/types';

/** A single partner slot defined by a called card. */
export interface PartnerSlot {
  card: Card;
  /** PlayerId who filled the slot, or null if still open */
  filledBy: string | null;
}

/** Initialize partner slots for the called cards. */
export function initSlots(calledCards: readonly Card[]): PartnerSlot[] {
  return calledCards.map((card) => ({ card, filledBy: null }));
}

interface PlaySlotInput {
  /** Player who just played the card */
  playerId: string;
  /** The card played */
  card: Card;
  /** Bidder (excluded from filling slots) */
  bidderId: string;
  /** Current set of partner ids (including bidder typically? exclude bidder) */
  currentPartners: ReadonlySet<string>;
  /** Current slots */
  slots: readonly PartnerSlot[];
}

/** Returns updated slots and whether a NEW non-bidder partner was added.
 * Rules (RULES.md):
 * - The first NON-BIDDER to play a copy of a called card fills the slot.
 * - If they're already a partner via another slot, the slot is consumed but wasted.
 * - Bidder plays of called cards never consume slots.
 */
export function applyCardToSlots(args: PlaySlotInput): {
  slots: PartnerSlot[];
  newPartner: string | null;
  slotIndex: number | null;
} {
  // Bidder plays never affect slots
  if (args.playerId === args.bidderId) {
    return { slots: args.slots.slice(), newPartner: null, slotIndex: null };
  }
  const slotIndex = args.slots.findIndex(
    (s) => s.filledBy === null && cardId(s.card) === cardId(args.card),
  );
  if (slotIndex === -1) {
    return { slots: args.slots.slice(), newPartner: null, slotIndex: null };
  }
  const updated = args.slots.slice();
  const slot = updated[slotIndex];
  if (!slot) return { slots: updated, newPartner: null, slotIndex: null };
  updated[slotIndex] = { ...slot, filledBy: args.playerId };
  const newPartner = args.currentPartners.has(args.playerId) ? null : args.playerId;
  return { slots: updated, newPartner, slotIndex };
}

/** Literal: closest clockwise holder takes the slot even if already a partner.
 * skip-existing-partner: walk past holders who already fill a slot. */
export type ClockwiseDefaultFlag = 'literal' | 'skip-existing-partner';

/** Default matches RULES.md: a wasted slot still lands on the closest holder. */
export const DEFAULT_CLOCKWISE_FLAG: ClockwiseDefaultFlag = 'literal';

/** Apply the clockwise-default rule at hand-end: any unfilled slot is filled by
 * the closest-clockwise NON-BIDDER holder of a copy of the called card.
 * `seatOrder` is players in clockwise seat order; `holdersByCardId` maps cardId
 * to the set of player IDs that received that card in the deal.
 * 500 only. 250 does not call this.
 */
export function applyClockwiseDefault(args: {
  slots: readonly PartnerSlot[];
  bidderId: string;
  seatOrder: readonly string[];
  holdersByCardId: ReadonlyMap<string, ReadonlySet<string>>;
  flag?: ClockwiseDefaultFlag;
}): PartnerSlot[] {
  const flag = args.flag ?? DEFAULT_CLOCKWISE_FLAG;
  const bidderIdx = args.seatOrder.indexOf(args.bidderId);
  const taken = new Set<string>();
  for (const slot of args.slots) {
    if (slot.filledBy) taken.add(slot.filledBy);
  }
  return args.slots.map((slot) => {
    if (slot.filledBy !== null) return slot;
    const id = cardId(slot.card);
    const holders = args.holdersByCardId.get(id) ?? new Set<string>();
    for (let i = 1; i <= args.seatOrder.length; i++) {
      const idx = (bidderIdx + i) % args.seatOrder.length;
      const candidate = args.seatOrder[idx];
      if (!candidate || candidate === args.bidderId) continue;
      if (!holders.has(candidate)) continue;
      if (flag === 'skip-existing-partner' && taken.has(candidate)) continue;
      taken.add(candidate);
      return { ...slot, filledBy: candidate };
    }
    return slot;
  });
}

/** Returns the unique partner IDs currently filling slots (excludes bidder, deduped). */
export function partnersFromSlots(slots: readonly PartnerSlot[], bidderId: string): string[] {
  const seen = new Set<string>();
  for (const s of slots) {
    if (s.filledBy && s.filledBy !== bidderId) seen.add(s.filledBy);
  }
  return Array.from(seen);
}

/** True if a player attempting to LEAD a card of called-suit would self-reveal.
 * In 500, partners cannot self-lead a called card (must wait until forced to follow).
 */
export function wouldBeSelfReveal(args: {
  playerId: string;
  card: Card;
  isLeadingTrick: boolean;
  bidderId: string;
  slots: readonly PartnerSlot[];
}): boolean {
  if (!args.isLeadingTrick) return false;
  if (args.playerId === args.bidderId) return false;
  const id = cardId(args.card);
  const matchingOpenSlot = args.slots.some(
    (s) => s.filledBy === null && cardId(s.card) === id,
  );
  return matchingOpenSlot;
}
