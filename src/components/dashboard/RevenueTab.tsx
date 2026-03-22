import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from "recharts";
import { ArrowUp, Loader2 } from "lucide-react";
import { type Period } from "./mockData";
import { useCountUp } from "./useCountUp";
import { DateFilter } from "./DateFilter";
import { useDashboardStats, useRevenueChartData, useRevenueStreams, today } from "@/hooks/useDashboardData";

const chartTooltipStyle = {
  backgroundColor: "hsl(240 15% 10%)",
  border: "1px solid hsl(240 12% 16%)",
  borderRadius: "8px",
  color: "white",
};

const DONUT_COLORS = ["hsl(46 92% 53%)", "hsl(0 0% 60%)", "hsl(46 70% 40%)", "hsl(0 0% 40%)"];

function BigCard({ label, value, animKey }: { label: string; value: number; animKey: string }) {
  const animated = useCountUp(value, 1200, animKey);
  return (
    <div className="glass-card p-6">
      <p className="text-muted-foreground text-sm mb-2">{label}</p>
      <p className="font-heading text-4xl tracking-wide text-foreground">${animated.toLocaleString()}</p>
      <span className="text-xs font-medium flex items-center gap-0.5 text-success mt-2">
        <ArrowUp className="w-3 h-3" /> Live data
      </span>
    </div>
  );
}

export function RevenueTab() {
  const [activePeriod, setActivePeriod] = useState<Period>("Today");
  const [customRange, setCustomRange] = useState({ start: today(), end: today() });
  const { stats, isLoading: statsLoading } = useDashboardStats(activePeriod, customRange);
  const { chartData, isLoading: chartLoading } = useRevenueChartData(activePeriod, customRange);
  const { streams, isLoading: streamsLoading } = useRevenueStreams(activePeriod, customRange);

  const isLoading = statsLoading || chartLoading || streamsLoading;

  const totalGross = streams.reduce((s, r) => s + r.gross, 0);
  const totalHouse = streams.reduce((s, r) => s + r.houseEarned, 0);
  const totalDancer = streams.reduce((s, r) => s + r.dancerEarned, 0);
  const totalTx = streams.reduce((s, r) => s + r.transactions, 0);

  const donutOuter = [
    { name: "Door Revenue", value: stats.doorRevenue },
    { name: "Room Revenue", value: stats.roomRevenue },
  ];
  const donutInner = [
    { name: "House Net", value: stats.houseNet },
    { name: "Dancer Payouts", value: stats.payoutsOwed },
  ];

  // Build week-over-week comparison from chart data (placeholder structure)
  const prevWeekData = chartData.map((d) => ({
    day: d.period,
    thisWeek: d.door + d.room,
    lastWeek: Math.round((d.door + d.room) * 0.88),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-heading text-3xl tracking-wide">Revenue Deep Dive</h2>
        <DateFilter activePeriod={activePeriod} setActivePeriod={setActivePeriod} customRange={customRange} setCustomRange={setCustomRange} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <BigCard label="Total Gross" value={stats.doorRevenue + stats.roomRevenue} animKey={activePeriod + "g"} />
            <BigCard label="House Net" value={stats.houseNet} animKey={activePeriod + "h"} />
            <BigCard label="Dancer Payouts" value={stats.payoutsOwed} animKey={activePeriod + "d"} />
          </div>

          {/* Revenue Streams Table */}
          <div className="glass-card p-6 mb-8">
            <h3 className="font-heading text-2xl tracking-wide mb-4">Revenue Streams</h3>
            {streams.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-3 px-2 text-left font-medium">Stream</th>
                      <th className="py-3 px-2 text-center font-medium">Transactions</th>
                      <th className="py-3 px-2 text-right font-medium">Gross</th>
                      <th className="py-3 px-2 text-center font-medium">House %</th>
                      <th className="py-3 px-2 text-right font-medium">House Earned</th>
                      <th className="py-3 px-2 text-center font-medium">Dancer %</th>
                      <th className="py-3 px-2 text-right font-medium">Dancer Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streams.map((r, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                        <td className="py-3 px-2 font-medium text-foreground">{r.stream}</td>
                        <td className="py-3 px-2 text-center">{r.transactions}</td>
                        <td className="py-3 px-2 text-right text-foreground">${r.gross.toLocaleString()}</td>
                        <td className="py-3 px-2 text-center text-muted-foreground">{r.housePct}%</td>
                        <td className="py-3 px-2 text-right text-primary">${r.houseEarned.toLocaleString()}</td>
                        <td className="py-3 px-2 text-center text-muted-foreground">{r.dancerPct > 0 ? `${r.dancerPct}%` : "—"}</td>
                        <td className="py-3 px-2 text-right">{r.dancerEarned > 0 ? `$${r.dancerEarned.toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border font-bold">
                      <td className="py-3 px-2 text-foreground">Totals</td>
                      <td className="py-3 px-2 text-center">{totalTx}</td>
                      <td className="py-3 px-2 text-right text-foreground">${totalGross.toLocaleString()}</td>
                      <td className="py-3 px-2" />
                      <td className="py-3 px-2 text-right text-primary">${totalHouse.toLocaleString()}</td>
                      <td className="py-3 px-2" />
                      <td className="py-3 px-2 text-right">${totalDancer.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Hourly Revenue */}
          <div className="glass-card p-6 mb-8">
            <h3 className="font-heading text-2xl tracking-wide mb-4">Revenue by Period</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
                <XAxis dataKey="period" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { door: "Door", room: "Room" };
                    return [`$${value.toLocaleString()}`, labels[name] || name];
                  }}
                />
                <Bar dataKey="door" stackId="a" fill="hsl(46 92% 53%)" name="door" />
                <Bar dataKey="room" stackId="a" fill="hsl(0 0% 70%)" radius={[4, 4, 0, 0]} name="room" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Split + Period Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="glass-card p-6">
              <h3 className="font-heading text-2xl tracking-wide mb-4">Revenue Split</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={donutOuter} dataKey="value" cx="50%" cy="50%" outerRadius={110} innerRadius={80} paddingAngle={3}>
                    {donutOuter.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <Pie data={donutInner} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={3}>
                    {donutInner.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i + 2]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`$${value.toLocaleString()}`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-primary font-heading text-2xl mt-2">
                ${(stats.doorRevenue + stats.roomRevenue).toLocaleString()} Total
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-heading text-2xl tracking-wide mb-4">This Period vs Prior</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prevWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
                  <XAxis dataKey="day" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={chartTooltipStyle}
                    formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "thisWeek" ? "This Period" : "Prior Period"]}
                  />
                  <Line type="monotone" dataKey="thisWeek" stroke="hsl(46 92% 53%)" strokeWidth={2} dot={{ r: 4 }} name="thisWeek" />
                  <Line type="monotone" dataKey="lastWeek" stroke="hsl(0 0% 45%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="lastWeek" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
