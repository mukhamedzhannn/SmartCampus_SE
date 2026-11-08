import { minutesToTime, DAY_END } from '@/lib/time';
import { getRoomBookings } from '@/lib/roomFilters';
import type { Booking } from '../types';

export default function Timeline({
  roomId,
  bookings,
  candidateStart,
  candidateEnd,
}: {
  roomId: string;
  bookings: Booking[];
  candidateStart: number;
  candidateEnd: number;
}) {
  const roomBookings = getRoomBookings(bookings, roomId);
  const hours = Array.from({ length: 25 }, (_, i) => i * 60); // 0..1440

  const candidateValid =
    !Number.isNaN(candidateStart) &&
    !Number.isNaN(candidateEnd) &&
    candidateEnd > candidateStart;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Today's schedule</h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Existing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" /> Candidate
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-14 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-100">
        {roomBookings.map((b) => {
          const left = (b.start / DAY_END) * 100;
          const width = ((b.end - b.start) / DAY_END) * 100;
          return (
            <div
              key={b.id}
              className="absolute top-1.5 h-11 rounded-md bg-slate-300 px-1.5 py-1 text-[9px] leading-tight text-slate-700 shadow-sm"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${b.title} — ${minutesToTime(b.start)}–${minutesToTime(b.end)}`}
            >
              <span className="block truncate font-medium">{b.title}</span>
              <span className="text-slate-500">
                {minutesToTime(b.start)}–{minutesToTime(b.end)}
              </span>
            </div>
          );
        })}

        {candidateValid && (
          <div
            className="absolute top-1.5 h-11 rounded-md border-2 border-blue-500 bg-blue-400/40"
            style={{
              left: `${Math.max(0, (candidateStart / DAY_END)) * 100}%`,
              width: `${Math.min(100, ((candidateEnd - candidateStart) / DAY_END)) * 100}%`,
            }}
            title={`Candidate ${minutesToTime(candidateStart)}–${minutesToTime(candidateEnd)}`}
          />
        )}
      </div>

      {/* Hour ticks */}
      <div className="relative mt-1.5 h-4">
        {hours.filter((h) => h % 120 === 0).map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 text-[10px] text-slate-400"
            style={{ left: `${(h / DAY_END) * 100}%` }}
          >
            {minutesToTime(h)}
          </span>
        ))}
      </div>
    </div>
  );
}
