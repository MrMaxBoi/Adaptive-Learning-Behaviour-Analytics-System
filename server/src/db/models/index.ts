/**
 * Mongoose models for the eight §4 collections.
 *
 * Zod (in @fyp/shared) stays the single source of truth for validation at API
 * boundaries (decision: hand-written Mongoose + a parity test, not generated).
 * These schemas add persistence concerns Zod does not: indexes, refs, and the
 * unique constraints §4 specifies. `models/parity.test.ts` asserts the field
 * sets agree so the two definitions cannot silently drift.
 */
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/** §4.1 users (Clerk-backed identity; see domain.ts DEVIATION note). */
const userSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['learner', 'educator'], required: true },
    classCode: { type: String, default: null },
    dailyGoal: { type: Number, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'users' },
);

/** §4.2 skills. */
const bktSchema = new Schema(
  {
    pInit: { type: Number, required: true },
    pTransit: { type: Number, required: true },
    pSlip: { type: Number, required: true },
    pGuess: { type: Number, required: true },
  },
  { _id: false },
);

const skillSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    topic: { type: String, required: true },
    level: { type: Number, required: true },
    prerequisites: { type: [String], default: [] },
    bkt: { type: bktSchema, required: true },
  },
  { collection: 'skills', _id: false },
);

/** §4.3 questions. */
const questionSchema = new Schema(
  {
    _id: { type: String, required: true },
    skillId: { type: String, required: true, index: true },
    conceptId: { type: String, required: true, index: true },
    type: { type: String, enum: ['mcq'], required: true },
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    explanation: { type: String, required: true },
    difficulty: { type: Number, enum: [1, 2, 3], required: true },
  },
  { collection: 'questions', _id: false },
);

/** §4.4 sessions. */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    strategy: { type: String, enum: ['adaptive', 'static'], required: true },
    stage: { type: String, required: true },
    plan: [
      {
        _id: false,
        questionId: { type: String, required: true },
        reason: { type: String, required: true },
      },
    ],
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    summary: {
      answered: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      avgResponseMs: { type: Number, default: 0 },
    },
  },
  { collection: 'sessions' },
);

/** §4.5 attempts. */
const attemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    questionId: { type: String, required: true },
    skillId: { type: String, required: true, index: true },
    conceptId: { type: String, required: true, index: true },
    selected: { type: String, required: true },
    correct: { type: Boolean, required: true },
    responseTimeMs: { type: Number, required: true },
    quality: { type: Number, required: true },
    reason: { type: String, required: true },
    answeredAt: { type: Date, required: true },
  },
  { collection: 'attempts' },
);

/** §4.6 memories (Table 8). Unique (userId, conceptId). */
const memorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conceptId: { type: String, required: true },
    repetitions: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    lastReviewedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    totalReviews: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
  },
  { collection: 'memories' },
);
memorySchema.index({ userId: 1, conceptId: 1 }, { unique: true });

/** §4.7 knowledgecoverage. Unique (userId, skillId). */
const coverageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skillId: { type: String, required: true },
    pMastery: { type: Number, required: true },
    status: {
      type: String,
      enum: ['not_started', 'weak', 'developing', 'mastered'],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    firstSeenAt: { type: Date, default: null },
    masteredAt: { type: Date, default: null },
    history: [
      {
        _id: false,
        at: { type: Date, required: true },
        pMastery: { type: Number, required: true },
      },
    ],
  },
  { collection: 'knowledgecoverage' },
);
coverageSchema.index({ userId: 1, skillId: 1 }, { unique: true });

/** §4.8 questionexposures. Unique (userId, questionId). */
const exposureSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: String, required: true },
    timesShown: { type: Number, default: 0 },
    lastShownAt: { type: Date, required: true },
  },
  { collection: 'questionexposures' },
);
exposureSchema.index({ userId: 1, questionId: 1 }, { unique: true });

// Reuse existing models across hot-reloads / repeated test connections.
function makeModel<TSchema extends Schema>(
  name: string,
  schema: TSchema,
): mongoose.Model<InferSchemaType<TSchema>> {
  return (mongoose.models[name] as mongoose.Model<InferSchemaType<TSchema>>) ??
    mongoose.model<InferSchemaType<TSchema>>(name, schema);
}

export const UserModel = makeModel('User', userSchema);
export const SkillModel = makeModel('Skill', skillSchema);
export const QuestionModel = makeModel('Question', questionSchema);
export const SessionModel = makeModel('Session', sessionSchema);
export const AttemptModel = makeModel('Attempt', attemptSchema);
export const MemoryModel = makeModel('Memory', memorySchema);
export const CoverageModel = makeModel('Coverage', coverageSchema);
export const ExposureModel = makeModel('Exposure', exposureSchema);

export type UserDoc = InferSchemaType<typeof userSchema>;
export type SkillDoc = InferSchemaType<typeof skillSchema>;
export type QuestionDoc = InferSchemaType<typeof questionSchema>;
export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export type AttemptDoc = InferSchemaType<typeof attemptSchema>;
export type MemoryDoc = InferSchemaType<typeof memorySchema>;
export type CoverageDoc = InferSchemaType<typeof coverageSchema>;
export type ExposureDoc = InferSchemaType<typeof exposureSchema>;

export const schemas = {
  user: userSchema,
  skill: skillSchema,
  question: questionSchema,
  session: sessionSchema,
  attempt: attemptSchema,
  memory: memorySchema,
  coverage: coverageSchema,
  exposure: exposureSchema,
};
