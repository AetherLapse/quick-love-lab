import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from "recharts";
import { ArrowUp } from "lucide-react";
import { periodData, periodKeys, revenueStreams, hourlyRevenue, dayOverDay, type Period } from "./mockData";
import { useCountUp } from "./useCountUp";
import { DateFilter } from "./DateFilter";

const chartTooltipStyle = {
  backgroundColor: "hsl(240 15% 10%)",
  border: "1px solid hsl(240 12% 16%)",
  borderRadius: "8px",
  color: "white",
};

const DONUT_COLORS = ["hsl(46 92% 53%)", "hsl(0 0% 60%)", "hsl(46 70% 40%)", "hsl(0 0% 40%)"];

function BigCard({ label, value, trend, animKey }: { label: string; value: number; trend: number; animKey: string }) {
  const animated = useCountUp(value, 1200, animKey);
  return (
    <div className="glass-card p-6">
      <p className="text-muted-foreground text-sm mb-2">{label}</p>
      <p className="font-heading text-4xl tracking-wide text-foreground">${animated.toLocaleString()}</p>
      <span className="text-xs font-medium flex items-center gap-0.5 text-success mt-2">
        <ArrowUp className="w-3 h-3" /> {trend}% vs last
      </span>
    </div>
  );
}

export function RevenueTab() {
  const [activePeriod, setActivePeriod] = useState<Period>("Today");
  const data = periodData[periodKeys[activePeriod]];

  const totalGross = revenueStreams.reduce((s, r) => s + r.gross, 0);
  const totalHouse = revenueStreams.reduce((s, r) => s + r.houseEarned, 0);
  const totalDancer = revenueStreams.reduce((s, r) => s + r.dancerEarned, 0);
  const totalTx = revenueStreams.reduce((s, r) => s + r.transactions, 0);

  const donutOuter = [
    { name: "Door Revenue", value: data.kpis[0].value },
    { name: "Room Revenue", value: data.kpis[1].value },
  ];
  const donutInner = [
    { name: "House Cut", value: data.kpis[2].value },
    { name: "Dancer Cut", value: data.kpis[3].value },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-heading text-3xl tracking-wide">Revenue Deep Dive</h2>
        <DateFilter activePeriod={activePeriod} setActivePeriod={setActivePeriod} />
      </div>

      {/* Section 1 — Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <BigCard label="Total Gross" value={data.kpis[0].value + data.kpis[1].value} trend={18} animKey={activePeriod + "g"} />
        <BigCard label="House Net" value={data.kpis[2].value} trend={15} animKey={activePeriod + "h"} />
        <BigCard label="Dancer Payouts" value={data.kpis[3].value} trend={9} animKey={activePeriod + "d"} />
      </div>

      {/* Section 2 — Revenue Streams Table */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-2xl tracking-wide mb-4">Revenue Streams</h3>
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
              {revenueStreams.map((r, i) => (
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
      </div>

      {/* Section 3 — Hourly Revenue */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-2xl tracking-wide mb-4">Hourly Revenue Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
            <XAxis dataKey="hour" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
            <YAxis stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={chartTooltipStyle}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = { door: "Door", oneSong: "1-Song", multiSong: "Multi-Song" };
                return [`$${value.toLocaleString()}`, labels[name] || name];
              }}
            />
            <Bar dataKey="door" stackId="a" fill="hsl(46 92% 53%)" name="door" />
            <Bar dataKey="oneSong" stackId="a" fill="hsl(46 70% 70%)" name="oneSong" />
            <Bar dataKey="multiSong" stackId="a" fill="hsl(0 0% 70%)" radius={[4, 4, 0, 0]} name="multiSong" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Section 4 — Revenue Split Donut */}
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
            ${(data.kpis[0].value + data.kpis[1].value).toLocaleString()} Total
          </p>
        </div>

        {/* Section 5 — Day-over-Day */}
        <div className="glass-card p-6">
          <h3 className="font-heading text-2xl tracking-wide mb-4">This Week vs Last Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dayOverDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
              <XAxis dataKey="day" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "thisWeek" ? "This Week" : "Last Week"]}
              />
              <Line type="monotone" dataKey="thisWeek" stroke="hsl(46 92% 53%)" strokeWidth={2} dot={{ r: 4 }} name="thisWeek" />
              <Line type="monotone" dataKey="lastWeek" stroke="hsl(0 0% 45%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="lastWeek" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
