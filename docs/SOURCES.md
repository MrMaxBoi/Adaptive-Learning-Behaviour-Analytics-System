# Sources

Algorithms and parameters implemented in `server/src/engine`, traced to their
origin (SPEC §0, §14).

| Engine module | Source | Used for |
|---|---|---|
| `grading.ts` | SPEC §5.1 (project-defined mapping) | Answer → SM-2 quality grade |
| `scheduler.ts` | Wozniak (1990), SuperMemo SM-2 | Review interval, ease factor |
| `retention.ts` | Settles & Meeder (2016); Ebbinghaus (1885) | Half-life retention estimate |
| `mastery.ts` | Corbett & Anderson (1994), BKT | Per-skill mastery probability |
| `stage.ts` | IR §2.3.5 Table 7 | Learning-stage state machine |
| `strategies/` | IR §2.3.5; SPEC §5.6–5.7 | Adaptive and static selection |

## References

- Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, 4(4), 253–278.
- Ebbinghaus, H. (1885). *Über das Gedächtnis*.
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. *Proceedings of ACL*.
- Wozniak, P. A. (1990). *Optimization of learning* (SuperMemo SM-2 algorithm).

## Deviations from SPEC.md

Design changes made during implementation, with approval, that differ from the
specification as originally written.

| Area | SPEC says | Implemented as | Reason |
|---|---|---|---|
| Authentication | §9 / NFR-04: local email+password, bcrypt + JWT, `/auth/register` + `/auth/login` | Identity delegated to **Clerk** (Google login); `users.passwordHash` → `clerkUserId`; no `/auth/*` routes; `requireAuth` verifies the Clerk session and provisions the local user on first login | Fastest route to Google sign-in with least code; NFR-04 validation/secrets-in-env and NFR-05 isolation/role-gate still honoured server-side (Week 2 decision) |

### Deployment choices (not spec requirements)

- **Database:** MongoDB Atlas (free M0 tier).
- **Backend hosting:** Render (free web service). Backend is stateless so sleep/restart loses no data.
- **Frontend hosting:** Vercel (free).
- **Auth service:** Clerk (free tier).
