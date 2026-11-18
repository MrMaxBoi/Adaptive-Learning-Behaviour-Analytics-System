# Development Log

## 2026-11-18 — Week 1: scaffold + engine core

**Closes:** FR-20–23 (retention), FR-30–32 (mastery), FR-40–43 (stage + strategies), engine portions of Objectives 2–4. NFR-08 (engine unit coverage ≥ 80%), NFR-09 (seeded reproducibility).

### Done
- **Repo scaffold (SPEC §3.3):** npm workspaces (`shared`, `server`), TypeScript project references, strict `tsconfig`, Vitest config with a per-file coverage gate on `src/engine`. Placeholder dirs for `client/`, `simulation/`, and the Week 2 server layers.
- **Shared schemas (`shared/src`):** Zod schemas + types for the eight §4 collections (`domain.ts`), the engine-facing `LearnerSnapshot` / `MemoryState` / `SkillState` / `PlannedItem` and config constants (`engine.ts`), and the authored-content schema (`content.ts`).
- **Engine core (`server/src/engine`), pure functions, `now` passed in:**
  - `grading.ts` — §5.1 answer → SM-2 quality (0–5).
  - `scheduler.ts` — §5.2 SM-2 interval/ease update; `newMemory`.
  - `retention.ts` — §5.3 half-life retention, 14-day projection (FR-23), display bands.
  - `mastery.ts` — §5.4 BKT update, status thresholds, prerequisite availability.
  - `stage.ts` — §5.5 learning-stage state machine (first-match-wins).
  - `strategies/adaptive.ts` + `pools.ts` — §5.6 pools, stage proportions, quota rounding, fill-forward, exposure filter, concept cap, seeded shuffle, reasons.
  - `strategies/static.ts` — §5.7 fixed-sequence baseline on the same interface.
  - `rng.ts` — mulberry32 PRNG + seeded Fisher–Yates (no dependency).
- **Content (§10):** authored slice — `hiragana-vowels.json` (5 vowel kana, both directions) and `n5-numbers.json` (5 numbers, both directions), validated by the content schema.
- **Tests (Vitest):** 65 tests across 10 files — worked examples for SM-2 and BKT, grading boundaries, retention (incl. the 0.5-at-interval property), stage rules, both strategies, RNG determinism, content validation, and the §11 property tests (retention ∈ [0,1], mastery ∈ [0,1], session ≤ N).

### Results
- `npm test`: 65 passing.
- Engine coverage: 99.73% statements / 93.93% branches (NFR-08 floor is 80%).
- `tsc -b`: clean.

### Decisions (approved before coding)
- SM-2 implemented exactly as §5.2 pseudocode; `Math.round` for interval and quota rounding.
- BKT returns the post-transition `pL`; status classified from it.
- `stage(snapshot, now, n)`; Adaptive Review fires when `dueCount ≥ 0.4·n`.
- Pool quotas: `round(N·share)` per pool, then adjust the largest-share pool so quotas sum to N before fill-forward.
- Reproducibility via in-engine mulberry32; no runtime deps beyond `zod`.
- `LearnerSnapshot` carries `recentlyShownQuestionIds` (last 2 sessions) and optional `lastShownByConcept`; times as epoch-ms numbers inside the engine.
- Week 1 ships a content slice (10 concepts); full 46+50 bank deferred to Week 2 with the seed script.

### Next (Week 2)
Mongoose models + repositories, auth, practice API, and the seed script that loads `content/*.json` and authors the full hiragana + N5 bank.

## 2026-11-18 — Week 2: persistence, auth, practice API, seed

**Closes:** FR-01/FR-02 (accounts + roles, via Clerk — see deviation), FR-03 (profile), FR-10/FR-12/FR-13 (attempt/session/exposure records), FR-21/FR-30 (SM-2 + BKT persisted on each answer), FR-40–43 (practice API builds sessions). NFR-04 (input validation, secrets in env), NFR-05 (per-learner isolation + role gate).

### Done
- **Shared schemas extended (`shared/src`):** added `User`, `PracticeSession` (+ plan/summary), `QuestionExposure` to `domain.ts`; new `api.ts` with the §9 request/response contracts (`CreateSession*`, `SubmitAnswer*`, `FinishSession*`, `PublicQuestion`, `MeResponse`, `UpdateProfile*`, `ApiError`). `PublicQuestion` deliberately omits `answer`/`explanation` so the plan never leaks answers to the client.
- **Config (`server/src/config.ts`):** Zod-validated env; fails fast on bad config; `requireClerk()` guards the keys only where live auth runs (so tests/simulation can import server code without Clerk). `.env.example` documents every var.
- **Mongoose models (`server/src/db/models`):** all eight §4 collections, hand-written, with the §4 unique indexes (`(userId, conceptId)`, `(userId, skillId)`, `(userId, questionId)`, unique `email`/`clerkUserId`). Model reuse guard for repeated test connections.
- **Repositories (`server/src/repositories`):** thin per-collection data access — the only non-seed code touching Mongoose. `buildSnapshot(userId)` projects stored records into the pure `LearnerSnapshot` (Date → epoch-ms), recomputing skill status from stored `pMastery` so the snapshot is internally consistent. Engine still touches no I/O (NFR-08 preserved).
- **Services (`server/src/services/practice.service.ts`):** the §3.4 one-answer flow — grade (§5.1) → SM-2 (§5.2) → BKT (§5.4) → persist Attempt + Memory + Coverage. `createSession` runs stage + strategy and records exposures; `finishSession` writes the summary. Ownership checks raise `ForbiddenError` (NFR-05).
- **Middleware (`server/src/middleware`):** `requireAuth` (injectable Clerk resolver → JIT user provisioning), `requireRole` (NFR-05), `validateBody` (Zod), and the single §9 error envelope `{ error: { code, message } }`.
- **App + entrypoint (`server/src/app.ts`, `index.ts`):** Express app factory (resolver injectable for tests), CORS for the client origin, `/api/v1` routes behind auth; production wires `clerkMiddleware()` and connects to Atlas. Backend is stateless (all state in Atlas) so Render free-tier sleep/restart loses nothing.
- **Seed (`server/src/db/seed.ts`):** reads every `content/*.json`, validates with the Zod `ContentFile` schema, fills defaults, upserts skills + questions. Idempotent.
- **Tests (Vitest):** +21 tests — a Zod↔Mongoose parity suite (field sets must agree; asserts the Clerk deviation), config validation, and an in-memory-MongoDB integration suite covering JIT provisioning, `/me` read/update, the full session→answer→finish flow, answer-leak protection, session-size cap, and cross-learner isolation (403).

### Results
- `npm test` (full, incl. integration): **86 passing** (was 65). Engine coverage unchanged at 99.73% / 93.93% (NFR-08).
- `tsc -b`: clean.

### Tech-stack decisions (approved this session)
- **DB:** MongoDB Atlas (free M0) + Mongoose.
- **Validation:** Zod is the single source of truth; Mongoose hand-written; a parity test prevents drift (not auto-generated).
- **Auth:** Clerk (Google login).
- **Hosting:** backend on Render (free), frontend on Vercel (free). Backend kept stateless for Render's sleep/restart.

### Deviation from the spec (approved)
- **Auth:** SPEC §9 / NFR-04 specify local email+password with bcrypt + JWT and `/auth/register` + `/auth/login`. This build delegates identity to **Clerk** (Google login) instead. Consequences: `users.passwordHash` is removed in favour of `clerkUserId`; the `/auth/*` routes are not implemented (Clerk hosts sign-in); `requireAuth` verifies the Clerk session and provisions the local `User` on first login. NFR-04's *input validation / secrets-in-env* and NFR-05's *per-learner isolation + educator role gate* are still honoured server-side. Recorded in `docs/SOURCES.md`.

### Deferred
- **Full content bank (decision #12):** the seed loads whatever is in `content/*.json`; the authored bank is still the Week 1 slice (10 concepts). Authoring the full 46 hiragana + ~50 N5 words is the one outstanding Week 2 content item and its own focused pass.

### Next (Week 3)
Client: login (Clerk React), practice screen, learner dashboard with plain-language text; insight service.

---

## 2026-11-18 — Proposal cross-check + SPEC alignment to Clerk

### Why
Checked whether the Clerk auth decision conflicts with the documents actually submitted to the university, then aligned the internal spec to match the build.

### Proposal cross-check (docs reviewed)
Extracted and searched all three submitted documents for any auth/security mechanism:
- **CHH_PPF.docx** (Project Proposal Form) — only says learners "register and log in **securely**" and admins "manage user accounts". No mechanism named.
- **TP080141ChanHaoHean_IR.pdf** (144 pp Initial Report) — auth mentioned only generically (Express handles "authentication processes"; Zustand holds "authentication information"; "register and manage profile"). No bcrypt, JWT, email/password, or named login method.
- **AI-Driven…System.pdf** — no auth/security content at all.

**Finding:** the bcrypt + JWT + email/password detail existed **only** in the internal `SPEC.md`, never in anything submitted. Clerk therefore conflicts with nothing the university received; it only diverged from the self-written spec. DB choice (MongoDB) in the IR is unchanged (kept via Atlas).

### SPEC.md changes (v0.1 → v0.2)
- Document status line bumped to v0.2 with a revision note.
- **FR-01** — now "register and log in securely via Clerk (Google OAuth; email/password also available)".
- **NFR-04** — rewritten: auth delegated to Clerk, server verifies session tokens, no passwords stored; input-validation / secrets-in-env clauses retained; original bcrypt+JWT plan noted as revised.
- **§4.1 users** — `passwordHash (bcrypt)` → `clerkUserId` (+ email noted as from Clerk).
- **§9 API** — removed `POST /auth/register` and `/auth/login`; preamble now describes Clerk session verification + JIT provisioning via `requireAuth`; `/me` mapped to FR-01, FR-03.

### Supervisor heads-up
Drafted a one-line note for the supervisor at `docs/supervisor-note-auth.md` so the deviation is pre-agreed, not a viva surprise.

### Still deferred
- Full content bank (decision #12) — unchanged, the one outstanding content item.

### Next (Week 3)
Client scaffold (React + Clerk), practice screen, learner analytics dashboard. Hold the install/build until host memory frees.
