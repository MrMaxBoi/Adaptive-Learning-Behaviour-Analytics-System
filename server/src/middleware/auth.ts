import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@fyp/shared';
import { users as usersRepo } from '../repositories/index.js';

/**
 * Auth (DEVIATION from §9/NFR-04: identity via Clerk, not local
 * email/password). The real request chain is:
 *   clerkMiddleware()  -> verifies the Clerk session, populates req.auth
 *   requireAuth        -> rejects unauthenticated, resolves/creates our User,
 *                         and attaches { userId, role } to req.locals
 *   requireRole('educator') -> NFR-05 role gate
 *
 * `resolveClerkUser` is injected so tests can bypass Clerk entirely by
 * supplying a fake resolver; production wires in the Clerk resolver below.
 */

export interface AuthContext {
  userId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

/** The subject + claims we need out of a verified Clerk session. */
export interface ClerkIdentity {
  clerkUserId: string;
  email: string;
  displayName: string;
}

export type ClerkResolver = (req: Request) => ClerkIdentity | null;

/**
 * Resolve the Clerk subject into our `users` record, creating it on first
 * login (just-in-time provisioning). Role defaults to `learner`; an educator
 * is promoted out-of-band (e.g. a seed/admin action), never self-assigned.
 */
export function requireAuth(resolve: ClerkResolver) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = resolve(req);
      if (!identity) {
        res.status(401).json({
          error: { code: 'unauthenticated', message: 'Sign in required.' },
        });
        return;
      }

      let user = await usersRepo.findByClerkId(identity.clerkUserId);
      if (!user) {
        const created = await usersRepo.create({
          clerkUserId: identity.clerkUserId,
          email: identity.email.toLowerCase(),
          displayName: identity.displayName || identity.email.split('@')[0],
          role: 'learner',
          classCode: null,
          dailyGoal: null,
        });
        user = created.toObject();
      }

      req.authContext = { userId: String(user._id), role: user.role as Role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** NFR-05: educator-only endpoints. Must run after requireAuth. */
export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({
        error: { code: 'unauthenticated', message: 'Sign in required.' },
      });
      return;
    }
    if (req.authContext.role !== role) {
      res.status(403).json({
        error: { code: 'forbidden', message: `Requires ${role} role.` },
      });
      return;
    }
    next();
  };
}

/**
 * Production Clerk resolver: reads the verified auth off the request that
 * `clerkMiddleware()` populated. Imported lazily so test and simulation code
 * can use server modules without `@clerk/express` configured.
 */
export function clerkResolver(req: Request): ClerkIdentity | null {
  // `getAuth` is attached by clerkMiddleware(); claims carry email/name when
  // the Clerk instance is configured to include them.
  const auth = (req as unknown as { auth?: { userId?: string; sessionClaims?: Record<string, unknown> } }).auth;
  const userId = auth?.userId;
  if (!userId) return null;
  const claims = auth?.sessionClaims ?? {};
  const email = (claims.email as string) ?? (claims.primary_email_address as string) ?? '';
  const displayName =
    (claims.name as string) ??
    [claims.first_name, claims.last_name].filter(Boolean).join(' ') ??
    '';
  return { clerkUserId: userId, email, displayName };
}
