import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ForbiddenError, NotFoundError } from '../services/practice.service.js';

/**
 * Single error envelope `{ error: { code, message } }` (§9). Maps known error
 * types to HTTP status codes; anything else is a 500 with a generic message so
 * internals never leak.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'validation_error', message: err.issues.map((i) => i.message).join('; ') },
    });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong.' },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found.' } });
}
