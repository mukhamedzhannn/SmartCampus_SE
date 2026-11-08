export type RoomStatus = 'Active' | 'Blocked';

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  status: RoomStatus;
  equipment: string[];
}

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  start: number; // minutes from 00:00
  end: number;   // minutes from 00:00
}

export type Decision = 'available' | 'unavailable' | null;

export interface CheckResult {
  decision: Decision;
  reasons: string[];
}
