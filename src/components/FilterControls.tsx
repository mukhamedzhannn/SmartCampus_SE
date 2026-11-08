import { Users, Monitor } from 'lucide-react';
import type { Room } from '../types';
import { getUniqueEquipment } from '@/lib/roomFilters';

export default function FilterControls({
  rooms,
  minCapacity,
  requiredEquipment,
  onMinCapacityChange,
  onEquipmentToggle,
  onClear,
}: {
  rooms: Room[];
  minCapacity: number;
  requiredEquipment: string[];
  onMinCapacityChange: (n: number) => void;
  onEquipmentToggle: (item: string) => void;
  onClear: () => void;
}) {
  const allEquipment = getUniqueEquipment(rooms);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Filter rooms</h3>
        </div>
        {(minCapacity > 0 || requiredEquipment.length > 0) && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* F1: Capacity filter */}
      <div className="mb-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Users className="h-3.5 w-3.5" />
          Minimum attendees
        </label>
        <input
          type="number"
          min={0}
          value={minCapacity}
          onChange={(e) => onMinCapacityChange(Math.max(0, Number(e.target.value)))}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          placeholder="0"
        />
      </div>

      {/* F2: Equipment filter */}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">Required equipment</p>
        <div className="flex flex-wrap gap-2">
          {allEquipment.map((item) => {
            const checked = requiredEquipment.includes(item);
            return (
              <label
                key={item}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  checked
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onEquipmentToggle(item)}
                  className="h-3.5 w-3.5 accent-blue-600"
                />
                {item}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
