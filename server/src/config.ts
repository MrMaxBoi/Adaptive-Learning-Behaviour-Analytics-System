import { z } from 'zod';

/**
 * Environment configuration (NFR-04: secrets only in env vars). Validated at
 * startup so a missing/invalid var fails fast with a clear message rather than
 * surfacing as a runtime error deep in a request.
 *
 * Clerk keys are optional so tests and the simulation can import server code
 * without a Clerk account; `requireClerk()` enforces them where auth is live.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/fyp'),

  // Clerk (Google login). Absent in test/simulation contexts.
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),

  // Comma-separated allowed origins for the client (CORS).
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  // §5.1 grading thresholds, overridable and reported.
  GRADING_FAST_MS: z.coerce.number().positive().default(4000),
  GRADING_SLOW_MS: z.coerce.number().positive().default(12000),

  SESSION_SIZE: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests that mutate env between cases. */
export function resetEnvCache(): void {
  cached = null;
}

/** Throws if Clerk keys are missing; call where live auth is required. */
export function requireClerk(env: Env): { publishableKey: string; secretKey: string } {
  if (!env.CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
    throw new Error(
      'CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required for auth. ' +
        'Set them in the environment (see .env.example).',
    );
  }
  return {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  };
}
