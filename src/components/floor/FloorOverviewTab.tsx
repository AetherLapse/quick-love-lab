import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, User, Sofa, Flame, Clock, AlertTriangle } from "lucide-react";
import { useCountUp } from "@/components/dashboard/useCountUp";
import { roomStatusData, guestFlowData, generateLiveEvent } from "./floorMockData";

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  guestCount: number;
}

export default function FloorOverviewTab({ guestCount }: Props) {
  const animGuests = useCountUp(guestCount, 1200, "floor-guests");
  const animDancers = useCountUp(8, 1200);
  const animRooms = useCountUp(2, 800);

  const [roomTimers, setRoomTimers] = useState(roomStatusData.map((r) => r.elapsed));
  const [events, setEvents] = useState([
    { time: "11:42 PM", text: "Room 3 — Overtime alert", isAlert: true },
    { time: "11:40 PM", text: "Dancer #2 — Entered floor", isAlert: false },
    { time: "11:38 PM", text: "Room 1 — Session started (Dancer #4)", isAlert: false },
    { time: "11:35 PM", text: "Guest entered — Door", isAlert: false },
    { time: "11:33 PM", text: "Room 2 — Session started (Dancer #7)", isAlert: false },
    { time: "11:30 PM", text: "Dancer #7 — Entered floor", isAlert: false },
    { time: "11:28 PM", text: "Guest entered — Door", isAlert: false },
    { time: "11:25 PM", text: "Room 1 — Session ended (Dancer #4)", isAlert: false },
    { time: "11:23 PM", text: "Room 3 — Session started (Dancer #9)", isAlert: false },
    { time: "11:18 PM", text: "Guest entered — Door", isAlert: false },
  ]);

  useEffect(() => {
    const iv = setInterval(() => {
      setRoomTimers((prev) =>
        prev.map((t, i) =>
          roomStatusData[i].status === "Active" || roomStatusData[i].status === "Overtime" ? t + 1 : t
        )
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const ev = generateLiveEvent();
      setEvents((prev) => [{ ...ev, isAlert: ev.text.includes("Overtime") }, ...prev.slice(0, 9)]);
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const statusColor: Record<string, string> = {
    Active: "border-primary/50 bg-primary/10",
    Overtime: "border-destructive/50 bg-destructive/10 animate-pulse",
    Open: "border-success/50 bg-success/10",
    Cleaning: "border-muted-foreground/30 bg-muted/40",
  };

  const statusDot: Record<string, string> = {
    Active: "bg-primary",
    Overtime: "bg-destructive",
    Open: "bg-success",
    Cleaning: "bg-muted-foreground",
  };

  const statusLabel: Record<string, { text: string; cls: string }> = {
    Active: { text: "Active", cls: "text-primary" },
    Overtime: { text: "Overtime", cls: "text-destructive" },
    Open: { text: "Open", cls: "text-success" },
    Cleaning: { text: "Cleaning", cls: "text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { Icon: Users, label: "On Floor", value: animGuests, unit: "Guests", dot: "bg-success", sub: "Live" },
          { Icon: User, label: "Dancers", value: animDancers, unit: "Active", dot: "bg-primary", sub: "3 Idle" },
          { Icon: Sofa, label: "Rooms", value: animRooms, unit: "Occupied", dot: "bg-warning", sub: "2 Available" },
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {roomStatusData.map((r, i) => (
            <div key={r.id} className={`rounded-xl border p-4 ${statusColor[r.status]}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading text-lg">Room {r.id}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${statusDot[r.status]}`} />
              </div>
              <p className={`text-xs font-medium mb-1 ${statusLabel[r.status].cls}`}>{statusLabel[r.status].text}</p>
              {r.dancer && <p className="text-xs text-muted-foreground">Dancer {r.dancer}</p>}
              {(r.status === "Active" || r.status === "Overtime") && (
                <p className={`text-sm font-mono mt-1 flex items-center gap-1 ${r.status === "Overtime" ? "text-destructive" : "text-foreground"}`}>
                  {formatTimer(roomTimers[i])} <Clock className="w-3 h-3" />
                </p>
              )}
              {r.status === "Cleaning" && <p className="text-xs text-muted-foreground">~10 min</p>}
            </div>
          ))}
        </div>
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
                  formatter={(v: number) => [`${v} guests`, "On Floor"]}
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
            {events.map((e, i) => (
              <div
                key={`${e.time}-${i}`}
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
