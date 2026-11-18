import { Router } from 'express';
import { getNextUp, getSummary } from '../services/dashboard.service.js';

/**
 * Learner dashboard API (§9, FR-50..52). Read-only. `requireAuth` ran earlier
 * and set `req.authContext`; a learner only ever reads their own data
 * (NFR-05) because the userId comes from the verified token, never the query.
 */
export function dashboardRouter(): Router {
  const r = Router();

  // GET /dashboard/summary  (FR-50, FR-51)
  r.get('/summary', async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      res.json(await getSummary(userId));
    } catch (err) {
      next(err);
    }
  });

  // GET /dashboard/next-up  (FR-52)
  r.get('/next-up', async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      res.json(await getNextUp(userId));
    } catch (err) {
      next(err);
    }
  });

  return r;
}
