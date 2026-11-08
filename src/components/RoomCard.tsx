import { Users, MapPin, Lock, CheckCircle2 } from 'lucide-react';
import type { Room } from '../types';

export default function RoomCard({
  room,
  selected,
  onSelect,
  bookingCount,
}: {
  room: Room;
  selected: boolean;
  onSelect: (id: string) => void;
  bookingCount: number;
}) {
  const blocked = room.status === 'Blocked';

  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-200'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{room.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {room.building}
          </p>
        </div>
        {blocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-200">
            <Lock className="h-3.5 w-3.5" />
            Blocked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {room.capacity} seats
        </span>
        <span>{bookingCount} booking{bookingCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {room.equipment.map((a) => (
          <span
            key={a}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
          >
            {a}
          </span>
        ))}
      </div>
    </button>
  );
}
