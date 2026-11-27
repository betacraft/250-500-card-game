import { describe, expect, it } from 'vitest';
import type { Card } from '@250-500/shared';
import { calledFaces, cardLabel } from './local-play-helpers';
import { summaryText } from './play-summary';

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit, id: `${rank}${suit[0]}` });

describe('summaryText', () => {
  it('puts the called faces, the revealed partners, and the points on one line', () => {
    expect(summaryText([card('K', 'clubs'), card('J', 'hearts')], ['Ada', 'Bot 4'], 30)).toBe('Called K♣ J♥ · Partners: Ada, Bot 4 · 30 pts');
  });

  it('says none yet when the table has not seen a partner', () => {
    expect(summaryText([card('A', 'spades')], [], 0)).toBe('Called A♠ · Partners: none yet · 0 pts');
  });
});

describe('cardLabel', () => {
  it('writes every called card with a suit symbol', () => {
    expect(cardLabel(card('K', 'clubs'))).toBe('K♣');
    expect(cardLabel(card('J', 'hearts'))).toBe('J♥');
    expect(cardLabel(card('10', 'diamonds'))).toBe('10♦');
    expect(calledFaces([card('K', 'clubs'), card('J', 'hearts'), card('10', 'diamonds')])).toBe('K♣ J♥ 10♦');
  });
});
