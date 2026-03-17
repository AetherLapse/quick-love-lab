import { useState, useEffect } from "react";
import { DoorOpen, User, Sofa, AlertTriangle, ShieldX, Play } from "lucide-react";
import { shiftLogEvents, ShiftEvent, ShiftEventType, generateLiveEvent } from "./floorMockData";

const typeLabels: Record<ShiftEventType, string> = {
  door: "DOOR",
  checkin: "CHECK-IN",
  room: "ROOM",
  alert: "ALERT",
  denied: "DENIED",
  shift: "SHIFT",
};

const typeColor: Record<ShiftEventType, string> = {
  door: "text-foreground",
  checkin: "text-blue-300",
  room: "text-primary",
  alert: "text-warning",
  denied: "text-destructive",
  shift: "text-success",
};

const dotColor: Record<ShiftEventType, string> = {
  door: "bg-foreground",
  checkin: "bg-blue-300",
  room: "bg-primary",
  alert: "bg-warning",
  denied: "bg-destructive",
  shift: "bg-success",
};

const typeIcon: Record<ShiftEventType, React.ComponentType<{ className?: string }>> = {
  door: DoorOpen,
  checkin: User,
  room: Sofa,
  alert: AlertTriangle,
  denied: ShieldX,
  shift: Play,
};

const filterOptions: { label: string; value: ShiftEventType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Check-Ins", value: "checkin" },
  { label: "Room Events", value: "room" },
  { label: "Alerts", value: "alert" },
  { label: "Door Events", value: "door" },
];

export default function ShiftLogTab() {
  const [filter, setFilter] = useState<ShiftEventType | "all">("all");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<ShiftEvent[]>(shiftLogEvents);

  useEffect(() => {
    const iv = setInterval(() => {
      const ev = generateLiveEvent();
      const type: ShiftEventType = ev.text.includes("Room") ? "room" : ev.text.includes("Dancer") ? "checkin" : "door";
      setEvents((prev) => [{ time: ev.time, type, icon: type, text: ev.text }, ...prev]);
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalEvents = events.length;
  const checkIns = events.filter((e) => e.type === "checkin").length;
  const doorEntries = events.filter((e) => e.type === "door").length;
  const denied = events.filter((e) => e.type === "denied").length;
  const roomEvents = events.filter((e) => e.type === "room").length;
  const alerts = events.filter((e) => e.type === "alert").length;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground mr-1">Show:</span>
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Search dancer # or room #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Timeline */}
      <div className="glass-card p-6">
        <div className="relative border-l-2 border-primary/30 ml-3 space-y-0">
          {filtered.map((e, i) => {
            const IconComp = typeIcon[e.type];
            return (
              <div key={`${e.time}-${i}`} className={`relative pl-8 py-2.5 ${i === 0 ? "animate-fade-in" : ""}`}>
                <div className={`absolute left-[-7px] top-3.5 w-3 h-3 rounded-full border-2 border-background ${dotColor[e.type]}`} />
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap w-20">{e.time}</span>
                  <IconComp className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${typeColor[e.type]}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider w-20 ${typeColor[e.type]}`}>{typeLabels[e.type]}</span>
                  <span className={`text-sm ${typeColor[e.type]}`}>{e.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Summary Footer */}
      <div className="glass-card p-6 font-mono text-sm border-t-2 border-primary/30">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6">
          <div><span className="text-muted-foreground">Shift started:</span> <span className="text-foreground">8:00 PM</span></div>
          <div><span className="text-muted-foreground">Current time:</span> <span className="text-foreground">{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
          <div><span className="text-muted-foreground">Total events:</span> <span className="text-foreground">{totalEvents}</span></div>
          <div><span className="text-muted-foreground">Check-ins:</span> <span className="text-foreground">{checkIns} dancers</span></div>
          <div><span className="text-muted-foreground">Door entries:</span> <span className="text-foreground">{doorEntries} guests | {denied} denied</span></div>
          <div><span className="text-muted-foreground">Room sessions:</span> <span className="text-foreground">{roomEvents} | {alerts} overtime</span></div>
        </div>
      </div>
    </div>
  );
}
