// ── Mock data for the Manager Dashboard (no dollar amounts) ──

export const roomStatusData = [
  { id: 1, status: "Active" as const, dancer: "#4", startTime: "11:38 PM", elapsed: 512 },
  { id: 2, status: "Active" as const, dancer: "#7", startTime: "11:41 PM", elapsed: 194 },
  { id: 3, status: "Overtime" as const, dancer: "#9", startTime: "11:23 PM", elapsed: 1125 },
  { id: 4, status: "Open" as const, dancer: null, startTime: null, elapsed: 0 },
  { id: 5, status: "Open" as const, dancer: null, startTime: null, elapsed: 0 },
  { id: 6, status: "Cleaning" as const, dancer: null, startTime: null, elapsed: 0 },
];

export const doorStaff = [
  { name: "Marcus", role: "Door Staff", status: "On Duty", since: "8:00 PM", shiftMin: 222 },
  { name: "Dre", role: "Door Staff", status: "On Duty", since: "8:00 PM", shiftMin: 222 },
  { name: "Keisha", role: "Door Staff", status: "On Break", since: "8:00 PM", shiftMin: 222 },
];

export const roomAttendants = [
  { name: "Tony", role: "Room Attendant", status: "On Duty", since: "8:00 PM", shiftMin: 222, sessionsManaged: 9 },
  { name: "Lia", role: "Room Attendant", status: "On Duty", since: "8:00 PM", shiftMin: 222, sessionsManaged: 9 },
];

export const dancerRoster = [
  { id: 9, name: "Dancer #9", status: "In Room", checkIn: "8:00 PM", sessions: 6, lastActive: "11:23 PM" },
  { id: 4, name: "Dancer #4", status: "In Room", checkIn: "9:12 PM", sessions: 5, lastActive: "11:38 PM" },
  { id: 7, name: "Dancer #7", status: "In Room", checkIn: "10:01 PM", sessions: 4, lastActive: "11:41 PM" },
  { id: 6, name: "Dancer #6", status: "On Floor", checkIn: "9:55 PM", sessions: 4, lastActive: "11:10 PM" },
  { id: 2, name: "Dancer #2", status: "On Floor", checkIn: "8:45 PM", sessions: 3, lastActive: "10:58 PM" },
  { id: 1, name: "Dancer #1", status: "Left", checkIn: "9:30 PM", sessions: 2, lastActive: "1:15 AM" },
  { id: 3, name: "Dancer #3", status: "On Floor", checkIn: "10:45 PM", sessions: 2, lastActive: "11:05 PM" },
  { id: 11, name: "Dancer #11", status: "On Floor", checkIn: "11:00 PM", sessions: 1, lastActive: "11:12 PM" },
];

export const guestFlowData = [
  { time: "8PM", guests: 8 },
  { time: "9PM", guests: 22 },
  { time: "10PM", guests: 38 },
  { time: "11PM", guests: 53 },
];

export const guestEntryByHour = [
  { time: "8PM", count: 8 },
  { time: "9PM", count: 14 },
  { time: "10PM", count: 18 },
  { time: "11PM", count: 15 },
];

export const sessionsByHour = [
  { time: "8PM", sessions: 2 },
  { time: "9PM", sessions: 4 },
  { time: "10PM", sessions: 5 },
  { time: "11PM", sessions: 7 },
];

export const sessionHistory = [
  { time: "9:14 PM", room: "Room 2", dancer: "Dancer #4", duration: "14 min", status: "Completed" as const },
  { time: "9:44 PM", room: "Room 1", dancer: "Dancer #7", duration: "11 min", status: "Completed" as const },
  { time: "10:02 PM", room: "Room 3", dancer: "Dancer #2", duration: "8 min", status: "Completed" as const },
  { time: "10:31 PM", room: "Room 1", dancer: "Dancer #4", duration: "12 min", status: "Completed" as const },
  { time: "10:58 PM", room: "Room 2", dancer: "Dancer #9", duration: "19 min", status: "Overtime" as const },
  { time: "11:38 PM", room: "Room 1", dancer: "Dancer #4", duration: "Active", status: "Active" as const },
  { time: "11:41 PM", room: "Room 2", dancer: "Dancer #7", duration: "Active", status: "Active" as const },
  { time: "11:23 PM", room: "Room 3", dancer: "Dancer #9", duration: "Active", status: "Overtime" as const },
];

export const flaggedEntries = [
  { time: "9:14 PM", reason: "Underage — Entry Denied", door: "Door 1" },
  { time: "10:52 PM", reason: "Underage — Entry Denied", door: "Door 1" },
];

export type ShiftEventType = "door" | "checkin" | "room" | "alert" | "denied" | "shift";

export interface ShiftEvent {
  time: string;
  type: ShiftEventType;
  icon: string;
  text: string;
}

export const shiftLogEvents: ShiftEvent[] = [
  { time: "11:42 PM", type: "alert", icon: "alert", text: "Room 3 — Overtime exceeded 15 min (Dancer #9)" },
  { time: "11:41 PM", type: "room", icon: "room", text: "Room 2 — Session started (Dancer #7)" },
  { time: "11:40 PM", type: "checkin", icon: "checkin", text: "Dancer #2 — Entered floor" },
  { time: "11:38 PM", type: "room", icon: "room", text: "Room 1 — Session started (Dancer #4)" },
  { time: "11:35 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "11:33 PM", type: "room", icon: "room", text: "Room 2 — Session started (Dancer #7)" },
  { time: "11:30 PM", type: "checkin", icon: "checkin", text: "Dancer #7 — Entered floor" },
  { time: "11:28 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "11:25 PM", type: "room", icon: "room", text: "Room 1 — Session ended — 12 min (Dancer #4)" },
  { time: "11:23 PM", type: "room", icon: "room", text: "Room 3 — Session started (Dancer #9)" },
  { time: "11:18 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "11:15 PM", type: "denied", icon: "denied", text: "Entry denied — underage" },
  { time: "11:12 PM", type: "checkin", icon: "checkin", text: "Dancer #11 — Entered floor" },
  { time: "11:10 PM", type: "room", icon: "room", text: "Room 3 — Session ended — 8 min (Dancer #2)" },
  { time: "11:05 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "11:01 PM", type: "checkin", icon: "checkin", text: "Dancer #3 — Entered floor" },
  { time: "10:58 PM", type: "room", icon: "room", text: "Room 2 — Session ended — 19 min (Dancer #9)" },
  { time: "10:52 PM", type: "denied", icon: "denied", text: "Entry denied — underage" },
  { time: "10:45 PM", type: "checkin", icon: "checkin", text: "Dancer #3 — Entered floor" },
  { time: "10:31 PM", type: "room", icon: "room", text: "Room 1 — Session started (Dancer #4)" },
  { time: "10:28 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "10:24 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "10:19 PM", type: "room", icon: "room", text: "Room 1 — Session ended (Dancer #4)" },
  { time: "10:15 PM", type: "door", icon: "door", text: "Guest entered — verified" },
  { time: "10:02 PM", type: "room", icon: "room", text: "Room 3 — Session started (Dancer #2)" },
  { time: "9:55 PM", type: "checkin", icon: "checkin", text: "Dancer #6 — Entered floor" },
  { time: "9:44 PM", type: "room", icon: "room", text: "Room 1 — Session ended — 11 min (Dancer #7)" },
  { time: "9:30 PM", type: "checkin", icon: "checkin", text: "Dancer #1 — Entered floor" },
  { time: "9:14 PM", type: "room", icon: "room", text: "Room 2 — Session started (Dancer #4)" },
  { time: "9:12 PM", type: "checkin", icon: "checkin", text: "Dancer #4 — Entered floor" },
  { time: "8:45 PM", type: "checkin", icon: "checkin", text: "Dancer #2 — Entered floor" },
  { time: "8:00 PM", type: "shift", icon: "shift", text: "Shift started — Manager logged in" },
];

export const activityHeatmap: Record<number, Record<string, number>> = {
  9:  { "8PM": 1, "9PM": 2, "10PM": 1, "11PM": 2 },
  4:  { "8PM": 0, "9PM": 2, "10PM": 2, "11PM": 1 },
  7:  { "8PM": 0, "9PM": 0, "10PM": 2, "11PM": 2 },
  6:  { "8PM": 0, "9PM": 1, "10PM": 2, "11PM": 1 },
  2:  { "8PM": 1, "9PM": 1, "10PM": 1, "11PM": 0 },
  1:  { "8PM": 0, "9PM": 1, "10PM": 1, "11PM": 0 },
  3:  { "8PM": 0, "9PM": 0, "10PM": 1, "11PM": 1 },
  11: { "8PM": 0, "9PM": 0, "10PM": 0, "11PM": 1 },
};

const liveTemplates = [
  "Guest entered — Door",
  "Room {room} — Session started (Dancer #{dancer})",
  "Dancer #{dancer} — Entered floor",
  "Room {room} — Session ended (Dancer #{dancer})",
  "Guest entered — Door",
  "Guest entered — Door",
];

export function generateLiveEvent(): { time: string; text: string } {
  const template = liveTemplates[Math.floor(Math.random() * liveTemplates.length)];
  const text = template
    .replace("{room}", String(Math.floor(Math.random() * 6) + 1))
    .replace("{dancer}", String(Math.floor(Math.random() * 9) + 1));
  return {
    time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    text,
  };
}
