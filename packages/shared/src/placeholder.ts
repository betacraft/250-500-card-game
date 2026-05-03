import { z } from 'zod';

/**
 * Placeholder schema to verify the shared package is wired up.
 * Real schemas (cards, game state, events) land in E02+.
 */
export const healthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
});

export type Health = z.infer<typeof healthSchema>;
