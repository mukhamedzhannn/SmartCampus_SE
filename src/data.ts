import type { Room, Booking } from './types';

// Mock "current time" — 09:30 (570 min). Fixed so the prototype is deterministic.
export const MOCK_NOW_MIN = 570;

export const rooms: Room[] = [
  {
    id: 'r-a',
    name: 'Alpha Lab',
    building: 'Engineering Block',
    capacity: 10,
    status: 'Active',
    equipment: ['Projector', 'Whiteboard'],
  },
  {
    id: 'r-b',
    name: 'Beta Hall',
    building: 'Science Wing',
    capacity: 30,
    status: 'Active',
    equipment: ['Projector', 'Audio System', 'Microphone'],
  },
  {
    id: 'r-c',
    name: 'Gamma Pod',
    building: 'Library Annex',
    capacity: 4,
    status: 'Blocked',
    equipment: ['TV Screen'],
  },
  {
    id: 'r-d',
    name: 'Delta Studio',
    building: 'Arts Center',
    capacity: 15,
    status: 'Active',
    equipment: ['Whiteboard', 'PC'],
  },
];

export const bookings: Booking[] = [
  {
    id: 'b-1',
    roomId: 'r-a',
    title: 'Intro to Algorithms (Lecture)',
    start: 600, // 10:00
    end: 660,   // 11:00
  },
  {
    id: 'b-2',
    roomId: 'r-a',
    title: 'Faculty Sync Meeting',
    start: 660, // 11:00 — touches previous, allowed
    end: 720,   // 12:00
  },
  {
    id: 'b-3',
    roomId: 'r-a',
    title: 'Robotics Workshop',
    start: 900, // 15:00
    end: 1020,  // 17:00
  },
  {
    id: 'b-4',
    roomId: 'r-d',
    title: 'Study Group — Physics',
    start: 720, // 12:00
    end: 780,   // 13:00
  },
  {
    id: 'b-5',
    roomId: 'r-b',
    title: 'Department Seminar',
    start: 660, // 11:00
    end: 780,   // 13:00
  },
];
