import { useState, useMemo } from "react";
import { DoorOpen, User, Sofa, AlertTriangle, ShieldX, Play, Loader2 } from "lucide-react";
import {
  useAttendanceLogs,
  useCustomerEntries,
  useGuestVisits,
  useRoomSessions,
  useDancers,
  today,
} from "@/hooks/useDashboardData";

type ShiftEventType = "door" | "checkin" | "room" | "alert" | "denied" | "shift";

interface ShiftEvent {
  timestamp: number;
  time: string;
  type: ShiftEventType;
  text: string;
}

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

function fmtTime(ts: string | number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ShiftLogTab() {
  const [filter, setFilter] = useState<ShiftEventType | "all">("all");
  const [search, setSearch] = useState("");

  const { data: attendance, isLoading: attLoading } = useAttendanceLogs(today(), today());
  const { data: customerEntries, isLoading: ceLoading } = useCustomerEntries(today(), today());
  const { data: guestVisits, isLoading: gvLoading } = useGuestVisits(today(), today());
  const { data: sessions, isLoading: sessLoading } = useRoomSessions(today(), today());
  const { data: dancers } = useDancers();

  const isLoading = attLoading || ceLoading || gvLoading || sessLoading;

  const dancerById = useMemo(
    () => Object.fromEntries((dancers ?? []).map((d) => [d.id, d])),
    [dancers],
  );

  const events = useMemo<ShiftEvent[]>(() => {
    const list: ShiftEvent[] = [];

    // Dancer check-ins / check-outs
    (attendance ?? []).forEach((log) => {
      const name = (log.dancers as { stage_name: string } | null)?.stage_name ?? "Unknown Dancer";
      list.push({
        timestamp: new Date(log.clock_in).getTime(),
        time: fmtTime(log.clock_in),
        type: "checkin",
        text: `${name} — Checked in`,
      });
      if (log.clock_out) {
        list.push({
          timestamp: new Date(log.clock_out).getTime(),
          time: fmtTime(log.clock_out),
          type: "checkin",
          text: `${name} — Left floor`,
        });
      }
    });

    // Manual guest entries
    (customerEntries ?? []).forEach((entry) => {
      list.push({
        timestamp: new Date(entry.entry_time).getTime(),
        time: fmtTime(entry.entry_time),
        type: "door",
        text: "Guest entered",
      });
    });

    // Scanned guest entries
    (guestVisits ?? []).forEach((visit) => {
      const isReturning = (visit.guests as { is_returning: boolean } | null)?.is_returning;
      list.push({
        timestamp: new Date(visit.entry_time).getTime(),
        time: fmtTime(visit.entry_time),
        type: "door",
        text: isReturning ? "Returning guest entered — ID verified" : "New guest entered — ID verified",
      });
    });

    // Room session starts, ends, and overtime alerts
    (sessions ?? []).forEach((s) => {
      const dancer = dancerById[s.dancer_id]?.stage_name ?? "Unknown";
      const room = s.room_name ?? "Room";

      list.push({
        timestamp: new Date(s.entry_time).getTime(),
        time: fmtTime(s.entry_time),
        type: "room",
        text: `${room} — Session started (${dancer})`,
      });

      if (s.exit_time) {
        const dur = Math.round(
          (new Date(s.exit_time).getTime() - new Date(s.entry_time).getTime()) / 60000,
        );
        list.push({
          timestamp: new Date(s.exit_time).getTime(),
          time: fmtTime(s.exit_time),
          type: "room",
          text: `${room} — Session ended — ${dur} min (${dancer})`,
        });
        if (dur > 15) {
          list.push({
            timestamp: new Date(s.entry_time).getTime() + 15 * 60 * 1000,
            time: fmtTime(new Date(s.entry_time).getTime() + 15 * 60 * 1000),
            type: "alert",
            text: `${room} — Overtime exceeded 15 min (${dancer})`,
          });
        }
      }
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [attendance, customerEntries, guestVisits, sessions, dancerById]);

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const checkIns = events.filter((e) => e.type === "checkin").length;
  const doorEntries = events.filter((e) => e.type === "door").length;
  const roomEvents = events.filter((e) => e.type === "room").length;
  const alerts = events.filter((e) => e.type === "alert").length;

  const shiftStart = useMemo(() => {
    if (events.length === 0) return "—";
    const earliest = Math.min(...events.map((e) => e.timestamp));
    return fmtTime(earliest);
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          placeholder="Search dancer or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Timeline */}
      <div className="glass-card p-6">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            {events.length === 0 ? "No events recorded yet tonight." : "No events match your filter."}
          </p>
        ) : (
          <div className="relative border-l-2 border-primary/30 ml-3 space-y-0">
            {filtered.map((e, i) => {
              const IconComp = typeIcon[e.type];
              return (
                <div key={`${e.timestamp}-${i}`} className="relative pl-8 py-2.5">
                  <div className={`absolute left-[-7px] top-3.5 w-3 h-3 rounded-full border-2 border-background ${dotColor[e.type]}`} />
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground whitespace-nowrap w-20">{e.time}</span>
                    <IconComp className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${typeColor[e.type]}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider w-20 ${typeColor[e.type]}`}>
                      {typeLabels[e.type]}
                    </span>
                    <span className={`text-sm ${typeColor[e.type]}`}>{e.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shift Summary */}
      <div className="glass-card p-6 font-mono text-sm border-t-2 border-primary/30">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6">
          <div><span className="text-muted-foreground">Shift started:</span> <span className="text-foreground">{shiftStart}</span></div>
          <div><span className="text-muted-foreground">Current time:</span> <span className="text-foreground">{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
          <div><span className="text-muted-foreground">Total events:</span> <span className="text-foreground">{events.length}</span></div>
          <div><span className="text-muted-foreground">Check-ins:</span> <span className="text-foreground">{checkIns} dancers</span></div>
          <div><span className="text-muted-foreground">Door entries:</span> <span className="text-foreground">{doorEntries} guests</span></div>
          <div><span className="text-muted-foreground">Room sessions:</span> <span className="text-foreground">{roomEvents} events | {alerts} overtime</span></div>
        </div>
      </div>
    </div>
  );
}
