import type { Room, Booking } from '@/types';

/** F1 + F2: filter rooms by minimum capacity and required equipment. Pure — no mutation. */
export function filterRooms(
  rooms: Room[],
  minCapacity: number,
  requiredEquipment: string[],
): Room[] {
  return rooms.filter((r) => {
    if (r.capacity < minCapacity) return false;
    if (requiredEquipment.length > 0) {
      return requiredEquipment.every((e) => r.equipment.includes(e));
    }
    return true;
  });
}

/** Collect the unique sorted set of equipment across all rooms. */
export function getUniqueEquipment(rooms: Room[]): string[] {
  return Array.from(new Set(rooms.flatMap((r) => r.equipment))).sort();
}

/** Return only bookings belonging to a given room. */
export function getRoomBookings(bookings: Booking[], roomId: string): Booking[] {
  return bookings.filter((b) => b.roomId === roomId);
}

/** Count bookings for a given room. */
export function countRoomBookings(bookings: Booking[], roomId: string): number {
  return getRoomBookings(bookings, roomId).length;
}
