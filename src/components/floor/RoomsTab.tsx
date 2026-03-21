import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Check, AlertTriangle, Clock, Music, Trophy, Flag, Bell, Loader2 } from "lucide-react";
import { useCountUp } from "@/components/dashboard/useCountUp";
import { useActiveRoomSessions, useRoomSessions, useDancers, today } from "@/hooks/useDashboardData";
import { toast } from "sonner";

const ROOM_LAYOUT = [
  { floor: "Floor 1", rooms: ["Room 1", "Room 2", "Room 3"] },
  { floor: "Floor 2", rooms: ["Room 1", "Room 2", "Room 3"] },
];

function buildRoomName(floor: string, room: string) {
  return `${floor} - ${room}`;
}

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const ALL_ROOMS = ROOM_LAYOUT.flatMap((f) => f.rooms.map((r) => buildRoomName(f.floor, r)));

const hours = ["8PM", "9PM", "10PM", "11PM", "12AM", "1AM", "2AM"];
const hourMap: Record<string, number> = {
  "8PM": 20, "9PM": 21, "10PM": 22, "11PM": 23, "12AM": 0, "1AM": 1, "2AM": 2,
};

const borderColor: Record<string, string> = {
  Active: "border-primary glow-gold",
  Overtime: "border-destructive animate-pulse",
  Open: "border-success/40",
};
const statusBadge: Record<string, { text: string; cls: string }> = {
  Active: { text: "ACTIVE", cls: "bg-primary/15 text-primary" },
  Overtime: { text: "OVERTIME", cls: "bg-destructive/15 text-destructive" },
  Open: { text: "AVAILABLE", cls: "bg-success/15 text-success" },
};

export default function RoomsTab() {
  const { data: activeSessions, isLoading: activeLoading } = useActiveRoomSessions();
  const { data: todaySessions, isLoading: todayLoading } = useRoomSessions(today(), today());
  const { data: dancers } = useDancers();

  const isLoading = activeLoading || todayLoading;

  // Room timers keyed by session id
  const [roomTimers, setRoomTimers] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!activeSessions) return;
    setRoomTimers((prev) => {
      const next: Record<string, number> = {};
      activeSessions.forEach((s) => {
        next[s.id] = prev[s.id] ?? Math.floor((Date.now() - new Date(s.entry_time).getTime()) / 1000);
      });
      return next;
    });
  }, [activeSessions]);

  useEffect(() => {
    const iv = setInterval(() => {
      setRoomTimers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] += 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const sessionByRoom = useMemo(
    () => Object.fromEntries((activeSessions ?? []).map((s) => [s.room_name ?? "", s])),
    [activeSessions],
  );

  const dancerById = useMemo(
    () => Object.fromEntries((dancers ?? []).map((d) => [d.id, d])),
    [dancers],
  );

  const completedSessions = useMemo(
    () => (todaySessions ?? []).filter((s) => s.exit_time !== null).slice(0, 20),
    [todaySessions],
  );

  const avgDuration = useMemo(() => {
    if (completedSessions.length === 0) return 0;
    const total = completedSessions.reduce((sum, s) => {
      return sum + (new Date(s.exit_time!).getTime() - new Date(s.entry_time).getTime()) / 60000;
    }, 0);
    return Math.round(total / completedSessions.length);
  }, [completedSessions]);

  const roomSessionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    (todaySessions ?? []).forEach((s) => {
      const room = s.room_name ?? "Unknown";
      counts[room] = (counts[room] ?? 0) + 1;
    });
    return counts;
  }, [todaySessions]);

  const busiestRoom = useMemo(() => {
    const entries = Object.entries(roomSessionCount);
    return entries.sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [roomSessionCount]);

  const sessionsByHourData = hours.map((h) => ({
    time: h,
    sessions: (todaySessions ?? []).filter((s) => new Date(s.entry_time).getHours() === hourMap[h]).length,
  }));

  const totalSessions = useCountUp(todaySessions?.length ?? 0, 1200);
  const avgDur = useCountUp(avgDuration, 800);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_ROOMS.map((roomName) => {
          const session = sessionByRoom[roomName];
          const elapsed = session ? (roomTimers[session.id] ?? 0) : 0;
          const isOvertime = elapsed > 15 * 60;
          const status = session ? (isOvertime ? "Overtime" : "Active") : "Open";
          const dancer = session
            ? (session.dancers as { stage_name: string } | null)?.stage_name ?? "—"
            : null;

          return (
            <div key={roomName} className={`glass-card p-5 border-2 ${borderColor[status]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-heading text-xl">{roomName}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge[status].cls}`}>
                  {statusBadge[status].text}
                </span>
              </div>

              {session && dancer && (
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dancer:</span>
                    <span>{dancer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{new Date(session.entry_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Elapsed:</span>
                    <span className={`font-mono flex items-center gap-1 ${isOvertime ? "text-destructive" : ""}`}>
                      {formatTimer(elapsed)} <Clock className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )}

              {status === "Overtime" && (
                <p className="text-xs text-warning mb-3 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Exceeded standard session time
                </p>
              )}

              {status === "Open" && (
                <p className="text-sm text-muted-foreground">Ready for next session</p>
              )}

              {(status === "Active" || status === "Overtime") && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => toast.success("Flag sent to Admin")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors flex items-center gap-1"
                  >
                    <Flag className="w-3 h-3" /> Flag Room
                  </button>
                  {status === "Overtime" && (
                    <button
                      onClick={() => toast.success("Alert sent to room attendant")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 hover:bg-destructive/25 text-destructive transition-colors flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" /> Alert Staff
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Session History */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4">Tonight's Session History</h2>
        {completedSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No completed sessions yet tonight.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Room</th>
                  <th className="pb-3 pr-4">Dancer</th>
                  <th className="pb-3 pr-4">Duration</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {completedSessions.map((s) => {
                  const dur = Math.round(
                    (new Date(s.exit_time!).getTime() - new Date(s.entry_time).getTime()) / 60000,
                  );
                  const isOver = dur > 15;
                  const dancerName = dancerById[s.dancer_id]?.stage_name ?? "—";
                  return (
                    <tr key={s.id} className={`border-b border-border/50 ${isOver ? "bg-warning/5" : ""}`}>
                      <td className="py-2.5 pr-4 font-mono text-muted-foreground">
                        {new Date(s.entry_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 pr-4">{s.room_name ?? "—"}</td>
                      <td className="py-2.5 pr-4">{dancerName}</td>
                      <td className="py-2.5 pr-4">{dur} min</td>
                      <td className="py-2.5">
                        {isOver ? (
                          <span className="text-warning flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Overtime
                          </span>
                        ) : (
                          <span className="text-success flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Music, label: "Sessions Tonight", val: totalSessions, sub: `${activeSessions?.length ?? 0} active now` },
            { Icon: Clock, label: "Avg Duration", val: `${avgDur} min`, sub: completedSessions.length > 0 ? `${completedSessions.length} completed` : "No data yet" },
            { Icon: Trophy, label: "Busiest Room", val: busiestRoom ? busiestRoom[0].split(" - ")[1] : "—", sub: busiestRoom ? `${busiestRoom[1]} sessions` : "No sessions" },
          ].map((c, i) => (
            <div key={i} className="glass-card p-4">
              <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                <c.Icon className="w-3.5 h-3.5" /> {c.label}
              </p>
              <p className="font-heading text-2xl tracking-wide text-foreground">{c.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">Sessions by Hour</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByHourData}>
                <XAxis dataKey="time" stroke="hsl(240,8%,45%)" fontSize={12} />
                <YAxis stroke="hsl(240,8%,45%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(240,15%,8%)", border: "1px solid hsl(240,12%,16%)", borderRadius: 8 }}
                />
                <Bar dataKey="sessions" fill="hsl(46,92%,53%)" radius={[6, 6, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
