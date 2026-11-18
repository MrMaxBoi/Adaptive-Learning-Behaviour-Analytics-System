import express, { type Express } from 'express';
import type { Env } from './config.js';
import {
  type ClerkResolver,
  clerkResolver,
  requireAuth,
} from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { meRouter } from './routes/me.routes.js';
import { practiceRouter } from './routes/practice.routes.js';

/**
 * Build the Express app (§9). The Clerk resolver is injectable so integration
 * tests can supply a fake identity and skip the real Clerk SDK; production
 * passes the Clerk-backed resolver and mounts `clerkMiddleware()` first.
 */
export interface AppOptions {
  env: Env;
  resolve?: ClerkResolver;
  /** Extra middleware to run before auth (e.g. clerkMiddleware in prod). */
  preAuth?: express.RequestHandler[];
}

export function createApp(opts: AppOptions): Express {
  const { env, resolve = clerkResolver, preAuth = [] } = opts;
  const app = express();

  app.use(express.json());

  // Simple CORS for the client origin (dev + deployed frontend).
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = env.CLIENT_ORIGIN.split(',').map((s) => s.trim());
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));

  for (const mw of preAuth) app.use(mw);

  // Everything below /api/v1 (except health) requires auth.
  const api = express.Router();
  api.use(requireAuth(resolve));
  api.use('/me', meRouter());
  api.use('/practice', practiceRouter(env));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
