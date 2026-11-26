import { describe, expect, it } from 'vitest';
import type { Card } from '@250-500/shared';
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
