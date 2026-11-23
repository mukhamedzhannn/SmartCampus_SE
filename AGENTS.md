# AGENTS.md

Operating guide for the Smart Campus Room Availability Checker. Read this before making changes.

## Project purpose

A single-page prototype that lets internal campus users check whether a room can be booked for a time interval under fixed booking rules. It is a teaching/assignment project:

- Fictional sample data only — 4 rooms (Alpha Lab, Beta Hall, Gamma Pod, Delta Studio) with mock bookings in `src/data.ts`.
- No authentication, no accounts, no real personal data.
- No database, no backend, no analytics, no external APIs.
- An optional "Explain this decision" feature produces a human-readable description of an already-computed result. It is supplementary and never authoritative.

## Tech stack

- React 18 + TypeScript (strict), built with Vite 5.
- Tailwind CSS 3 for styling. Lucide React for icons.
- Node.js native test runner (`node:test`) for tests — no Jest/Mocha/Vitest.
- Path alias `@/` maps to `src/` (configured in `tsconfig.app.json` and `vite.config.ts`).

## Architecture

```
src/
  App.tsx                    Top-level page; holds filter + form state, derives the decision.
  data.ts                    Fictional rooms, bookings, and MOCK_NOW_MIN (570 = 09:30).
  types.ts                   Shared types: Room, Booking, Decision, CheckResult, Explanation*.
  lib/
    availability.ts          Pure booking-rule checker (checkAvailability). AC1–AC5 live here.
    roomFilters.ts           Pure filter helpers (capacity, equipment, room bookings, counts).
    time.ts                  Time conversion helpers (timeToMinutes, minutesToTime, DAY_END).
    explanation.ts           Mock explanation adapter — describes a CheckResult, never recomputes.
  components/
    AvailabilityForm.tsx     Right panel: room/time inputs, decision badge, optional explanation UI.
    DecisionBadge.tsx        The authoritative Available/Unavailable badge.
    FilterControls.tsx       Capacity + equipment filters.
    RoomCard.tsx             Selectable room card.
    Timeline.tsx             Visual day timeline with existing bookings + candidate interval.
tests/
  availability.test.ts       Booking-rule + filter tests (27 cases).
  explanation.test.ts        Explanation adapter tests (22 cases).
  register-aliases.mjs       Node loader hook registration for @/ alias in tests.
  alias-loader.mjs           Resolves @/ imports to src/ during test runs.
```

### Layering rules

- `src/lib/availability.ts` is the **single source of truth** for booking rules. It must stay pure: no React, no DOM, no module-level mutable state, no mutation of inputs or fixtures. Inputs are passed as arguments.
- `src/lib/explanation.ts` only *describes* a `CheckResult` it is given. It never re-evaluates rules and cannot change the decision. The deterministic checker stays authoritative.
- Time helpers live only in `src/lib/time.ts`. Do not reintroduce time helpers into the rule module.
- UI components receive data as props; they do not import fixture data directly (except `AvailabilityForm` reading `MOCK_NOW_MIN` for display).

## Acceptance criteria (must be preserved)

1. **AC1** Accept a candidate interval only when `0 <= start < end <= 1440` (minutes of the day) and `start` is after the mock current time.
2. **AC2** Reject any booking strictly longer than 120 minutes.
3. **AC3** Reject any request for a room whose status is `Blocked`.
4. **AC4** Reject an interval that overlaps an existing booking for the room. Touch points are allowed (600–660 and 660–720 do not overlap).
5. **AC5** Show a clear `Available` or `Unavailable` decision badge with explicit validation feedback, without altering mock data.
6. **AC6** Keep a responsive layout that works at desktop and mobile widths.

Filter behavior (also covered by tests): F1 capacity, F2 equipment, F3 blocked-room exclusion (via filtering), F4 empty state, F5 dynamic room switching without losing times.

## Setup

```bash
npm install
```

Requires Node.js (the test runner uses `node:test`, available in Node 18+).

## Safe commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server (local preview only). |
| `npm run build` | Production build to `dist/`. Run before finishing any change. |
| `npm test` | Run the full test suite (availability + explanation). |
| `npm run typecheck` | TypeScript strict type-check (`tsc --noEmit -p tsconfig.app.json`). |
| `npm run lint` | ESLint over the project. |

### Verification before finishing any change

1. `npm test` — all tests must pass.
2. `npm run typecheck` — no type errors.
3. `npm run build` — must succeed.
4. If the UI changed, re-read the edited components to confirm rendered behavior still matches AC5 and AC6.

## Coding conventions

- Make the smallest genuine change. Do not introduce new patterns, abstractions, or dependencies unless a concrete need requires it.
- Preserve existing UI, copy, layout, and visual behavior unless the user asks otherwise.
- Import project modules with the `@/` alias (`@/lib/availability`), not deep relative paths.
- Default to no comments; only add one when the reason is non-obvious.
- Delete code that a change replaces. Do not leave dead exports, duplicate helpers, or commented-out blocks.
- Match neighboring file conventions: naming, file layout, error handling, import style.
- Any change to a booking rule must keep AC1–AC6 behavior identical unless the user explicitly asks for a change.

## Test expectations

- **27 booking-rule and filter tests** in `tests/availability.test.ts` covering AC1–AC5, fixture purity, catalog integrity, F1/F2 filters, and filter utilities.
- **22 explanation adapter tests** in `tests/explanation.test.ts` covering reason-code mapping, the system instruction, output validation, input validation, abort/cancellation, and non-authoritativeness.
- **Total: 49 tests across 20 suites.** All must pass.
- Tests run through `tests/register-aliases.mjs` so `@/` imports resolve under Node.
- Do not add a test runner dependency (Jest, Vitest, Mocha). Use the built-in `node:test`.
- Do not remove or weaken existing tests. New behavior should get new tests.

## Optional explanation feature

- `getExplanation` in `src/lib/explanation.ts` is an async mock adapter with a short simulated delay.
- **Input validation**: validates request shape (roomId, roomName, finite start/end for non-null decisions, valid decision, reasons array). Returns a `fallback` response for anything invalid — it never throws.
- **System instruction**: a constant `SYSTEM_INSTRUCTION` restricts output to provided facts, forbids inventing details, caps output at two sentences, and states the deterministic checker is authoritative.
- **Structured context**: the prompt is built from a `StructuredContext` (roomLabel, start/end time, isAvailable, reasonCode, reasons). `reasonCode` values: `available | invalid_interval | past_start | too_long | blocked | overlap | no_decision | unknown`.
- **Output validation**: `sanitizeModelOutput` rejects empty output, truncates to two sentences, requires the summary to reference at least one provided fact, and checks types before returning. Validation failures degrade to a fallback summary.
- **Graceful failure**: async errors and `AbortSignal` cancellation degrade to a fallback summary; stale requests are aborted when the decision changes.
- The feature is opt-in via a checkbox in `AvailabilityForm.tsx`, appears below the decision badge, and has loading, success, and fallback states.

## Forbidden actions

- **No secrets.** Never add API keys, tokens, passwords, or client-side secrets. Do not reference `.env` values in code or docs.
- **No production deployments.** Do not deploy, publish, or push to a remote host. This is a local prototype only.
- **No destructive shell commands.** Do not run `rm -rf`, `git reset --hard`, `drop`, `truncate`, or anything that deletes user work or project files. Identify root causes; do not bypass safety checks with destructive shortcuts.
- **No unreviewed dependency changes.** Do not add, upgrade, or remove packages without explicit user approval. Do not add a test runner, UI theme library, or icon pack — use the existing stack (React, Tailwind, Lucide React, `node:test`).
- **No login, database, or real personal data.** The project is intentionally auth-free and uses fictional fixtures.
- **No reintroducing time helpers into `availability.ts`.** Keep them in `src/lib/time.ts`.
- **No weakening or deleting existing tests.**

## Resolved issues

- Cleared time inputs (NaN) are rejected by `checkAvailability` as invalid intervals, preserving AC1.
- The decision badge is derived from current inputs via `useMemo`, not stored state — no stale results after editing room or times.
- `Timeline.tsx` receives bookings as props instead of importing fixture data directly.
