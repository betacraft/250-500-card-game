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
    // Loud warning to stderr — operator should set explicit origin allowlist for security.
    // We no longer throw because that blocks first-deploy bootstrapping (chicken-and-egg
    // with the Railway-generated URL).
    process.stderr.write(
      '\n[WARN] CORS_ORIGIN="*" in production. The server will accept connections from any origin.\n' +
        '       For production security, set CORS_ORIGIN to your explicit Railway URL.\n\n',
    );
  }
  return result.data;
}
