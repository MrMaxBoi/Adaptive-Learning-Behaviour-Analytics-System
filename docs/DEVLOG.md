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

---

## 2026-11-18 (later) — Week 3 part 1: dashboard API + client source (build deferred)

### Context / constraint
Host memory was **critically low** (~1.7–1.9 GB free) for the whole session. A Vite scaffold (`npm create vite` + install + dev server) is exactly the heavy step the runtime warns against under that pressure, so I split Week 3: write every source and config file now (no install, no build — safe), and defer the one heavy step (client `npm install` + `tsc`/Vite build + full/integration test run) until memory frees. Nothing here required an install.

### Server — dashboard read model (FR-50..52)
- **`server/src/services/insight.service.ts`** — pure plain-language generators (§7.2). One place enforces NFR-07 (no model terms: "probability", "ease factor", stage names). 10 generators: accuracy, mastery, retention trend, weak concept, response time, revision, history, projection, per-item reason, next-up heading.
- **`server/src/services/dashboard.service.ts`** — assembles the 7 proposal metrics + "next up" from stored records via the repositories; reuses the engine's pure `retention` / `masteryStatus` / `retentionBand`; pairs each metric with an insight sentence. Read-only, single-pass aggregation (NFR-02); userId comes from the verified token only (NFR-05).
- **`server/src/routes/dashboard.routes.ts`** — `GET /dashboard/summary`, `GET /dashboard/next-up`; mounted under `/api/v1` in `app.ts`.
- **`shared/src/api.ts`** — added `DashboardSummaryResponse`, `NextUpResponse`, and the metric/series/bar/weak-concept contracts (shared with the client).

### Client — Vite + React + TS + Clerk + Recharts (source only)
- Config: `client/package.json` (added to root workspaces + tsconfig refs), `tsconfig.json` (DOM + react-jsx), `vite.config.ts` (dev proxy /api → :4000), `index.html`, `.env.example`, `vite-env.d.ts`.
- `src/api/client.ts` — typed fetch over the `@fyp/shared` contracts, Clerk token on every request, unwraps the `{ error }` envelope; `src/api/hooks.ts` binds it to Clerk's `getToken`.
- `src/main.tsx` — Clerk + React Query + Router providers; `src/App.tsx` — `<SignedIn>/<SignedOut>` route gate.
- Pages: `SignInPage` (hosted Clerk sign-in; no password ever touches the client), `PracticePage` (start → answer with client-side response-time timing FR-11 → immediate feedback → finish), `DashboardPage` (7 MetricCards + next-up, Recharts line/bar).
- `components/AppShell.tsx`, `components/MetricCard.tsx` (renders **bold** from sentences), `store/practice.ts` (Zustand session state + render-time stamp), `styles.css`.
- Removed the now-redundant `client/src/**/.gitkeep` placeholders.

### Verification (light steps only)
- `npx vitest run test/insight.test.ts`: **8 passing** — the NFR-07 banned-vocabulary assertion covers every sentence the service can emit, plus wording-behaviour checks.
- `tsc -b shared server`: **clean** (after fixing a missing `SkillStatus` import and loosening two helper param types for Mongoose `lean()` shapes).
- **NOT run under this memory pressure:** the full server suite (86 prior tests), the mongodb-memory-server integration suite, and any client install/build/typecheck. These are the deferred heavy steps.

### Still pending for Week 3
- Client `npm install` + `tsc -b` (full, incl. client) + `vite build` once memory frees — to confirm the client compiles and bundles.
- A dashboard integration test (summary/next-up against in-memory Mongo), to run with the rest of the integration suite.
- Clerk + Atlas env setup to run end-to-end locally.
- Full content bank (decision #12) — still the one outstanding content item.

---

## 2026-11-18 (later still) — Full content bank (decision #12 closed)

Authored the complete §10 content bank (hand-written JSON — no install/build, safe under the ongoing critical-memory state). This closes the one content item deferred since Week 1.

### What was authored
- **Hiragana — all 46 basic characters across 10 skills** (one skill per gojūon row):
  `hira-vowels` (5), `hira-k` `hira-s` `hira-t` `hira-n` `hira-h` `hira-m` (5 each), `hira-y` (3: ya/yu/yo), `hira-r` (5), `hira-w` (3: wa/wo/n). Each row-skill has `hira-vowels` as prerequisite (vowels has none). Both directions per character (kana→romaji, romaji→kana); distractors drawn from the same row.
- **N5 vocabulary — 50 words across 5 topic skills:** `n5-numbers` (10: 1–10), `n5-greetings` (10), `n5-family` (10), `n5-food` (10), `n5-time` (10). Each vocab skill lists the hiragana rows its words use as prerequisites (FR-32). Both directions per word (meaning↔word); distractors from the same topic.

### Totals (verified)
15 skills · 192 questions · 96 concepts = **46 hiragana + 50 vocabulary** — matches §10 exactly.

### Tests
Extended `server/test/content.test.ts`: the per-file list now covers all 15 files, plus a new **bank-wide integrity** block — unique skill ids, unique question ids, every prerequisite resolves to a declared skill (FR-32), every answer ∈ its options, exactly 4 distinct options per question, and the §10 counts (46 hiragana concepts, ≥50 vocab concepts).
- `vitest content.test.ts`: **51 passing**.

### Note
The seed script (`server/src/db/seed.ts`) already auto-discovers every `content/*.json`, so no seed change was needed — it will load all 15 files on the next `npm run seed`.

### Still pending (unchanged)
Client `npm install` + full build + the full/integration test run, once host memory frees. Those remain the Week 3 closeout.
