# Smart Campus Room Availability Checker

A single-page prototype that lets internal campus users check whether a room can be booked for a time interval under fixed booking rules. Uses fictional sample data only — no authentication, no accounts, no backend, and no real personal data.

## Acceptance Criteria (AC1–AC6)

| # | Criterion | Where enforced |
|---|-----------|----------------|
| AC1 | Candidate interval must satisfy `0 <= start < end <= 1440` and `start > nowMin` (future start). | `src/lib/availability.ts` |
| AC2 | Reject any booking strictly longer than 120 minutes. | `src/lib/availability.ts` |
| AC3 | Reject any request for a room whose status is `Blocked`. | `src/lib/availability.ts` |
| AC4 | Reject an interval that overlaps an existing booking. Touch points are allowed (e.g. 600–660 and 660–720 do not overlap). | `src/lib/availability.ts` |
| AC5 | Display a clear Available or Unavailable decision badge with explicit validation feedback, without modifying existing bookings. | `src/components/DecisionBadge.tsx`, `src/components/AvailabilityForm.tsx` |
| AC6 | Responsive layout that works at desktop and mobile widths. | `src/App.tsx`, all components |

## Architecture

Deterministic booking rules are fully separated from UI presentation:

```
src/
  App.tsx                  Top-level page; holds filter + form state, derives the decision via useMemo.
  data.ts                  Fictional rooms, bookings, and MOCK_NOW_MIN (570 = 09:30).
  types.ts                 Shared types: Room, Booking, Decision, CheckResult, Explanation*.
  lib/
    availability.ts        Pure booking-rule checker (checkAvailability). AC1–AC5 live here. No React, no DOM, no mutation.
    roomFilters.ts         Pure filter helpers (capacity, equipment, room bookings, counts).
    time.ts                Time conversion helpers (timeToMinutes, minutesToTime, DAY_END).
    explanation.ts         Mock explanation adapter — describes a CheckResult, never recomputes rules.
  components/
    AvailabilityForm.tsx   Right panel: room/time inputs, decision badge, optional explanation UI.
    DecisionBadge.tsx      The authoritative Available/Unavailable badge.
    FilterControls.tsx     Capacity + equipment filters.
    RoomCard.tsx           Selectable room card.
    Timeline.tsx           Visual day timeline with existing bookings + candidate interval.
tests/
  availability.test.ts     Booking-rule + filter tests (31 cases).
  explanation.test.ts      Explanation adapter tests (21 cases).
  register-aliases.mjs     Node loader hook registration for @/ alias in tests.
  alias-loader.mjs         Resolves @/ imports to src/ during test runs.
```

### Layering rules

- `src/lib/availability.ts` is the single source of truth for booking rules. It stays pure: no React, no DOM, no module-level mutable state, no mutation of inputs or fixtures. Inputs are passed as arguments.
- `src/lib/explanation.ts` only *describes* a `CheckResult`. It never re-evaluates rules and cannot change the decision. The deterministic checker stays authoritative.
- UI components receive data as props; they do not import fixture data directly (except `AvailabilityForm` reading `MOCK_NOW_MIN` for display).

## Tech Stack

- React 18 + TypeScript (strict), built with Vite 5.
- Tailwind CSS 3 for styling. Lucide React for icons.
- Node.js native test runner (`node:test`) for tests — no Jest/Mocha/Vitest.
- Path alias `@/` maps to `src/` (configured in `tsconfig.app.json` and `vite.config.ts`).

## Setup & Commands

Requires Node.js 18+ (the test runner uses `node:test`).

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server (local preview)
npm run build      # production build to dist/
npm test           # run the full test suite (availability + explanation)
npm run typecheck  # TypeScript strict type-check (tsc --noEmit)
npm run lint       # ESLint over the project
```

### Verification before finishing any change

1. `npm test` — all tests must pass.
2. `npm run typecheck` — no type errors.
3. `npm run build` — must succeed.
4. If the UI changed, re-read the edited components to confirm rendered behavior still matches AC5 and AC6.

## Fictional Data

Four rooms and five bookings, all defined in `src/data.ts`:

| Room | Capacity | Status | Equipment | Bookings |
|------|----------|--------|-----------|----------|
| Alpha Lab | 10 | Active | Projector, Whiteboard | 10:00–11:00, 11:00–12:00, 15:00–17:00 |
| Beta Hall | 30 | Active | Projector, Audio System, Microphone | 11:00–13:00 |
| Gamma Pod | 4 | Blocked | TV Screen | (none) |
| Delta Studio | 15 | Active | Whiteboard, PC | 12:00–13:00 |

`MOCK_NOW_MIN` is 570 (09:30), fixed so the prototype is deterministic.

## Optional Explanation Feature

`getExplanation` in `src/lib/explanation.ts` is an async mock adapter with a short simulated delay. It is opt-in via a checkbox in the form, appears below the decision badge, and has loading, success, and fallback states. It validates request shape, produces a two-sentence summary, and degrades to a fallback on any failure or cancellation. The decision badge is always shown first and remains authoritative.

## Limitations

- **Fictional data only.** No real room catalog, no live booking system, no persistence — reloading the page resets everything.
- **No authentication.** Anyone can query any room; there are no accounts or role-based access.
- **Single-day horizon.** All times are minutes within one day (0–1440). There is no date picker or multi-day support.
- **No booking action.** The tool only checks availability; it does not create, modify, or delete bookings.
- **Explanation is mock-only.** The explanation adapter simulates a model response with a delay. A real backend would replace it behind the same `ExplanationRequest`/`ExplanationResponse` contract.
