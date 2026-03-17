import { DoorOpen, Sofa, User, CircleDot } from "lucide-react";
import { doorStaff, roomAttendants, dancerRoster, activityHeatmap } from "./floorMockData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const hours = ["8PM", "9PM", "10PM", "11PM"];

const statusConfig: Record<string, { dot: string; cls: string }> = {
  "In Room": { dot: "bg-success", cls: "text-success" },
  "On Floor": { dot: "bg-warning", cls: "text-warning" },
  "Left": { dot: "bg-muted-foreground", cls: "text-muted-foreground" },
};

const staffStatusDot: Record<string, string> = {
  "On Duty": "bg-success",
  "On Break": "bg-warning",
};

function formatShift(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export default function StaffDancersTab() {
  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="glass-card p-4 flex flex-wrap gap-6 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> <strong>5</strong> Staff On Duty</span>
        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> <strong>8</strong> Dancers Checked In</span>
        <span className="text-muted-foreground">3 Dancers Idle</span>
        <span className="text-muted-foreground">1 Dancer Left Early</span>
      </div>

      {/* Door Staff */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-primary" /> Door Staff
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {doorStaff.map((s, i) => (
            <div key={i} className="bg-secondary/40 rounded-xl p-4 space-y-1">
              <p className="font-medium text-foreground text-lg">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.role}</p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${staffStatusDot[s.status]}`} />
                <span>{s.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">Since: {s.since}</p>
              <p className="text-xs text-muted-foreground">Shift: {formatShift(s.shiftMin)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Room Attendants */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <Sofa className="w-5 h-5 text-primary" /> Room Attendants
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roomAttendants.map((s, i) => (
            <div key={i} className="bg-secondary/40 rounded-xl p-4 space-y-1">
              <p className="font-medium text-foreground text-lg">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.role}</p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${staffStatusDot[s.status]}`} />
                <span>{s.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">Since: {s.since}</p>
              <p className="text-xs text-muted-foreground">Sessions managed: {s.sessionsManaged}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dancer Roster */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Dancers On Shift
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-3 pr-3">#</th>
                <th className="pb-3 pr-4">Dancer</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Check-In</th>
                <th className="pb-3 pr-4">Sessions</th>
                <th className="pb-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {dancerRoster.map((d, i) => {
                const cfg = statusConfig[d.status];
                return (
                  <tr key={d.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium">{d.name}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`flex items-center gap-1.5 text-xs ${cfg.cls}`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{d.checkIn}</td>
                    <td className="py-2.5 pr-4">{d.sessions}</td>
                    <td className="py-2.5 text-muted-foreground">{d.lastActive}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4">Activity Heatmap</h2>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${hours.length}, 1fr)` }}>
            <div />
            {hours.map((h) => (
              <div key={h} className="text-center text-xs text-muted-foreground pb-2">{h}</div>
            ))}

            {dancerRoster.map((d) => (
              <>
                <div key={`label-${d.id}`} className="text-xs text-muted-foreground flex items-center">{d.name}</div>
                {hours.map((h) => {
                  const count = activityHeatmap[d.id]?.[h] ?? 0;
                  const intensity = count === 0 ? 0 : count === 1 ? 0.35 : count >= 2 ? 0.8 : 0.5;
                  return (
                    <Tooltip key={`${d.id}-${h}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="rounded h-8 cursor-default transition-colors"
                          style={{
                            backgroundColor: count === 0
                              ? "hsl(240,12%,14%)"
                              : `hsl(46,92%,53%,${intensity})`,
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{d.name} — {h} — {count} session{count !== 1 ? "s" : ""}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
