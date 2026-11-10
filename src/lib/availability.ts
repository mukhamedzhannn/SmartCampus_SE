import type { Room, Booking, CheckResult } from '@/types';
import { DAY_END, minutesToTime } from '@/lib/time';

/**
 * Check a candidate interval against AC1–AC5.
 * Does NOT mutate any mock data (AC5 requirement).
 */
export function checkAvailability(
  roomId: string,
  start: number,
  end: number,
  rooms: Room[],
  bookings: Booking[],
  nowMin: number,
): CheckResult {
  const reasons: string[] = [];
  const room = rooms.find((r) => r.id === roomId);

  // AC1: 0 <= start < end <= 1440 and start after current mock time
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > DAY_END ||
    start >= end
  ) {
    reasons.push('Interval is invalid — must have start before end within 00:00–24:00.');
  }
  if (Number.isFinite(start) && start <= nowMin) {
    reasons.push(`Start time must be after current time (${minutesToTime(nowMin)}).`);
  }

  // AC2: reject bookings strictly longer than 120 minutes
  if (Number.isFinite(start) && Number.isFinite(end) && end - start > 120) {
    reasons.push('Booking exceeds the 120-minute maximum duration.');
  }

  // AC3: reject if room status is 'Blocked'
  if (room?.status === 'Blocked') {
    reasons.push(`${room.name} is currently marked as Blocked and cannot be booked.`);
  }

  // AC4: reject overlap with existing bookings (touch points allowed)
  if (Number.isFinite(start) && Number.isFinite(end)) {
    const roomBookings = bookings.filter((b) => b.roomId === roomId);
    const overlapping = roomBookings.filter(
      (b) => start < b.end && end > b.start,
    );
    if (overlapping.length > 0) {
      const detail = overlapping
        .map(
          (b) =>
            `${b.title} (${minutesToTime(b.start)}–${minutesToTime(b.end)})`,
        )
        .join(', ');
      reasons.push(`Overlaps existing booking(s): ${detail}.`);
    }
  }

  const available = reasons.length === 0;
  return { decision: available ? 'available' : 'unavailable', reasons };
}
