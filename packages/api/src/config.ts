import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
});

export type Config = z.infer<typeof configSchema>;

/** Loads + validates env config. In production, refuses to start if CORS_ORIGIN is '*'
 * (forces operator to set an explicit origin allowlist). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  if (result.data.NODE_ENV === 'production' && result.data.CORS_ORIGIN === '*') {
    throw new Error(
      'CORS_ORIGIN must be set to an explicit origin (or comma-separated list) in production. ' +
        'Refusing to start with the wide-open default.',
    );
  }
  return result.data;
}
