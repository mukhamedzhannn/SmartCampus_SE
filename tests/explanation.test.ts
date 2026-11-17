import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getExplanation, SYSTEM_INSTRUCTION } from '../src/lib/explanation.ts';
import { checkAvailability } from '../src/lib/availability.ts';
import { rooms, bookings, MOCK_NOW_MIN } from '../src/data.ts';
import type { ExplanationRequest } from '../src/types.ts';

const ROOM_A = 'r-a';
const ROOM_C = 'r-c';
const ROOM_D = 'r-d';

function req(roomId: string, start: number, end: number): ExplanationRequest {
  const result = checkAvailability(roomId, start, end, rooms, bookings, MOCK_NOW_MIN);
  const room = rooms.find((r) => r.id === roomId)!;
  return { roomId, roomName: room.name, start, end, result };
}

describe('Explanation adapter: available decision', () => {
  it('describes an available room with passing-rule details and reasonCode', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 900), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.source, 'mock');
    assert.equal(res.reasonCode, 'available');
    assert.ok(res.summary.includes('Delta Studio'));
    assert.ok(res.summary.includes('available'));
    assert.ok(res.details.length >= 1);
    assert.ok(res.details.some((d) => d.includes('Active')));
  });
});

describe('Explanation adapter: unavailable decision', () => {
  it('lists each reason flagged by the deterministic checker (too_long)', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 901), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.reasonCode, 'too_long');
    assert.ok(res.summary.includes('unavailable'));
    assert.ok(res.details.some((d) => d.includes('120-minute')));
  });

  it('maps overlap to reasonCode=overlap', async () => {
    const res = await getExplanation(req(ROOM_A, 630, 690), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.reasonCode, 'overlap');
  });

  it('maps blocked room to reasonCode=blocked', async () => {
    const res = await getExplanation(req(ROOM_C, 780, 840), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.reasonCode, 'blocked');
  });

  it('maps past-start to reasonCode=past_start', async () => {
    const res = await getExplanation(req(ROOM_D, 480, 540), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.reasonCode, 'past_start');
  });

  it('maps invalid interval to reasonCode=invalid_interval', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 720), { delayMs: 0 });
    assert.equal(res.ok, true);
    assert.equal(res.reasonCode, 'invalid_interval');
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
    assert.equal(res.reasonCode, 'unknown');
    assert.ok(res.details.some((d) => d.includes('without listing a specific reason')));
  });
});

describe('Explanation adapter: null decision', () => {
  it('guides the user to pick a room and times with reasonCode=no_decision', async () => {
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
    assert.equal(res.reasonCode, 'no_decision');
    assert.ok(res.summary.includes('No decision'));
  });
});

describe('Explanation adapter: system instruction', () => {
  it('restricts the model to provided facts, forbids hallucination, caps two sentences', () => {
    assert.ok(SYSTEM_INSTRUCTION.includes('only the facts provided'));
    assert.ok(SYSTEM_INSTRUCTION.toLowerCase().includes('never invent'));
    assert.ok(SYSTEM_INSTRUCTION.includes('at most two sentences'));
  });

  it('states the deterministic checker is authoritative', () => {
    assert.ok(SYSTEM_INSTRUCTION.toLowerCase().includes('authoritative'));
  });
});

describe('Explanation adapter: output validation', () => {
  it('summary is at most two sentences', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 900), { delayMs: 0 });
    const sentences = res.summary.split(/(?<=[.!?])\s+/).filter(Boolean);
    assert.ok(sentences.length <= 2);
  });

  it('summary mentions the room label (a provided fact)', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 900), { delayMs: 0 });
    assert.ok(res.summary.includes('Delta Studio'));
  });

  it('details is an array of strings', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 900), { delayMs: 0 });
    assert.ok(Array.isArray(res.details));
    assert.ok(res.details.every((d) => typeof d === 'string'));
  });

  it('reasonCode is a known value on success', async () => {
    const res = await getExplanation(req(ROOM_D, 780, 900), { delayMs: 0 });
    const valid = ['available', 'invalid_interval', 'past_start', 'too_long', 'blocked', 'overlap', 'no_decision', 'unknown'];
    assert.ok(valid.includes(res.reasonCode));
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
    assert.ok(res.summary.includes('unavailable'));
    assert.equal(r.result.decision, 'unavailable');
  });
});
