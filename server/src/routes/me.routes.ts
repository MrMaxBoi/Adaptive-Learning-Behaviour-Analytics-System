import { Router } from 'express';
import { UpdateProfileRequest } from '@fyp/shared';
import { validateBody } from '../middleware/validate.js';
import { NotFoundError } from '../services/practice.service.js';
import { users as usersRepo } from '../repositories/index.js';

/** GET/PATCH /me — profile (FR-03). */
export function meRouter(): Router {
  const r = Router();

  r.get('/', async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      const user = await usersRepo.findById(userId);
      if (!user) throw new NotFoundError('user not found');
      res.json({
        _id: String(user._id),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        classCode: user.classCode ?? null,
        dailyGoal: user.dailyGoal ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  r.patch('/', validateBody(UpdateProfileRequest), async (req, res, next) => {
    try {
      const { userId } = req.authContext!;
      const user = await usersRepo.updateProfile(userId, req.body);
      if (!user) throw new NotFoundError('user not found');
      res.json({
        _id: String(user._id),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        classCode: user.classCode ?? null,
        dailyGoal: user.dailyGoal ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
