# AGENTS.md

Project constraints and rules for refactoring the Smart Campus Room Availability Checker.

## Scope

- Single-page React + Tailwind prototype built with Vite.
- No authentication, backend, database, analytics, or external APIs.
- Fictional sample data lives in `src/data.ts` — a catalog of 4 rooms (Alpha Lab, Beta Hall, Gamma Pod, Delta Studio) with mock bookings.
- Room filtering (F1 capacity, F2 equipment, F3 blocked-room exclusion, F4 empty state, F5 dynamic switching) lives in `src/lib/roomFilters.ts` as pure functions.

## Acceptance criteria (must be preserved)

1. **AC1** Accept a candidate interval only when `0 <= start < end <= 1440` (minutes of the day) and `start` is after the mock current time.
2. **AC2** Reject any booking strictly longer than 120 minutes.
3. **AC3** Reject any request for a room whose status is `Blocked`.
4. **AC4** Reject an interval that overlaps an existing booking for the room. Touch points are allowed (600–660 and 660–720 do not overlap).
5. **AC5** Show a clear `Available` or `Unavailable` decision badge with explicit validation feedback, without altering mock data.
6. **AC6** Keep a responsive layout that works at desktop and mobile widths.

## Pure availability function

- The booking rules live only in `src/lib/availability.ts` as `checkAvailability`.
- It must stay pure: no React, no DOM, no reads of module-level mutable state, no mutation of inputs or fixtures.
- Inputs (room list, bookings, current time) are passed as arguments.
- Time conversion helpers live in `src/lib/time.ts`. Do not reintroduce time helpers into the rule module.
- Any change to a rule must keep AC1–AC6 behavior identical unless the user asks for a change.

## Refactoring rules

- Preserve the existing UI, copy, layout, and visual behavior unless the user asks otherwise.
- Make the smallest genuine change. Do not introduce new patterns, abstractions, or dependencies unless a concrete need (multiple input formats or policies) requires it.
- Do not add packages (including test runners) without asking the user first.
- Delete code that a change replaces. Do not leave dead exports, duplicate helpers, or commented-out blocks.
- Import project modules with the `@/` alias (maps to `src/`).
- Default to no comments; only add one when the reason is non-obvious.

## Verification before finishing

- Run `npm run build` and fix any failures.
- Run `npx tsc --noEmit -p tsconfig.app.json` to type-check.
- If the UI changed, re-read the edited components to confirm the rendered behavior still matches AC5 and AC6.

## Resolved issues

- Cleared time inputs (NaN) are now rejected by `checkAvailability` as invalid intervals, preserving AC1.
- The decision badge is derived from current inputs via `useMemo`, not stored state — no stale results after editing room or times.
- `Timeline.tsx` receives bookings as props instead of importing fixture data directly.
