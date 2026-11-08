export const DAY_END = 1440;

/** Convert "HH:MM" to minutes from 00:00. Returns NaN for empty/invalid input. */
export function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return NaN;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/** Convert minutes from 00:00 to "HH:MM". */
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
