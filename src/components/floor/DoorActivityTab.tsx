import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DoorOpen, Repeat, UserPlus, ShieldX, AlertTriangle } from "lucide-react";
import { useCountUp } from "@/components/dashboard/useCountUp";
import { guestEntryByHour, doorStaff, flaggedEntries } from "./floorMockData";

const donutData = [
  { name: "New Guests", value: 62 },
  { name: "Returning", value: 32 },
];
const DONUT_COLORS = ["hsl(46,92%,53%)", "hsl(46,60%,35%)"];

export default function DoorActivityTab() {
  const entered = useCountUp(94, 1200);
  const returning = useCountUp(32, 1200);
  const newGuests = useCountUp(62, 1200);
  const denied = useCountUp(2, 800);

  const statusDot: Record<string, string> = {
    "On Duty": "bg-success",
    "On Break": "bg-warning",
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { Icon: DoorOpen, label: "Entered Tonight", val: entered, sub: "+3 last hour" },
          { Icon: Repeat, label: "Returning", val: returning, sub: "34% of total" },
          { Icon: UserPlus, label: "New Guests", val: newGuests, sub: "66% of total" },
          { Icon: ShieldX, label: "Denied", val: denied, sub: "Underage" },
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">Guest Entries by Hour</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={guestEntryByHour}>
                <XAxis dataKey="time" stroke="hsl(240,8%,45%)" fontSize={12} />
                <YAxis stroke="hsl(240,8%,45%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240,15%,8%)", border: "1px solid hsl(240,12%,16%)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(46,92%,53%)" radius={[6, 6, 0, 0]} name="Guests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-heading text-2xl tracking-wide mb-4">New vs Returning</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Legend />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="hsl(0,0%,100%)" fontSize={18} fontFamily="Bebas Neue">
                  94 Total
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Door Staff */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-primary" /> Door Staff — Currently On Shift
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {doorStaff.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-secondary/40 rounded-xl p-4">
              <div>
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.role}</p>
                <p className="text-xs text-muted-foreground mt-1">Since {s.since}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`w-2 h-2 rounded-full ${statusDot[s.status]}`} />
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged Entries */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" /> Flagged Entries Tonight
        </h2>
        {flaggedEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No flagged entries tonight.</p>
        ) : (
          <div className="space-y-2">
            {flaggedEntries.map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <span className="text-sm font-mono text-destructive">{f.time}</span>
                <span className="text-sm text-foreground">{f.reason}</span>
                <span className="text-xs text-muted-foreground ml-auto">{f.door}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs italic text-muted-foreground mt-3">No personal data retained per privacy policy.</p>
      </div>
    </div>
  );
}
