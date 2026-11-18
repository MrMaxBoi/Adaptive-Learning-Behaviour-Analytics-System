# Supervisor heads-up — authentication mechanism

**Context:** My proposal and Initial Report describe users who "register and log in securely" but do not specify an authentication mechanism (no mention of bcrypt, JWT, or email/password). My internal design spec had initially planned in-house email/password with bcrypt + JWT.

**Decision:** I have implemented authentication using **Clerk** (a hosted auth provider) with **Google (Gmail) sign-in**, rather than building password hashing and token issuance myself. Clerk email/password sign-in is also available if required.

**Why:**
- It satisfies the proposal's requirement that users register and log in *securely*, and avoids a common source of student-project vulnerabilities (hand-rolled auth).
- It keeps the project focused on its actual objectives — interaction tracking, retention modelling, mastery estimation, adaptive selection, and the analytics dashboard — none of which is "build authentication".
- Authentication is not part of any project objective or the traceability table; the adaptive engine is unchanged.

**Impact on the design:** the `users` record now stores a `clerkUserId` instead of a `passwordHash`, and the server verifies Clerk session tokens (user records are created on first login). Per-learner data isolation and the educator role gate are still enforced in my own server code. Reverting to in-house bcrypt + JWT later, if preferred, is a contained change confined to the auth layer and does not touch the engine.

**Ask:** Please confirm this is acceptable, or let me know if the brief requires in-house email/password authentication specifically.

---
*Short version (for email/chat):*
> I've replaced the originally planned in-house bcrypt/JWT auth with Clerk (Google sign-in) for security and to keep focus on the adaptive engine. The proposal only required "secure login" and named no mechanism, so the objectives and engine are unchanged. Happy to revert to email/password if the brief requires it — it's a contained change.
