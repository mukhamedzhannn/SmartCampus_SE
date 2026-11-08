import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAvailability } from '../src/lib/availability.ts';
import { filterRooms, getUniqueEquipment, getRoomBookings, countRoomBookings } from '../src/lib/roomFilters.ts';
import { rooms, bookings, MOCK_NOW_MIN } from '../src/data.ts';

const ROOM_A = 'r-a'; // Alpha Lab — Bookings: 600-660, 660-720, 900-1020
const ROOM_B = 'r-b'; // Beta Hall — Booking: 660-780, Active
const ROOM_C = 'r-c'; // Gamma Pod — Blocked, no bookings
const ROOM_D = 'r-d'; // Delta Studio — Booking: 720-780, Active

const check = (roomId: string, start: number, end: number) =>
  checkAvailability(roomId, start, end, rooms, bookings, MOCK_NOW_MIN);

describe('AC1: interval must be valid and after the mock current time (09:30)', () => {
  it('rejects a start time before the current time', () => {
    const result = check(ROOM_D, 480, 540); // 08:00-09:00
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('after current time')));
  });

  it('rejects a start time equal to the current time', () => {
    const result = check(ROOM_D, 570, 630); // 09:30-10:30
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('after current time')));
  });

  it('rejects a reversed interval (end before start)', () => {
    const result = check(ROOM_D, 780, 720); // 13:00 to 12:00
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('Interval is invalid')));
  });

  it('rejects a cleared (NaN) time input', () => {
    const result = check(ROOM_D, NaN, NaN);
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('Interval is invalid')));
  });
});

describe('AC2: bookings longer than 120 minutes are rejected', () => {
  it('rejects a 121-minute booking', () => {
    const result = check(ROOM_D, 780, 901); // 13:00-15:01
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('120-minute')));
  });

  it('accepts a 120-minute booking exactly', () => {
    const result = check(ROOM_D, 780, 900); // 13:00-15:00
    assert.equal(result.decision, 'available');
    assert.deepEqual(result.reasons, []);
  });
});

describe('AC3: blocked rooms are rejected', () => {
  it('rejects any request for a Blocked room', () => {
    const result = check(ROOM_C, 780, 840); // 13:00-14:00
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('Blocked')));
  });
});

describe('AC4: overlapping bookings are rejected', () => {
  it('rejects an interval that overlaps existing bookings', () => {
    const result = check(ROOM_A, 630, 690); // 10:30-11:30
    assert.equal(result.decision, 'unavailable');
    assert.ok(result.reasons.some((r) => r.includes('Overlaps')));
    assert.ok(result.reasons.some((r) => r.includes('Intro to Algorithms')));
    assert.ok(result.reasons.some((r) => r.includes('Faculty Sync Meeting')));
  });
});

describe('AC4: touching endpoints are allowed', () => {
  it('accepts an interval that starts exactly when another ends', () => {
    const result = check(ROOM_A, 720, 780); // 12:00-13:00, after 660-720
    assert.equal(result.decision, 'available');
    assert.deepEqual(result.reasons, []);
  });

  it('accepts an interval that ends exactly when another starts', () => {
    const result = check(ROOM_A, 840, 900); // 14:00-15:00, before 900-1020
    assert.equal(result.decision, 'available');
    assert.deepEqual(result.reasons, []);
  });
});

describe('AC5: inputs and fixtures are not mutated', () => {
  it('leaves room and booking fixtures unchanged after checks', () => {
    const roomsBefore = structuredClone(rooms);
    const bookingsBefore = structuredClone(bookings);

    check(ROOM_A, 630, 690);
    check(ROOM_B, 780, 840);
    check(ROOM_C, 780, 901);
    check(ROOM_D, 720, 780);
    check(ROOM_A, NaN, NaN);

    assert.deepEqual(rooms, roomsBefore);
    assert.deepEqual(bookings, bookingsBefore);
  });
});

describe('4-room catalog integrity', () => {
  it('has exactly 4 rooms with correct names and capacities', () => {
    assert.equal(rooms.length, 4);
    assert.equal(rooms[0].name, 'Alpha Lab');
    assert.equal(rooms[0].capacity, 10);
    assert.equal(rooms[1].name, 'Beta Hall');
    assert.equal(rooms[1].capacity, 30);
    assert.equal(rooms[2].name, 'Gamma Pod');
    assert.equal(rooms[2].capacity, 4);
    assert.equal(rooms[3].name, 'Delta Studio');
    assert.equal(rooms[3].capacity, 15);
  });

  it('Gamma Pod is the only blocked room', () => {
    const blocked = rooms.filter((r) => r.status === 'Blocked');
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].id, 'r-c');
  });

  it('all rooms use equipment (not amenities)', () => {
    rooms.forEach((r) => {
      assert.ok(r.equipment.length > 0, `${r.name} should have equipment`);
    });
  });
});

describe('F1: capacity filter', () => {
  it('returns all rooms when minCapacity is 0', () => {
    assert.equal(filterRooms(rooms, 0, []).length, 4);
  });

  it('filters out rooms below the capacity threshold', () => {
    const result = filterRooms(rooms, 15, []);
    assert.equal(result.length, 2);
    assert.ok(result.every((r) => r.capacity >= 15));
  });

  it('returns only Beta Hall at capacity 30', () => {
    const result = filterRooms(rooms, 30, []);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'r-b');
  });
});

describe('F2: equipment filter', () => {
  it('returns all rooms when no equipment is required', () => {
    assert.equal(filterRooms(rooms, 0, []).length, 4);
  });

  it('returns only rooms with all required equipment', () => {
    const result = filterRooms(rooms, 0, ['Projector']);
    assert.equal(result.length, 2);
    assert.ok(result.every((r) => r.equipment.includes('Projector')));
  });

  it('returns only Beta Hall for Projector + Microphone', () => {
    const result = filterRooms(rooms, 0, ['Projector', 'Microphone']);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'r-b');
  });

  it('returns empty when no room has the required equipment', () => {
    const result = filterRooms(rooms, 0, ['Nonexistent']);
    assert.equal(result.length, 0);
  });
});

describe('F1 + F2 combined', () => {
  it('combines capacity and equipment filters', () => {
    const result = filterRooms(rooms, 15, ['Whiteboard']);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'r-d');
  });
});

describe('Filter utility functions', () => {
  it('getUniqueEquipment returns sorted unique equipment list', () => {
    const equipment = getUniqueEquipment(rooms);
    assert.deepEqual(equipment, ['Audio System', 'Microphone', 'PC', 'Projector', 'TV Screen', 'Whiteboard']);
  });

  it('getRoomBookings returns only bookings for the given room', () => {
    const result = getRoomBookings(bookings, 'r-a');
    assert.equal(result.length, 3);
    assert.ok(result.every((b) => b.roomId === 'r-a'));
  });

  it('getRoomBookings returns empty for a room with no bookings', () => {
    const result = getRoomBookings(bookings, 'r-c');
    assert.equal(result.length, 0);
  });

  it('countRoomBookings returns correct count', () => {
    assert.equal(countRoomBookings(bookings, 'r-a'), 3);
    assert.equal(countRoomBookings(bookings, 'r-b'), 1);
    assert.equal(countRoomBookings(bookings, 'r-c'), 0);
    assert.equal(countRoomBookings(bookings, 'r-d'), 1);
  });
});

describe('Filter purity — inputs not mutated', () => {
  it('filterRooms does not mutate the rooms array', () => {
    const before = structuredClone(rooms);
    filterRooms(rooms, 20, ['Projector']);
    assert.deepEqual(rooms, before);
  });
});
