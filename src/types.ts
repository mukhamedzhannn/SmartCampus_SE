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

export type ReasonKey =
  | 'invalid_interval'
  | 'past_start'
  | 'too_long'
  | 'blocked'
  | 'overlap';

export interface CheckResult {
  decision: Decision;
  reasons: string[];
  reasonKeys: ReasonKey[];
}

export type ReasonCode =
  | 'available'
  | 'invalid_interval'
  | 'past_start'
  | 'too_long'
  | 'blocked'
  | 'overlap'
  | 'no_decision'
  | 'unknown';

export interface ExplanationRequest {
  roomId: string;
  roomName: string;
  start: number;
  end: number;
  result: CheckResult;
}

export interface ExplanationResponse {
  ok: boolean;
  source: 'mock' | 'fallback';
  reasonCode: ReasonCode;
  summary: string;
  details: string[];
}
