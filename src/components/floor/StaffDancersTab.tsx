import { DoorOpen, Sofa, User, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfiles, useActiveDancers, useRoomSessions, today } from "@/hooks/useDashboardData";

const hours = ["8PM", "9PM", "10PM", "11PM"];
const hourMap: Record<string, number> = { "8PM": 20, "9PM": 21, "10PM": 22, "11PM": 23 };

const statusConfig: Record<string, { dot: string; cls: string }> = {
  active_in_room: { dot: "bg-success", cls: "text-success" },
  on_floor: { dot: "bg-warning", cls: "text-warning" },
  inactive: { dot: "bg-muted-foreground", cls: "text-muted-foreground" },
};

const staffStatusDot: Record<string, string> = {
  "On Duty": "bg-success",
  "On Break": "bg-warning",
};

function formatShiftMinutes(clockInStr: string): string {
  const mins = Math.floor((Date.now() - new Date(clockInStr).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function StaffDancersTab() {
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: dancers, isLoading: dancersLoading } = useActiveDancers();
  const { data: todaySessions, isLoading: sessionsLoading } = useRoomSessions(today(), today());

  const isLoading = profilesLoading || dancersLoading || sessionsLoading;

  const doorStaff = (profiles ?? []).filter((p) =>
    (p.user_roles as { role: string }[] | null)?.some(r => r.role === "door_staff")
  );
  const roomAttendants = (profiles ?? []).filter((p) =>
    (p.user_roles as { role: string }[] | null)?.some(r => r.role === "room_attendant")
  );

  const activeDancers = (dancers ?? []).filter(d => d.live_status !== "inactive");

  // Build activity heatmap: sessions per dancer per hour
  const activityHeatmap: Record<string, Record<string, number>> = {};
  (todaySessions ?? []).forEach((s) => {
    const h = new Date(s.entry_time).getHours();
    const label = Object.entries(hourMap).find(([, v]) => v === h)?.[0];
    if (!label) return;
    if (!activityHeatmap[s.dancer_id]) activityHeatmap[s.dancer_id] = {};
    activityHeatmap[s.dancer_id][label] = (activityHeatmap[s.dancer_id][label] ?? 0) + 1;
  });

  // Sessions per room attendant
  const sessionsByAttendant: Record<string, number> = {};
  (todaySessions ?? []).forEach((s) => {
    if (s.logged_by) sessionsByAttendant[s.logged_by] = (sessionsByAttendant[s.logged_by] ?? 0) + 1;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const statusLabel: Record<string, string> = {
    active_in_room: "In Room",
    on_floor: "On Floor",
    inactive: "Left",
  };

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="glass-card p-4 flex flex-wrap gap-6 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> <strong>{doorStaff.length + roomAttendants.length}</strong> Staff On Duty</span>
        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> <strong>{activeDancers.length}</strong> Dancers Checked In</span>
        <span className="text-muted-foreground">{(dancers ?? []).filter(d => d.live_status === "on_floor").length} Idle</span>
        <span className="text-muted-foreground">{(dancers ?? []).filter(d => d.live_status === "inactive").length} Not Checked In</span>
      </div>

      {/* Door Staff */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-primary" /> Door Staff
        </h2>
        {doorStaff.length === 0 ? (
          <p className="text-muted-foreground text-sm">No door staff on record.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {doorStaff.map((s) => (
              <div key={s.id} className="bg-secondary/40 rounded-xl p-4 space-y-1">
                <p className="font-medium text-foreground text-lg">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">Door Staff</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${s.is_active ? staffStatusDot["On Duty"] : staffStatusDot["On Break"]}`} />
                  <span>{s.is_active ? "On Duty" : "Off Duty"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Room Attendants */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <Sofa className="w-5 h-5 text-primary" /> Room Attendants
        </h2>
        {roomAttendants.length === 0 ? (
          <p className="text-muted-foreground text-sm">No room attendants on record.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roomAttendants.map((s) => (
              <div key={s.id} className="bg-secondary/40 rounded-xl p-4 space-y-1">
                <p className="font-medium text-foreground text-lg">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">Room Attendant</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${s.is_active ? staffStatusDot["On Duty"] : staffStatusDot["On Break"]}`} />
                  <span>{s.is_active ? "On Duty" : "Off Duty"}</span>
                </div>
                <p className="text-xs text-muted-foreground">Sessions: {sessionsByAttendant[s.user_id] ?? 0}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dancer Roster */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Dancers On Shift
        </h2>
        {activeDancers.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No dancers checked in yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-3 pr-3">#</th>
                  <th className="pb-3 pr-4">Dancer</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {activeDancers.map((d, i) => {
                  const cfg = statusConfig[d.live_status as string] ?? statusConfig.inactive;
                  const sessions = (todaySessions ?? []).filter(s => s.dancer_id === d.id).length;
                  return (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">{d.stage_name}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`flex items-center gap-1.5 text-xs ${cfg.cls}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {statusLabel[d.live_status as string] ?? "Unknown"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{sessions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Heatmap */}
      {activeDancers.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">Activity Heatmap</h2>
          <div className="overflow-x-auto">
            <div className="grid gap-1" style={{ gridTemplateColumns: `140px repeat(${hours.length}, 1fr)` }}>
              <div />
              {hours.map((h) => (
                <div key={h} className="text-center text-xs text-muted-foreground pb-2">{h}</div>
              ))}
              {activeDancers.map((d) => (
                <>
                  <div key={`label-${d.id}`} className="text-xs text-muted-foreground flex items-center truncate pr-2">{d.stage_name}</div>
                  {hours.map((h) => {
                    const count = activityHeatmap[d.id]?.[h] ?? 0;
                    const intensity = count === 0 ? 0 : count === 1 ? 0.35 : 0.8;
                    return (
                      <Tooltip key={`${d.id}-${h}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="rounded h-8 cursor-default transition-colors"
                            style={{ backgroundColor: count === 0 ? "hsl(240,12%,14%)" : `hsl(46,92%,53%,${intensity})` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{d.stage_name} — {h} — {count} session{count !== 1 ? "s" : ""}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
