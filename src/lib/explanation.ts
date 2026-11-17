import type {
  ExplanationRequest,
  ExplanationResponse,
  ReasonCode,
} from '@/types';
import { minutesToTime } from '@/lib/time';

/**
 * Mock explanation adapter. It only *describes* a CheckResult that the
 * deterministic checker already produced — it never re-evaluates booking
 * rules, so checkAvailability stays authoritative. Failures degrade to a
 * fallback summary rather than throwing.
 */

const SYSTEM_INSTRUCTION = `You are an availability-explanation assistant for a campus room booking tool.
Your job is to restate, in plain language, a decision that was already made by the deterministic booking checker.
Strict rules:
1. Use only the facts provided in the structured context. Never invent room names, times, booking titles, capacities, equipment, or reasons not present in the input.
2. Do not add advice, recommendations, or speculation about why a rule exists or what the user should do next.
3. Output at most two sentences total.
4. If the context is missing or the decision is "no_decision", say only that no decision is available yet.
5. Never contradict the provided isAvailable flag or reasonCode. The deterministic checker is authoritative; your text must agree with it.`;

interface StructuredContext {
  roomLabel: string;
  startLabel: string;
  endLabel: string;
  isAvailable: boolean | null;
  reasonCode: ReasonCode;
  reasons: string[];
}

function isValidRequest(req: ExplanationRequest): boolean {
  if (req === null || typeof req !== 'object') return false;
  if (typeof req.roomId !== 'string' || req.roomId.length === 0) return false;
  if (typeof req.roomName !== 'string') return false;
  if (typeof req.start !== 'number' || typeof req.end !== 'number') return false;
  if (req.result === null || typeof req.result !== 'object') return false;
  const d = req.result.decision;
  if (d !== 'available' && d !== 'unavailable' && d !== null) return false;
  if (!Array.isArray(req.result.reasons)) return false;
  if (d !== null && (!Number.isFinite(req.start) || !Number.isFinite(req.end))) {
    return false;
  }
  return true;
}

function deriveReasonCode(req: ExplanationRequest): ReasonCode {
  const { result, start, end } = req;
  if (result.decision === null) return 'no_decision';
  if (result.decision === 'available') return 'available';
  const reasons = result.reasons;
  if (reasons.some((r) => r.includes('Interval is invalid'))) return 'invalid_interval';
  if (reasons.some((r) => r.includes('after current time'))) return 'past_start';
  if (reasons.some((r) => r.includes('120-minute'))) return 'too_long';
  if (reasons.some((r) => r.includes('Blocked'))) return 'blocked';
  if (reasons.some((r) => r.includes('Overlaps'))) return 'overlap';
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'invalid_interval';
  return 'unknown';
}

function buildContext(req: ExplanationRequest): StructuredContext {
  const boundsValid = Number.isFinite(req.start) && Number.isFinite(req.end);
  return {
    roomLabel: req.roomName,
    startLabel: boundsValid ? minutesToTime(req.start) : 'unknown',
    endLabel: boundsValid ? minutesToTime(req.end) : 'unknown',
    isAvailable:
      req.result.decision === 'available'
        ? true
        : req.result.decision === 'unavailable'
          ? false
          : null,
    reasonCode: deriveReasonCode(req),
    reasons: req.result.reasons.slice(),
  };
}

function buildSystemPrompt(ctx: StructuredContext): string {
  return `${SYSTEM_INSTRUCTION}

Structured context (use only these facts):
- roomLabel: "${ctx.roomLabel}"
- startTime: "${ctx.startLabel}"
- endTime: "${ctx.endLabel}"
- isAvailable: ${ctx.isAvailable === null ? 'null' : ctx.isAvailable}
- reasonCode: "${ctx.reasonCode}"
- reasons: ${JSON.stringify(ctx.reasons)}

Respond with at most two sentences restating the decision using only the facts above.`;
}

function buildSummary(ctx: StructuredContext): string {
  const { roomLabel, startLabel, endLabel, isAvailable, reasonCode, reasons } = ctx;
  const interval = `${startLabel}–${endLabel}`;
  if (isAvailable === true) {
    return `${roomLabel} is available for your ${interval} request. All booking rules passed.`;
  }
  if (isAvailable === false) {
    const count = reasons.length;
    const noun = count === 1 ? 'one rule' : `${count} rules`;
    const label = reasonCode === 'unknown' ? 'one or more rules' : noun;
    return `${roomLabel} is unavailable for ${interval}. The deterministic checker flagged ${label}.`;
  }
  return `No decision has been made yet for ${roomLabel} at ${interval}.`;
}

function buildDetails(ctx: StructuredContext): string[] {
  const { isAvailable, reasonCode, reasons, roomLabel } = ctx;
  if (isAvailable === true) {
    return [
      `${roomLabel} is Active and free during the requested interval.`,
      'The requested duration is within the 120-minute maximum.',
      'No existing bookings overlap the requested times (touch points are allowed).',
    ];
  }
  if (isAvailable === false) {
    if (reasons.length === 0) {
      return ['The checker reported unavailable without listing a specific reason.'];
    }
    return reasons.map((r, i) => `Reason ${i + 1}: ${r}`);
  }
  return ['Pick a room and valid start/end times to see an availability decision.'];
}

function isReasonCode(v: unknown): v is ReasonCode {
  return (
    v === 'available' ||
    v === 'invalid_interval' ||
    v === 'past_start' ||
    v === 'too_long' ||
    v === 'blocked' ||
    v === 'overlap' ||
    v === 'no_decision' ||
    v === 'unknown'
  );
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function sanitizeModelOutput(raw: unknown, ctx: StructuredContext): {
  summary: string;
  details: string[];
} | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const text = raw.trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  const trimmed = sentences.slice(0, 2).join(' ');
  const forbidden = [ctx.roomLabel, ctx.startLabel, ctx.endLabel].filter(
    (label) => label !== 'unknown' && label.length > 0,
  );
  const mentionsKnownFact = forbidden.length === 0 || forbidden.some((f) => trimmed.includes(f));
  if (!mentionsKnownFact) return null;
  return { summary: trimmed, details: buildDetails(ctx) };
}

function fallback(
  req: ExplanationRequest | null,
  message: string,
): ExplanationResponse {
  let reasonCode: ReasonCode;
  if (req && typeof req === 'object' && req.result && typeof req.result === 'object') {
    reasonCode = deriveReasonCode(req);
  } else {
    reasonCode = 'unknown';
  }
  return {
    ok: false,
    source: 'fallback',
    reasonCode,
    summary: message,
    details: [
      'The explanation service could not produce a detailed description.',
      'The availability decision shown above is still fully authoritative.',
    ],
  };
}

function mockModelCall(_systemPrompt: string, _ctx: StructuredContext): string {
  const ctx = _ctx;
  return buildSummary(ctx);
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

  const ctx = buildContext(req);
  const systemPrompt = buildSystemPrompt(ctx);

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

  const rawModelOutput = mockModelCall(systemPrompt, ctx);
  const validated = sanitizeModelOutput(rawModelOutput, ctx);
  if (validated === null) {
    return fallback(req, 'The explanation output did not pass validation.');
  }

  const reasonCode = ctx.reasonCode;
  if (!isReasonCode(reasonCode) || !isStringArray(validated.details)) {
    return fallback(req, 'The explanation output did not pass validation.');
  }

  return {
    ok: true,
    source: 'mock',
    reasonCode,
    summary: validated.summary,
    details: validated.details,
  };
}

export { SYSTEM_INSTRUCTION };
