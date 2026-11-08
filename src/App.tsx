import { useMemo, useState } from 'react';
import { Building2, CalendarClock, SearchX } from 'lucide-react';
import { rooms, bookings, MOCK_NOW_MIN } from './data';
import { timeToMinutes, minutesToTime } from '@/lib/time';
import { checkAvailability } from '@/lib/availability';
import { filterRooms, getRoomBookings, countRoomBookings } from '@/lib/roomFilters';
import RoomCard from './components/RoomCard';
import Timeline from './components/Timeline';
import AvailabilityForm from './components/AvailabilityForm';
import FilterControls from './components/FilterControls';

export default function App() {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0].id);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('12:00');

  // F1 + F2 filter state
  const [minCapacity, setMinCapacity] = useState(0);
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);

  const candidateStart = timeToMinutes(startTime);
  const candidateEnd = timeToMinutes(endTime);

  const filteredRooms = useMemo(
    () => filterRooms(rooms, minCapacity, requiredEquipment),
    [minCapacity, requiredEquipment],
  );

  // F5: decision derived from current inputs, not stored — fixes stale-decision issue.
  const result = useMemo(
    () =>
      checkAvailability(
        selectedRoomId,
        candidateStart,
        candidateEnd,
        rooms,
        bookings,
        MOCK_NOW_MIN,
      ),
    [selectedRoomId, candidateStart, candidateEnd],
  );

  const selectedRoomBookings = getRoomBookings(bookings, selectedRoomId);

  const handleEquipmentToggle = (item: string) => {
    setRequiredEquipment((prev) =>
      prev.includes(item)
        ? prev.filter((e) => e !== item)
        : [...prev, item],
    );
  };

  const handleClearFilters = () => {
    setMinCapacity(0);
    setRequiredEquipment([]);
  };

  // F5: when switching room, keep times. Decision auto-updates via useMemo above.
  const handleRoomSelect = (id: string) => setSelectedRoomId(id);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-lg">
                Smart Campus Room Checker
              </h1>
              <p className="text-xs text-slate-500">
                Real-time room availability for today
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:flex">
            <CalendarClock className="h-4 w-4" />
            Mock now: {minutesToTime(MOCK_NOW_MIN)}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: filters + rooms + timeline */}
          <section className="space-y-5 lg:col-span-2">
            <FilterControls
              rooms={rooms}
              minCapacity={minCapacity}
              requiredEquipment={requiredEquipment}
              onMinCapacityChange={setMinCapacity}
              onEquipmentToggle={handleEquipmentToggle}
              onClear={handleClearFilters}
            />

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Select a room
                {filteredRooms.length !== rooms.length && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({filteredRooms.length} of {rooms.length} matching)
                  </span>
                )}
              </h2>

              {filteredRooms.length === 0 ? (
                // F4: empty state
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
                  <SearchX className="h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No rooms match your filters
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try lowering the attendee count or removing equipment requirements.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      selected={room.id === selectedRoomId}
                      onSelect={handleRoomSelect}
                      bookingCount={countRoomBookings(bookings, room.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {selectedRoom && (
              <>
                <Timeline
                  roomId={selectedRoomId}
                  bookings={bookings}
                  candidateStart={candidateStart}
                  candidateEnd={candidateEnd}
                />

                {/* Existing bookings list */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Existing bookings — {selectedRoom.name}
                  </h3>
                  {selectedRoomBookings.length === 0 ? (
                    <p className="text-sm text-slate-400">No bookings for this room today.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {selectedRoomBookings.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between py-2.5 text-sm"
                        >
                          <span className="font-medium text-slate-700">{b.title}</span>
                          <span className="tabular-nums text-slate-500">
                            {minutesToTime(b.start)}–{minutesToTime(b.end)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Right: form */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <AvailabilityForm
                rooms={filteredRooms.length > 0 ? filteredRooms : rooms}
                bookings={bookings}
                selectedRoomId={selectedRoomId}
                startTime={startTime}
                endTime={endTime}
                result={result}
                onRoomChange={handleRoomSelect}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            </div>
          </aside>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          Prototype — fictional sample data, no backend or authentication.
        </footer>
      </main>
    </div>
  );
}
