import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DoorOpen, Repeat, UserPlus, ShieldX, Loader2 } from "lucide-react";
import { useCountUp } from "@/components/dashboard/useCountUp";
import { useGuestVisits, useCustomerEntries, useProfiles, today } from "@/hooks/useDashboardData";

const DONUT_COLORS = ["hsl(46,92%,53%)", "hsl(46,60%,35%)"];

const hours = ["8PM", "9PM", "10PM", "11PM", "12AM", "1AM", "2AM"];
const hourMap: Record<string, number> = {
  "8PM": 20, "9PM": 21, "10PM": 22, "11PM": 23, "12AM": 0, "1AM": 1, "2AM": 2,
};

export default function DoorActivityTab() {
  const { data: guestVisits, isLoading: gvLoading } = useGuestVisits(today(), today());
  const { data: customerEntries, isLoading: ceLoading } = useCustomerEntries(today(), today());
  const { data: profiles, isLoading: profLoading } = useProfiles();

  const isLoading = gvLoading || ceLoading || profLoading;

  const allEntries = useMemo(
    () => [...(guestVisits ?? []), ...(customerEntries ?? [])],
    [guestVisits, customerEntries],
  );

  const totalEntered = allEntries.length;
  const returningGuests = (guestVisits ?? []).filter(
    (g) => (g.guests as { is_returning: boolean } | null)?.is_returning,
  ).length;
  const newGuests = totalEntered - returningGuests;

  const entryByHour = hours.map((h) => ({
    time: h,
    count: allEntries.filter((e) => new Date(e.entry_time).getHours() === hourMap[h]).length,
  }));

  const donutData = [
    { name: "New Guests", value: newGuests },
    { name: "Returning", value: returningGuests },
  ];

  const doorStaff = (profiles ?? []).filter((p) =>
    (p.user_roles as { role: string }[] | null)?.some((r) => r.role === "door_staff"),
  );

  const entered = useCountUp(totalEntered, 1200);
  const returning = useCountUp(returningGuests, 1200);
  const newG = useCountUp(newGuests, 1200);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { Icon: DoorOpen, label: "Entered Tonight", val: entered, sub: "Total verified entries" },
          { Icon: Repeat, label: "Returning", val: returning, sub: totalEntered > 0 ? `${Math.round((returningGuests / totalEntered) * 100)}% of total` : "—" },
          { Icon: UserPlus, label: "New Guests", val: newG, sub: totalEntered > 0 ? `${Math.round((newGuests / totalEntered) * 100)}% of total` : "—" },
          { Icon: ShieldX, label: "Denied", val: 0, sub: "Not tracked" },
        ].map((c, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-muted-foreground text-sm mb-1 flex items-center gap-1.5">
              <c.Icon className="w-4 h-4" /> {c.label}
            </p>
            <p className="font-heading text-4xl tracking-wide text-foreground">{c.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">Guest Entries by Hour</h2>
          {totalEntered === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No entries recorded yet tonight.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entryByHour}>
                  <XAxis dataKey="time" stroke="hsl(240,8%,45%)" fontSize={12} />
                  <YAxis stroke="hsl(240,8%,45%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "hsl(240,15%,8%)", border: "1px solid hsl(240,12%,16%)", borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="hsl(46,92%,53%)" radius={[6, 6, 0, 0]} name="Guests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">New vs Returning</h2>
          {totalEntered === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No entries recorded yet tonight.</p>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="hsl(0,0%,100%)" fontSize={18} fontFamily="Bebas Neue">
                    {totalEntered} Total
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Door Staff */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-primary" /> Door Staff — Currently On Shift
        </h2>
        {doorStaff.length === 0 ? (
          <p className="text-muted-foreground text-sm">No door staff profiles on record. Add door staff via Settings.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {doorStaff.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-secondary/40 rounded-xl p-4">
                <div>
                  <p className="font-medium text-foreground">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">Door Staff</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <span className={`w-2 h-2 rounded-full ${s.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                  {s.is_active ? "On Duty" : "Off Duty"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flagged Entries */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <ShieldX className="w-5 h-5 text-warning" /> Flagged Entries Tonight
        </h2>
        <p className="text-muted-foreground text-sm">No flagged entries tonight.</p>
        <p className="text-xs italic text-muted-foreground mt-3">No personal data retained per privacy policy.</p>
      </div>
    </div>
  );
}
