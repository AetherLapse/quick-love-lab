import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Check, AlertTriangle, Clock, Music, Trophy, Flag, Bell } from "lucide-react";
import { useCountUp } from "@/components/dashboard/useCountUp";
import { roomStatusData, sessionHistory, sessionsByHour } from "./floorMockData";
import { toast } from "sonner";

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const attendantMap: Record<number, string> = { 1: "Tony", 2: "Lia", 3: "Lia", 4: "Tony", 5: "Tony", 6: "Lia" };

export default function RoomsTab() {
  const [roomTimers, setRoomTimers] = useState(roomStatusData.map((r) => r.elapsed));
  const sessions = useCountUp(18, 1200);
  const avgDur = useCountUp(12, 800);

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

  const borderColor: Record<string, string> = {
    Active: "border-primary glow-gold",
    Overtime: "border-destructive animate-pulse",
    Open: "border-success/40",
    Cleaning: "border-muted-foreground/30",
  };

  const statusBadge: Record<string, { text: string; cls: string }> = {
    Active: { text: "ACTIVE", cls: "bg-primary/15 text-primary" },
    Overtime: { text: "OVERTIME", cls: "bg-destructive/15 text-destructive" },
    Open: { text: "AVAILABLE", cls: "bg-success/15 text-success" },
    Cleaning: { text: "CLEANING", cls: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      {/* Room Cards 2x3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roomStatusData.map((r, i) => (
          <div key={r.id} className={`glass-card p-5 border-2 ${borderColor[r.status]}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading text-2xl">Room {r.id}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge[r.status].cls}`}>
                {statusBadge[r.status].text}
              </span>
            </div>

            {r.dancer && (
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Dancer:</span><span>{r.dancer}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Started:</span><span>{r.startTime}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Elapsed:</span>
                  <span className={`font-mono flex items-center gap-1 ${r.status === "Overtime" ? "text-destructive" : ""}`}>
                    {formatTimer(roomTimers[i])} <Clock className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Attendant:</span><span>{attendantMap[r.id]}</span></div>
              </div>
            )}

            {r.status === "Overtime" && (
              <p className="text-xs text-warning mb-3 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Exceeded standard session time
              </p>
            )}

            {r.status === "Open" && <p className="text-sm text-muted-foreground">Ready for next session</p>}
            {r.status === "Cleaning" && <p className="text-sm text-muted-foreground">Est. ready in ~10 min</p>}

            {(r.status === "Active" || r.status === "Overtime") && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => toast.success("Flag sent to Admin")} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Flag Room
                </button>
                {r.status === "Overtime" && (
                  <button onClick={() => toast.success("Alert sent to room attendant")} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/15 hover:bg-destructive/25 text-destructive transition-colors flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Alert Staff
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Session History */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4">Tonight's Session History</h2>
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
              {sessionHistory.map((s, i) => (
                <tr key={i} className={`border-b border-border/50 ${s.status === "Overtime" ? "bg-warning/5" : ""}`}>
                  <td className="py-2.5 pr-4 font-mono text-muted-foreground">{s.time}</td>
                  <td className="py-2.5 pr-4">{s.room}</td>
                  <td className="py-2.5 pr-4">{s.dancer}</td>
                  <td className="py-2.5 pr-4">{s.duration === "Active" ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" /> Active</span> : s.duration}</td>
                  <td className="py-2.5">
                    {s.status === "Completed" && <span className="text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Completed</span>}
                    {s.status === "Overtime" && <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Overtime</span>}
                    {s.status === "Active" && <span className="text-success flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Performance Stats + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { Icon: Music, label: "Sessions Tonight", val: sessions, sub: "+3 this hour" },
              { Icon: Clock, label: "Avg Duration", val: `${avgDur} min`, sub: "vs 11 min avg" },
              { Icon: Trophy, label: "Busiest Room", val: "Room 1", sub: "7 sessions" },
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
        </div>

        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">Sessions by Hour</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByHour}>
                <XAxis dataKey="time" stroke="hsl(240,8%,45%)" fontSize={12} />
                <YAxis stroke="hsl(240,8%,45%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240,15%,8%)", border: "1px solid hsl(240,12%,16%)", borderRadius: 8 }} />
                <Bar dataKey="sessions" fill="hsl(46,92%,53%)" radius={[6, 6, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
