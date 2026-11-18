import { Router } from 'express';
import { CreateSessionRequest, SubmitAnswerRequest } from '@fyp/shared';
import type { Env } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import {
  createSession,
  finishSession,
  submitAnswer,
} from '../services/practice.service.js';

/**
 * Practice API (§9): build a session, submit an answer, finish a session.
 * All routes assume `requireAuth` ran earlier and set `req.authContext`.
 */
export function practiceRouter(env: Env): Router {
  const r = Router();

  // POST /practice/sessions  (FR-40..43)
  r.post('/sessions', validateBody(CreateSessionRequest), async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      const strategy = req.body.strategy ?? 'adaptive';
      const result = await createSession(userId, strategy, env);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /practice/sessions/:id/answers  (FR-10..30)
  r.post('/sessions/:id/answers', validateBody(SubmitAnswerRequest), async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      const { questionId, selectedOption, responseTimeMs } = req.body;
      const result = await submitAnswer(
        userId,
        String(req.params.id),
        questionId,
        selectedOption,
        responseTimeMs,
        env,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /practice/sessions/:id/finish  (FR-12)
  r.post('/sessions/:id/finish', async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      const result = await finishSession(userId, String(req.params.id));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return r;
}
