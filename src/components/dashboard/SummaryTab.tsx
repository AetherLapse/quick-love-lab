import { useState } from "react";
import {
  DollarSign, Users, TrendingUp, BarChart2,
  CalendarDays, Trophy, Crown,
} from "lucide-react";
import { PanelStack } from "./DraggablePanels";
import { type Period } from "./mockData";
import { DateFilter } from "./DateFilter";
import {
  useDashboardStats,
  useRevenueChartData,
  useMonthlyHeatmap,
  useDancerPerformance,
  useDoorStatusToday,
  today,
} from "@/hooks/useDashboardData";
import {
  ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area,
} from "recharts";

// ── KPI card ─────────────────────────────────────────────────────────────────

const PINK = "hsl(328 78% 47%)";
const PINK_LIGHT = "hsl(328 78% 95%)";

function KPICard({
  label,
  value,
  prefix = "",
  icon: Icon,
}: {
  label: string;
  value: number;
  prefix?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: PINK_LIGHT }}
        >
          <Icon className="w-4 h-4" style={{ color: PINK }} />
        </span>
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tight">
        {prefix}{value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Door Status table ─────────────────────────────────────────────────────────

function DoorStatusCard() {
  const { rows, totalGuests, totalRevenue, isLoading } = useDoorStatusToday();

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground mb-4">Door Status</h2>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-secondary rounded animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No entries recorded today</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 text-foreground font-medium">
                  {row.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({row.price === 0 ? "Free" : `$${row.price}`})
                  </span>
                </td>
                <td className="py-2.5 text-right text-muted-foreground">
                  {row.guestCount} guest{row.guestCount !== 1 ? "s" : ""}
                </td>
                <td className="py-2.5 text-right font-semibold text-foreground w-20">
                  ${row.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="pt-3 font-bold text-foreground">TOTAL</td>
              <td className="pt-3 text-right text-muted-foreground font-medium">
                {totalGuests} guests
              </td>
              <td className="pt-3 text-right font-bold text-lg w-20" style={{ color: PINK }}>
                ${totalRevenue.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}


// ── Chart tooltip style ───────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid hsl(0 0% 88%)",
  borderRadius: "8px",
  color: "hsl(240 15% 12%)",
  fontSize: "12px",
};

// ── Main SummaryTab ───────────────────────────────────────────────────────────

export function SummaryTab() {
  const [activePeriod, setActivePeriod] = useState<Period>("Tonight");
  const [customRange, setCustomRange] = useState({ start: today(), end: today() });

  const { stats, isLoading: statsLoading } = useDashboardStats(activePeriod, customRange);
  const { chartData, splitData } = useRevenueChartData(activePeriod, customRange);
  const { heatmap } = useMonthlyHeatmap();
  const { performance } = useDancerPerformance(activePeriod, customRange);

  const topPerformers = performance.slice(0, 3);

  const kpis = [
    { label: "Door Revenue",    value: stats.doorRevenue,      prefix: "$", icon: DollarSign },
    { label: "Total Guests",    value: stats.totalGuests,      prefix: "",  icon: Users },
    { label: "Active Dancers",  value: stats.activeDancerCount,prefix: "",  icon: TrendingUp },
    { label: "Dance Revenue",   value: stats.roomRevenue,      prefix: "$", icon: BarChart2 },
  ];

  const heatmapColor = (rev: number) => {
    if (rev === 0) return "bg-secondary";
    if (rev < 2000) return "bg-pink-100";
    if (rev < 4000) return "bg-pink-200";
    if (rev < 6000) return "bg-pink-400";
    return "bg-primary";
  };

  const panels = [
    {
      id: "kpis", label: "KPI Cards",
      node: statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => <KPICard key={kpi.label} {...kpi} />)}
        </div>
      ),
    },
    { id: "door", label: "Door Status", node: <DoorStatusCard /> },
    {
      id: "charts", label: "Revenue Charts",
      node: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4">Revenue by Period</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(0 0% 70%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(0 0% 70%)" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === "door" ? "Door" : "Room"]} />
                <Bar dataKey="door" fill={PINK} radius={[4, 4, 0, 0]} name="door" />
                <Bar dataKey="room" fill="hsl(328 40% 80%)" radius={[4, 4, 0, 0]} name="room" />
              </RBarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4">House vs Dancer Split</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={splitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(0 0% 70%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(0 0% 70%)" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === "house" ? "House Cut" : "Dancer Cut"]} />
                <Area type="monotone" dataKey="house" stackId="1" fill={`${PINK}33`} stroke={PINK} name="house" />
                <Area type="monotone" dataKey="dancer" stackId="1" fill="hsl(240 10% 90% / 0.5)" stroke="hsl(240 10% 60%)" name="dancer" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ),
    },
    ...(topPerformers.length >= 3 ? [{
      id: "performers", label: "Top Performers",
      node: (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: PINK }} /> Top Performers
          </h2>
          <div className="flex items-end justify-center gap-4">
            {[topPerformers[1], topPerformers[0], topPerformers[2]].map((p, idx) => {
              const isFirst = idx === 1;
              const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              return (
                <div key={p.id} className={`rounded-xl border p-4 text-center flex flex-col items-center ${isFirst ? "border-primary/40 w-40" : "border-border w-32"}`} style={{ minHeight: isFirst ? 170 : 140 }}>
                  {isFirst && <Crown className="w-5 h-5 mb-1" style={{ color: PINK }} />}
                  <p className="font-bold text-lg mb-0.5" style={{ color: PINK }}>#{rank}</p>
                  <p className="font-semibold text-sm text-foreground truncate w-full text-center">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.sessions} sessions</p>
                  <p className="font-semibold text-sm mt-1" style={{ color: PINK }}>${p.gross}</p>
                  <p className="text-xs text-muted-foreground">Net: ${p.netPayout}</p>
                </div>
              );
            })}
          </div>
        </div>
      ),
    }] : []),
    {
      id: "heatmap", label: "Monthly Heatmap",
      node: (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" /> Monthly Revenue Heatmap
          </h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <span key={d} className="text-muted-foreground font-medium py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {heatmap.map((day, i) => (
              <div key={i} className="aspect-square relative group">
                {day ? (
                  <div className={`w-full h-full rounded-lg flex items-center justify-center text-xs font-medium cursor-default transition-all ${heatmapColor(day.revenue)} ${day.isToday ? "ring-2 ring-primary" : ""} ${day.revenue > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {day.day}
                    {day.isPast && day.revenue > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                        <div className="bg-white border border-border rounded-xl p-3 text-left whitespace-nowrap shadow-lg">
                          <p className="font-semibold text-xs text-foreground">{new Date(new Date().getFullYear(), new Date().getMonth(), day.day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                          <p className="text-xs mt-0.5" style={{ color: PINK }}>${day.revenue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{day.guests} guests · {day.dancers} dancers</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : <div />}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <DateFilter activePeriod={activePeriod} setActivePeriod={setActivePeriod} customRange={customRange} setCustomRange={setCustomRange} />
      </div>
      <PanelStack storageKey="summary" panels={panels} />
    </div>
  );
}
