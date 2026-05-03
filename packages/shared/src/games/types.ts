import { z } from 'zod';

export const gameTypeSchema = z.enum(['250', '500']);
export type GameType = z.infer<typeof gameTypeSchema>;
