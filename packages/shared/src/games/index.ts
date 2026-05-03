export * from './types';
export { RULES_250 } from './250';
export { RULES_500 } from './500';
import { RULES_250 } from './250';
import { RULES_500 } from './500';
import type { GameType } from './types';

/** Return the rules object for a given game type. */
export function rulesFor(gameType: GameType): typeof RULES_250 | typeof RULES_500 {
  return gameType === '250' ? RULES_250 : RULES_500;
}
