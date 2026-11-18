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
