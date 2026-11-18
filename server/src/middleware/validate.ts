import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validate `req.body` against a Zod schema (NFR-04: all API input validated).
 * On success the parsed value replaces `req.body`; on failure the ZodError is
 * forwarded to the error handler, which renders the §9 envelope.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data as z.infer<T>;
    next();
  };
}
