# Adaptive Learning Behaviour Analytics System

Final Year Project — Chan Hao Hean (TP080141), BSc (Hons) Software Engineering, APU.

`docs/SPEC.md` is the source of truth. The IR PDF and proposal are background.

## Layout (SPEC §3.3)

```
docs/        SPEC.md, DEVLOG.md, SOURCES.md
shared/      Zod schemas and TypeScript types (client + server)
server/      Express API; src/engine holds the pure-function engine core
client/      React client (Week 3)
simulation/  evaluation harness (Week 4)
content/     authored question bank (JSON)
```

## Develop

Node >= 18. npm workspaces.

```bash
npm install          # install all workspaces
npm test             # run the engine unit tests (server workspace)
npm run coverage -w server   # engine coverage (NFR-08: >= 80%)
npm run typecheck    # tsc -b across project references
```

## Status

Week 1 complete: repo scaffold, shared schemas, engine core (SPEC §5) with
Vitest unit tests, and a content slice. See `docs/DEVLOG.md`.
