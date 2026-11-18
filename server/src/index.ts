import { clerkMiddleware } from '@clerk/express';
import { createApp } from './app.js';
import { loadEnv, requireClerk } from './config.js';
import { connectDb } from './db/connection.js';

/**
 * Production entrypoint: validate env, require Clerk keys, connect to MongoDB
 * (Atlas), mount clerkMiddleware() before auth, and listen.
 *
 * Deployment note: the backend is stateless (all state in Atlas), so Render's
 * free-tier sleep/restart loses nothing.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const { publishableKey, secretKey } = requireClerk(env);

  await connectDb(env.MONGODB_URI);

  const app = createApp({
    env,
    preAuth: [clerkMiddleware({ publishableKey, secretKey })],
  });

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
