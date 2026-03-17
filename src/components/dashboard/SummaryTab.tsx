import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area
} from "recharts";
import { ArrowUp, ArrowDown, Crown, DoorOpen, Sofa, Home, Wallet, Users, User, Music, Timer, Repeat, Trophy, CalendarDays } from "lucide-react";
import { periodData, periodKeys, topPerformers, generateHeatmap, type Period } from "./mockData";
import { useCountUp } from "./useCountUp";
import { DateFilter } from "./DateFilter";

const heatmapDays = generateHeatmap();

const chartTooltipStyle = {
  backgroundColor: "hsl(240 15% 10%)",
  border: "1px solid hsl(240 12% 16%)",
  borderRadius: "8px",
  color: "white",
};

const kpiIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  door: DoorOpen,
  sofa: Sofa,
  home: Home,
  wallet: Wallet,
};

const opsIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  user: User,
  music: Music,
  timer: Timer,
  repeat: Repeat,
};

function KPICard({ label, value, prefix, icon, trend, animKey }: { label: string; value: number; prefix: string; icon: string; trend: number; animKey: string }) {
  const animated = useCountUp(value, 1200, animKey);
  const IconComp = kpiIcons[icon];
  return (
    <div className="glass-card p-5 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-1">
        {IconComp && <IconComp className="w-5 h-5 text-primary" />}
        <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-success" : "text-destructive"}`}>
          {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <p className="font-heading text-4xl tracking-wide text-foreground">
        {prefix}{animated.toLocaleString()}
      </p>
    </div>
  );
}

function OpsCard({ label, value, icon, suffix, animKey }: { label: string; value: number; icon: string; suffix?: string; animKey: string }) {
  const animated = useCountUp(value, 1000, animKey);
  const IconComp = opsIcons[icon];
  return (
    <div className="glass-card p-4">
      {IconComp && <IconComp className="w-4 h-4 text-muted-foreground" />}
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
      <p className="font-heading text-2xl tracking-wide text-foreground">
        {animated.toLocaleString()}{suffix || ""}
      </p>
    </div>
  );
}

export function SummaryTab() {
  const [activePeriod, setActivePeriod] = useState<Period>("Today");
  const data = periodData[periodKeys[activePeriod]];

  const heatmapColor = (rev: number) => {
    if (rev === 0) return "bg-[hsl(240_10%_10%)]";
    if (rev < 2000) return "bg-[hsl(43_60%_20%)]";
    if (rev < 4000) return "bg-[hsl(43_70%_30%)]";
    if (rev < 6000) return "bg-[hsl(43_80%_40%)]";
    return "bg-primary";
  };

  const rankIcons = [
    null,
    <Crown key="1" className="w-6 h-6 text-primary mx-auto mb-1" />,
    null,
    null,
  ];

  return (
    <div>
      {/* Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </p>
        <DateFilter activePeriod={activePeriod} setActivePeriod={setActivePeriod} />
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.kpis.map((kpi, i) => (
          <KPICard key={i} {...kpi} animKey={activePeriod + i} />
        ))}
      </div>

      {/* KPI Row 2 — Ops */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {data.ops.map((op, i) => (
          <OpsCard key={i} {...op} animKey={activePeriod + "op" + i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <h2 className="font-heading text-3xl tracking-wide mb-4">Revenue by Period</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
              <XAxis dataKey="period" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "door" ? "Door" : "Room"]}
              />
              <Bar dataKey="door" fill="hsl(46 92% 53%)" radius={[4, 4, 0, 0]} name="door" />
              <Bar dataKey="room" fill="hsl(0 0% 60%)" radius={[4, 4, 0, 0]} name="room" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-heading text-3xl tracking-wide mb-4">House vs Dancer Split</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.split}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
              <XAxis dataKey="period" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "house" ? "House Cut" : "Dancer Cut"]}
              />
              <Area type="monotone" dataKey="house" stackId="1" fill="hsl(46 92% 53% / 0.3)" stroke="hsl(46 92% 53%)" name="house" />
              <Area type="monotone" dataKey="dancer" stackId="1" fill="hsl(0 0% 80% / 0.15)" stroke="hsl(0 0% 60%)" name="dancer" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers Podium */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-heading text-3xl tracking-wide mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" /> Top Performers
        </h2>
        <div className="flex items-end justify-center gap-4">
          {[topPerformers[1], topPerformers[0], topPerformers[2]].map((p) => (
            <div
              key={p.rank}
              className={`glass-card p-4 text-center transition-all ${
                p.rank === 1 ? "w-40 pb-6 border-primary/40 glow-gold" : "w-36"
              }`}
              style={{ minHeight: p.rank === 1 ? 180 : p.rank === 2 ? 150 : 130 }}
            >
              {p.rank === 1 && <Crown className="w-6 h-6 text-primary mx-auto mb-1" />}
              <p className="text-2xl mb-1 font-heading text-primary">#{p.rank}</p>
              <p className="font-heading text-xl">{p.name}</p>
              <p className="text-muted-foreground text-xs">{p.sessions} sessions</p>
              <p className="text-primary font-heading text-lg">${p.gross}</p>
              <p className="text-xs text-muted-foreground">Payout: ${p.payout}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Heatmap */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-heading text-3xl tracking-wide mb-4 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" /> Monthly Revenue Heatmap
        </h2>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <span key={d} className="text-muted-foreground font-medium py-1">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapDays.map((day, i) => (
            <div key={i} className="aspect-square relative group">
              {day ? (
                <div className={`w-full h-full rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-default ${heatmapColor(day.revenue)} ${day.isToday ? "ring-2 ring-foreground" : ""}`}>
                  {day.day}
                  {day.isPast && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="bg-popover border border-border rounded-lg p-3 text-left whitespace-nowrap shadow-xl">
                        <p className="font-medium text-foreground text-xs">
                          {new Date(new Date().getFullYear(), new Date().getMonth(), day.day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-primary text-xs">${day.revenue.toLocaleString()} revenue</p>
                        <p className="text-muted-foreground text-xs">{day.guests} guests • {day.dancers} dancers</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : <div />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
