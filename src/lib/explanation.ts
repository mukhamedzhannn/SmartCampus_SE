import type { ExplanationRequest, ExplanationResponse } from '@/types';
import { minutesToTime } from '@/lib/time';

/**
 * Mock explanation adapter. It only *describes* a CheckResult that the
 * deterministic checker already produced — it never re-evaluates booking
 * rules, so checkAvailability stays authoritative. Failures degrade to a
 * fallback summary rather than throwing.
 */

function isValidRequest(req: ExplanationRequest): boolean {
  if (req === null || typeof req !== 'object') return false;
  if (typeof req.roomId !== 'string' || req.roomId.length === 0) return false;
  if (typeof req.roomName !== 'string') return false;
  if (typeof req.start !== 'number' || typeof req.end !== 'number') return false;
  if (req.result === null || typeof req.result !== 'object') return false;
  const d = req.result.decision;
  if (d !== 'available' && d !== 'unavailable' && d !== null) return false;
  if (!Array.isArray(req.result.reasons)) return false;
  // A null decision may legitimately accompany NaN/empty time inputs; only
  // require finite bounds when a decision has actually been produced.
  if (d !== null && (!Number.isFinite(req.start) || !Number.isFinite(req.end))) {
    return false;
  }
  return true;
}

function buildSummary(req: ExplanationRequest): string {
  const { result, roomName, start, end } = req;
  const boundsValid = Number.isFinite(start) && Number.isFinite(end);
  const interval = boundsValid
    ? `${minutesToTime(start)}–${minutesToTime(end)}`
    : 'the selected times';
  if (result.decision === 'available') {
    return `${roomName} is available for your ${interval} request. All booking rules passed.`;
  }
  if (result.decision === 'unavailable') {
    const count = result.reasons.length;
    const noun = count === 1 ? 'one rule' : `${count} rules`;
    return `${roomName} is unavailable for ${interval}. The deterministic checker flagged ${noun}.`;
  }
  return `No decision has been made yet for ${roomName} at ${interval}.`;
}

function buildDetails(req: ExplanationRequest): string[] {
  const { result, roomName } = req;
  if (result.decision === 'available') {
    return [
      `${roomName} is Active and free during the requested interval.`,
      'The requested duration is within the 120-minute maximum.',
      'No existing bookings overlap the requested times (touch points are allowed).',
    ];
  }
  if (result.decision === 'unavailable') {
    if (result.reasons.length === 0) {
      return ['The checker reported unavailable without listing a specific reason.'];
    }
    return result.reasons.map((r, i) => `Reason ${i + 1}: ${r}`);
  }
  return ['Pick a room and valid start/end times to see an availability decision.'];
}

function fallback(req: ExplanationRequest, message: string): ExplanationResponse {
  return {
    ok: false,
    source: 'fallback',
    summary: message,
    details: [
      'The explanation service could not produce a detailed description.',
      'The availability decision shown above is still fully authoritative.',
    ],
  };
}

export async function getExplanation(
  req: ExplanationRequest,
  opts: { signal?: AbortSignal; delayMs?: number } = {},
): Promise<ExplanationResponse> {
  if (!isValidRequest(req)) {
    return fallback(
      req,
      'Sorry, the explanation could not be generated for this request.',
    );
  }

  const delayMs = opts.delayMs ?? 350;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      opts.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  } catch {
    return fallback(req, 'The explanation request was cancelled.');
  }

  if (opts.signal?.aborted) {
    return fallback(req, 'The explanation request was cancelled.');
  }

  return {
    ok: true,
    source: 'mock',
    summary: buildSummary(req),
    details: buildDetails(req),
  };
}
