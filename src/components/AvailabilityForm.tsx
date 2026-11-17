import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, AlertTriangle, RotateCcw, Sparkles, Loader2, Info } from 'lucide-react';
import type { Room, Booking, CheckResult, ExplanationResponse } from '../types';
import { timeToMinutes, minutesToTime } from '@/lib/time';
import { MOCK_NOW_MIN } from '../data';
import { getExplanation } from '@/lib/explanation';
import DecisionBadge from './DecisionBadge';

export default function AvailabilityForm({
  rooms,
  bookings,
  selectedRoomId,
  startTime,
  endTime,
  result,
  onRoomChange,
  onStartTimeChange,
  onEndTimeChange,
}: {
  rooms: Room[];
  bookings: Booking[];
  selectedRoomId: string;
  startTime: string;
  endTime: string;
  result: CheckResult;
  onRoomChange: (id: string) => void;
  onStartTimeChange: (t: string) => void;
  onEndTimeChange: (t: string) => void;
}) {
  const startMin = useMemo(() => timeToMinutes(startTime), [startTime]);
  const endMin = useMemo(() => timeToMinutes(endTime), [endTime]);

  const handleReset = () => {
    onStartTimeChange('11:00');
    onEndTimeChange('12:00');
  };

  const durationValid =
    !Number.isNaN(startMin) && !Number.isNaN(endMin) && endMin > startMin;
  const duration = durationValid ? endMin - startMin : 0;

  // Optional explanation feature — never affects the deterministic decision.
  const [explainEnabled, setExplainEnabled] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Invalidate stale explanation whenever the authoritative decision changes.
  useEffect(() => {
    setExplanation(null);
  }, [result.decision, selectedRoomId, startMin, endMin]);

  const handleExplain = async () => {
    if (!result.decision) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setExplainLoading(true);
    setExplanation(null);
    try {
      const room = rooms.find((r) => r.id === selectedRoomId);
      const res = await getExplanation(
        {
          roomId: selectedRoomId,
          roomName: room?.name ?? selectedRoomId,
          start: startMin,
          end: endMin,
          result,
        },
        { signal: controller.signal, delayMs: 300 },
      );
      if (!controller.signal.aborted) {
        setExplanation(res);
      }
    } catch {
      if (!controller.signal.aborted) {
        setExplanation({
          ok: false,
          source: 'fallback',
          reasonCode: 'unknown',
          summary: 'The explanation request failed unexpectedly.',
          details: ['The availability decision shown above is still authoritative.'],
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setExplainLoading(false);
      }
    }
  };

  const handleToggleExplain = (enabled: boolean) => {
    setExplainEnabled(enabled);
    if (!enabled) {
      abortRef.current?.abort();
      setExplainLoading(false);
      setExplanation(null);
    }
  };

  // Auto-fetch when enabling, if there is already a decision to describe.
  useEffect(() => {
    if (explainEnabled && result.decision && !explanation && !explainLoading) {
      handleExplain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainEnabled]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-semibold text-slate-900">
          Check room availability
        </h2>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Mock current time: <span className="font-medium text-slate-700">{minutesToTime(MOCK_NOW_MIN)}</span>
      </p>

      {/* Room selector */}
      <label className="mb-1.5 block text-sm font-medium text-slate-700">Room</label>
      <select
        value={selectedRoomId}
        onChange={(e) => onRoomChange(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      >
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} — {r.building} {r.status === 'Blocked' ? '(Blocked)' : ''}
          </option>
        ))}
      </select>

      {/* Time inputs */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="mb-4 text-xs text-slate-500">
        Duration: <span className="font-medium text-slate-700">{duration} min</span>
        {' '}
        ({minutesToTime(startMin)}–{minutesToTime(endMin)})
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
      >
        <RotateCcw className="h-4 w-4" />
        Reset times
      </button>

      {/* Live result — F5: updates as inputs change */}
      {result.decision && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Decision</span>
            <DecisionBadge decision={result.decision} />
          </div>

          {result.reasons.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-rose-600">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          {result.decision === 'available' && (
            <p className="mt-3 text-xs text-emerald-700">
              All checks passed — this room is available for the selected interval.
            </p>
          )}
        </div>
      )}

      {/* Optional explanation — opt-in, non-authoritative. */}
      {result.decision && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={explainEnabled}
              onChange={(e) => handleToggleExplain(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            <Sparkles className="h-4 w-4 text-blue-500" />
            Explain this decision
          </label>

          {explainEnabled && (
            <div className="mt-3">
              {explainLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating explanation…
                </div>
              )}

              {!explainLoading && explanation && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-700">
                        {explanation.summary}
                      </p>
                      {explanation.details.length > 0 && (
                        <ul className="space-y-1">
                          {explanation.details.map((d, i) => (
                            <li key={i} className="text-xs text-slate-500">
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="pt-1 text-[10px] text-slate-400">
                        Explanation is informational only — the badge above is the
                        authoritative result ({explanation.source}).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!explainLoading && !explanation && (
                <button
                  type="button"
                  onClick={handleExplain}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  Get explanation
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
