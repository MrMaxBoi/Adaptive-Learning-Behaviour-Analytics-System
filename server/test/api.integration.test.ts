import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { ClerkIdentity } from '../src/middleware/auth.js';
import { createApp } from '../src/app.js';
import { loadEnv, resetEnvCache } from '../src/config.js';
import { loadContentFiles } from '../src/db/seed.js';
import { QuestionModel, SkillModel } from '../src/db/models/index.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Integration tests (§11) against an in-memory MongoDB. A fake Clerk resolver
 * supplies a fixed identity so the auth chain runs end to end without the Clerk
 * SDK. Covers: just-in-time user provisioning, /me, the full practice flow
 * (session -> answer -> finish), and NFR-05 isolation (one learner cannot touch
 * another's session).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '../../content');

let mongo: MongoMemoryServer;
let app: Express;

// Mutable identity the fake resolver returns, so tests can switch users.
let currentIdentity: ClerkIdentity = {
  clerkUserId: 'clerk_alice',
  email: 'alice@example.com',
  displayName: 'Alice',
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  resetEnvCache();
  const env = loadEnv({ MONGODB_URI: mongo.getUri() });
  app = createApp({ env, resolve: () => currentIdentity });

  // Seed content directly from the authored JSON.
  const { skills, questions } = await loadContentFiles(CONTENT_DIR);
  await SkillModel.insertMany(skills);
  await QuestionModel.insertMany(questions);
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(() => {
  currentIdentity = {
    clerkUserId: 'clerk_alice',
    email: 'alice@example.com',
    displayName: 'Alice',
  };
});

describe('auth + /me', () => {
  it('rejects an unauthenticated request', async () => {
    const noAuthApp = createApp({
      env: loadEnv({ MONGODB_URI: mongo.getUri() }),
      resolve: () => null,
    });
    const res = await request(noAuthApp).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('provisions a user on first request and returns the profile', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.role).toBe('learner');
  });

  it('updates the profile (FR-03)', async () => {
    const res = await request(app)
      .patch('/api/v1/me')
      .send({ displayName: 'Alice A.', dailyGoal: 20 });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Alice A.');
    expect(res.body.dailyGoal).toBe(20);
  });

  it('rejects an invalid profile update (NFR-04 validation)', async () => {
    const res = await request(app).patch('/api/v1/me').send({ dailyGoal: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

describe('practice flow', () => {
  it('builds a session, answers, and finishes', async () => {
    const create = await request(app)
      .post('/api/v1/practice/sessions')
      .send({ strategy: 'adaptive' });
    expect(create.status).toBe(201);
    expect(create.body.questions.length).toBeGreaterThan(0);
    // Public questions must not leak the answer.
    expect(create.body.questions[0]).not.toHaveProperty('answer');
    const sessionId: string = create.body.sessionId;
    const q0 = create.body.questions[0];

    const answer = await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/answers`)
      .send({ questionId: q0._id, selectedOption: q0.options[0], responseTimeMs: 3000 });
    expect(answer.status).toBe(200);
    expect(answer.body).toHaveProperty('correct');
    expect(answer.body).toHaveProperty('correctAnswer');
    expect(answer.body).toHaveProperty('explanation');

    const finish = await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/finish`)
      .send({});
    expect(finish.status).toBe(200);
    expect(finish.body.answered).toBe(1);
  });

  it('never returns more than the session size', async () => {
    const create = await request(app)
      .post('/api/v1/practice/sessions')
      .send({ strategy: 'static' });
    expect(create.status).toBe(201);
    expect(create.body.questions.length).toBeLessThanOrEqual(10);
  });

  it('blocks a learner from finishing another learner\'s session (NFR-05)', async () => {
    const create = await request(app)
      .post('/api/v1/practice/sessions')
      .send({ strategy: 'adaptive' });
    const sessionId: string = create.body.sessionId;

    // Switch to a different Clerk identity (Bob).
    currentIdentity = {
      clerkUserId: 'clerk_bob',
      email: 'bob@example.com',
      displayName: 'Bob',
    };
    const res = await request(app)
      .post(`/api/v1/practice/sessions/${sessionId}/finish`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });
});
