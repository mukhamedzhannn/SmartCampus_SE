import { useMemo } from 'react';
import { Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import type { Room, Booking, CheckResult } from '../types';
import { timeToMinutes, minutesToTime } from '@/lib/time';
import { MOCK_NOW_MIN } from '../data';
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
    </div>
  );
}
