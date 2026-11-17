# Project memory

## Product intent & audience

- Smart Campus room availability checker: users check whether a campus room can be booked under existing booking rules.
- Audience is internal campus users; no auth, accounts, or real personal data involved.
- An optional "Explain this decision" feature lets users get a human-readable description of an already-computed result.

## Brand personality & voice

- Practical, trustworthy, rule-driven. Decisions are deterministic and final; explanations are supplementary.
- Copy favors clarity over marketing tone.

## Visual design & UX direction

- React + JSX with Tailwind CSS, React hooks, Lucide React icons (per global instructions in `.bolt/prompt`).
- Decision badge is always shown first and remains the authoritative UI element.
- Explanation UI is opt-in via a checkbox, appears below the badge, and has loading/spinner, success, and fallback states.
- Existing UI (badge, timeline, filters) must remain visually and behaviorally unchanged.
- Stale explanation requests are aborted when the decision changes.

## Decisions, constraints & rationale

- Deterministic checker is authoritative; the explanation layer only *describes* a `CheckResult` and never recomputes booking rules — so it cannot change the decision.
- Mock adapter (`src/lib/explanation.ts`) is async with a short simulated delay; validates request shape and always returns a well-formed `ExplanationResponse` (`ok` flag + `source: 'mock' | 'fallback'`). Invalid inputs, async failures, and cancellation degrade to a fallback summary rather than throwing.
- Validation accepts non-finite `start`/`end` only when `decision === null` (valid "no decision yet" state); non-null decisions require finite bounds. Guard `buildSummary`/`buildDetails` against NaN times on the null branch.
- Decision values: `'available' | 'unavailable' | null`.
- No login, no database, no real personal data, no client-side API secrets.
- Path alias `@/` → `src/` (from global instructions); avoid deep relative imports.
- Tests run via `package.json` `test` script; verify with `npx tsc --noEmit` and `npm run build`. Original 27 tests preserved; 12 new explanation tests added (39 total).

## Open questions & assumptions

- Assumes a real explanation backend would later replace the mock adapter behind the same `ExplanationRequest`/`ExplanationResponse` contract.
- Assumes NaN/Infinity time bounds are only legitimate for the null-decision state; revisit if other callers pass non-finite values with non-null decisions.