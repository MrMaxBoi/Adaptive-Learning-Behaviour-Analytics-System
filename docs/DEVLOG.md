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
