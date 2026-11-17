import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getExplanation } from '../src/lib/explanation.ts';
import { checkAvailability } from '../src/lib/availability.ts';
import { rooms, bookings, MOCK_NOW_MIN } from '../src/data.ts';
import type { ExplanationRequest } from '../src/types.ts';

const ROOM_D = 'r-d';

function req(roomId: string, start: number, end: number): ExplanationRequest {
  const result = checkAvailability(roomId, start, end, rooms, bookings, MOCK_NOW_MIN);
  const room = rooms.find((r) => r.id === roomId)!;
  return { roomId, roomName: room.name, start, end, result };
}

describe('Explanation adapter: available decision', () => {
  it('describes an available room with passing-rule details', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 900), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.source, 'mock');
    assert.ok(res.summary.includes('Delta Studio'));
    assert.ok(res.summary.includes('available'));
    assert.ok(res.details.length >= 1);
    assert.ok(res.details.some((d) => d.includes('Active')));
  });
});

describe('Explanation adapter: unavailable decision', () => {
  it('lists each reason flagged by the deterministic checker', async () => {
    // 13:00-15:01 on Delta Studio: 121 minutes -> exceeds max duration.
    const res = await getExplanation(req(ROOM_D, 780, 901), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.ok(res.summary.includes('unavailable'));
    assert.ok(res.details.some((d) => d.includes('120-minute')));
  });

  it('reports unavailable with a clear message when no reasons are listed', async () => {
    const res = await getExplanation(
      {
        roomId: ROOM_D,
        roomName: 'Delta Studio',
        start: 780,
        end: 900,
        result: { decision: 'unavailable', reasons: [] },
      },
      { delayMs: 0 },
    );
    assert.equal(res.ok, true);
    assert.ok(res.details.some((d) => d.includes('without listing a specific reason')));
  });
});

describe('Explanation adapter: null decision', () => {
  it('guides the user to pick a room and times', async () => {
    const res = await getExplanation(
      {
        roomId: ROOM_D,
        roomName: 'Delta Studio',
        start: NaN,
        end: NaN,
        result: { decision: null, reasons: [] },
      },
      { delayMs: 0 },
    );
    assert.equal(res.ok, true);
    assert.ok(res.summary.includes('No decision'));
  });
});

describe('Explanation adapter: input validation', () => {
  it('rejects a null request with a fallback response', async () => {
    const res = await getExplanation(null as unknown as ExplanationRequest, { delayMs: 0 });
    assert.equal(res.ok, false);
    assert.equal(res.source, 'fallback');
    assert.ok(res.summary.includes('could not be generated'));
  });

  it('rejects a request with a non-string roomId', async () => {
    const res = await getExplanation(
      { roomId: 123, roomName: 'X', start: 600, end: 660, result: { decision: 'available', reasons: [] } } as unknown as ExplanationRequest,
      { delayMs: 0 },
    );
    assert.equal(res.ok, false);
    assert.equal(res.source, 'fallback');
  });

  it('rejects a request with an invalid decision value', async () => {
    const res = await getExplanation(
      { roomId: ROOM_D, roomName: 'Delta Studio', start: 600, end: 660, result: { decision: 'maybe', reasons: [] } } as unknown as ExplanationRequest,
      { delayMs: 0 },
    );
    assert.equal(res.ok, false);
    assert.equal(res.source, 'fallback');
  });

  it('rejects a request with non-finite start/end', async () => {
    const res = await getExplanation(
      { roomId: ROOM_D, roomName: 'Delta Studio', start: Infinity, end: 660, result: { decision: 'available', reasons: [] } } as unknown as ExplanationRequest,
      { delayMs: 0 },
    );
    assert.equal(res.ok, false);
  });
});

describe('Explanation adapter: graceful failure (abort)', () => {
  it('returns a fallback when the request is aborted', async () => {
    const controller = new AbortController();
    const promise = getExplanation(req(ROOM_D, 780, 900), {
      signal: controller.signal,
      delayMs: 50,
    });
    controller.abort();
    const res = await promise;
    assert.equal(res.ok, false);
    assert.equal(res.source, 'fallback');
    assert.ok(res.summary.includes('cancelled'));
  });
});

describe('Explanation adapter: non-authoritative', () => {
  it('never changes the deterministic decision it was given', async () => {
    const r = req(ROOM_D, 780, 901); // unavailable (duration)
    const res = await getExplanation(r, { delayMs: 0 });
    assert.equal(res.ok, true);
    // The explanation must reflect the same decision, not override it.
    assert.ok(res.summary.includes('unavailable'));
    assert.equal(r.result.decision, 'unavailable');
  });
});
