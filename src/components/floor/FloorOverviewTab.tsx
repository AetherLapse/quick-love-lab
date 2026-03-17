import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, User, Sofa, Flame, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { useCountUp } from "@/components/dashboard/useCountUp";
import { useActiveRoomSessions, useActiveDancers, useGuestVisits, useCustomerEntries, today } from "@/hooks/useDashboardData";

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props { guestCount: number }

export default function FloorOverviewTab({ guestCount }: Props) {
  const { data: activeSessions, isLoading: sessionsLoading } = useActiveRoomSessions();
  const { data: activeDancers, isLoading: dancersLoading } = useActiveDancers();
  const { data: guestVisits } = useGuestVisits(today(), today());
  const { data: manualEntries } = useCustomerEntries(today(), today());

  const totalGuests = (guestVisits?.length ?? 0) + (manualEntries?.length ?? 0) || guestCount;
  const onFloorDancers = (activeDancers ?? []).filter(d => d.live_status !== "inactive");
  const inRoomDancers = (activeDancers ?? []).filter(d => d.live_status === "active_in_room");
  const idleDancers = (activeDancers ?? []).filter(d => d.live_status === "on_floor");

  const animGuests = useCountUp(totalGuests, 1200, "floor-guests");
  const animDancers = useCountUp(onFloorDancers.length, 1200);
  const animRooms = useCountUp(inRoomDancers.length, 800);

  // Room timers: track elapsed seconds for active sessions
  const [roomTimers, setRoomTimers] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!activeSessions) return;
    const initial: Record<string, number> = {};
    activeSessions.forEach((s) => {
      initial[s.id] = Math.floor((Date.now() - new Date(s.entry_time).getTime()) / 1000);
    });
    setRoomTimers(initial);
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

  // Live event feed from real data
  const [events, setEvents] = useState<{ time: string; text: string; isAlert: boolean }[]>([]);
  useEffect(() => {
    if (!activeSessions) return;
    const feedEvents = activeSessions.map((s) => {
      const dancer = (s.dancers as { stage_name: string } | null)?.stage_name ?? "Unknown";
      const elapsed = Math.floor((Date.now() - new Date(s.entry_time).getTime()) / 60000);
      const isAlert = elapsed > 15;
      return {
        time: new Date(s.entry_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        text: isAlert
          ? `${s.room_name ?? "Room"} — Overtime alert (${dancer})`
          : `${s.room_name ?? "Room"} — Active session (${dancer})`,
        isAlert,
      };
    });
    setEvents(feedEvents);
  }, [activeSessions]);

  // Guest flow chart (cumulative by hour from real data)
  const guestFlowData = (() => {
    const hours = ["8PM", "9PM", "10PM", "11PM", "12AM", "1AM", "2AM"];
    const hourMap: Record<string, number> = { "8PM": 20, "9PM": 21, "10PM": 22, "11PM": 23, "12AM": 0, "1AM": 1, "2AM": 2 };
    const allEntries = [...(guestVisits ?? []), ...(manualEntries ?? [])];
    let cumulative = 0;
    return hours.map((h) => {
      const count = allEntries.filter(g => new Date(g.entry_time).getHours() === hourMap[h]).length;
      cumulative += count;
      return { time: h, guests: cumulative };
    });
  })();

  const statusColor: Record<string, string> = {
    Active: "border-primary/50 bg-primary/10",
    Overtime: "border-destructive/50 bg-destructive/10 animate-pulse",
    Open: "border-success/50 bg-success/10",
  };
  const statusDot: Record<string, string> = {
    Active: "bg-primary", Overtime: "bg-destructive", Open: "bg-success",
  };

  if (sessionsLoading || dancersLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { Icon: Users, label: "On Floor", value: animGuests, unit: "Guests", dot: "bg-success", sub: "Live" },
          { Icon: User, label: "Dancers", value: animDancers, unit: "Active", dot: "bg-primary", sub: `${idleDancers.length} Idle` },
          { Icon: Sofa, label: "Rooms", value: animRooms, unit: "Occupied", dot: "bg-warning", sub: `${(activeSessions ?? []).length} Active` },
          { Icon: Flame, label: "Peak Hour", value: null, unit: null, dot: "bg-destructive", sub: "Now" },
        ].map((c, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${c.dot} animate-pulse-glow`} />
              <c.Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">{c.label}</span>
            </div>
            {c.value !== null ? (
              <p className="font-heading text-4xl tracking-wide text-foreground">{c.value} <span className="text-lg text-muted-foreground">{c.unit}</span></p>
            ) : (
              <p className="font-heading text-3xl tracking-wide text-foreground">11PM – 1AM</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Room Status Strip */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4">Room Status</h2>
        {(activeSessions ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No active room sessions.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(activeSessions ?? []).map((s) => {
              const elapsed = roomTimers[s.id] ?? 0;
              const isOvertime = elapsed > 15 * 60;
              const status = isOvertime ? "Overtime" : "Active";
              const dancer = (s.dancers as { stage_name: string } | null)?.stage_name ?? "—";
              return (
                <div key={s.id} className={`rounded-xl border p-4 ${statusColor[status]}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-heading text-lg">{s.room_name ?? "Room"}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot[status]}`} />
                  </div>
                  <p className={`text-xs font-medium mb-1 ${isOvertime ? "text-destructive" : "text-primary"}`}>{status}</p>
                  <p className="text-xs text-muted-foreground">{dancer}</p>
                  <p className={`text-sm font-mono mt-1 flex items-center gap-1 ${isOvertime ? "text-destructive" : "text-foreground"}`}>
                    {formatTimer(elapsed)} <Clock className="w-3 h-3" />
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guest Flow Chart + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">Guest Flow Tonight</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={guestFlowData}>
                <defs>
                  <linearGradient id="guestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(46,92%,53%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(46,92%,53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="hsl(240,8%,45%)" fontSize={12} />
                <YAxis stroke="hsl(240,8%,45%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(240,15%,8%)", border: "1px solid hsl(240,12%,16%)", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(46,92%,53%)" }}
                  formatter={(v: number) => [`${v} guests`, "Cumulative"]}
                />
                <Area type="monotone" dataKey="guests" stroke="hsl(46,92%,53%)" fill="url(#guestGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse-glow" />
            <h2 className="font-heading text-2xl tracking-wide">Live Floor Activity</h2>
          </div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No active sessions.</p>
            ) : events.map((e, i) => (
              <div
                key={i}
                className={`text-sm border-l-2 pl-3 py-1 transition-all ${
                  i === 0 ? "animate-fade-in border-primary" : "border-border"
                } ${e.isAlert ? "text-warning" : ""}`}
              >
                <span className="text-primary font-medium">{e.time}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="text-foreground">
                  {e.isAlert && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-warning" />}
                  {e.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
