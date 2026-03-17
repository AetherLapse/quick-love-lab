import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Crown, X, AlertCircle, Check } from "lucide-react";
import { periodData, topPerformers, dancerSessions, type Period } from "./mockData";
import { useCountUp } from "./useCountUp";
import { DateFilter } from "./DateFilter";

const chartTooltipStyle = {
  backgroundColor: "hsl(240 15% 10%)",
  border: "1px solid hsl(240 12% 16%)",
  borderRadius: "8px",
  color: "white",
};

type SortCol = "name" | "sessions" | "gross" | "houseCut" | "netPayout";

function KPIStrip({ label, value, animKey }: { label: string; value: number | string; animKey: string }) {
  const num = typeof value === "number" ? value : 0;
  const animated = useCountUp(num, 1000, animKey);
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-heading text-2xl tracking-wide text-foreground">
        {typeof value === "number" ? animated.toLocaleString() : value}
      </p>
    </div>
  );
}

export function PerformersTab() {
  const [activePeriod, setActivePeriod] = useState<Period>("Today");
  const [sortCol, setSortCol] = useState<SortCol>("sessions");
  const [sortAsc, setSortAsc] = useState(false);
  const [drawerDancer, setDrawerDancer] = useState<string | null>(null);

  const dancers = periodData.today.dancers!;
  const sortedDancers = useMemo(() => {
    return [...dancers].sort((a, b) => {
      const av = a[sortCol] as number | string;
      const bv = b[sortCol] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [dancers, sortCol, sortAsc]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const totals = useMemo(() => {
    return dancers.reduce((acc, d) => ({
      sessions: acc.sessions + d.sessions,
      gross: acc.gross + d.gross,
      houseCut: acc.houseCut + d.houseCut,
      houseFee: acc.houseFee + d.houseFee,
      netPayout: acc.netPayout + d.netPayout,
    }), { sessions: 0, gross: 0, houseCut: 0, houseFee: 0, netPayout: 0 });
  }, [dancers]);

  const comparisonData = dancers
    .sort((a, b) => b.gross - a.gross)
    .map(d => ({
      name: d.name,
      houseCut: d.houseCut,
      dancerCut: d.gross - d.houseCut,
    }));

  const selectedDancer = drawerDancer ? dancers.find(d => d.name === drawerDancer) : null;
  const selectedSessions = drawerDancer ? dancerSessions[drawerDancer] || [] : [];

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-heading text-3xl tracking-wide">Performer Analytics</h2>
        <DateFilter activePeriod={activePeriod} setActivePeriod={setActivePeriod} />
      </div>

      {/* Section 1 — KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPIStrip label="Active Tonight" value={dancers.filter(d => d.active).length} animKey={activePeriod + "at"} />
        <KPIStrip label="Total Sessions" value={totals.sessions} animKey={activePeriod + "ts"} />
        <KPIStrip label="Total Earned (Dancers)" value={totals.gross - totals.houseCut} animKey={activePeriod + "te"} />
        <KPIStrip label="Avg Per Dancer" value={Math.round((totals.gross - totals.houseCut) / dancers.length)} animKey={activePeriod + "ap"} />
      </div>

      {/* Section 2 — Podium */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-2xl tracking-wide mb-6 flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" /> Top Performers
        </h3>
        <div className="flex items-end justify-center gap-4">
          {[topPerformers[1], topPerformers[0], topPerformers[2]].map((p) => (
            <div
              key={p.rank}
              className={`glass-card p-4 text-center transition-all ${
                p.rank === 1 ? "w-44 pb-6 border-primary/40 glow-gold" : "w-36"
              }`}
              style={{ minHeight: p.rank === 1 ? 200 : p.rank === 2 ? 160 : 140 }}
            >
              {p.rank === 1 && <Crown className="w-7 h-7 text-primary mx-auto mb-1 animate-pulse" />}
              <p className="text-2xl mb-1 font-heading text-primary">#{p.rank}</p>
              <p className="font-heading text-xl">{p.name}</p>
              <p className="text-muted-foreground text-xs">{p.sessions} sessions</p>
              <p className="text-primary font-heading text-xl">${p.gross}</p>
              <p className="text-xs text-muted-foreground">Payout: ${p.payout}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Full Performer Table */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-2xl tracking-wide mb-4">Full Performer Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 px-2 text-left font-medium">#</th>
                {[
                  { key: "name" as SortCol, label: "Dancer", align: "text-left" },
                  { key: null, label: "Status", align: "text-center" },
                  { key: null, label: "Check-In", align: "text-left" },
                  { key: null, label: "Check-Out", align: "text-left" },
                  { key: "sessions" as SortCol, label: "Sessions", align: "text-center" },
                  { key: "gross" as SortCol, label: "Gross", align: "text-right" },
                  { key: "houseCut" as SortCol, label: "House Cut", align: "text-right" },
                  { key: null, label: "House Fee", align: "text-right" },
                  { key: "netPayout" as SortCol, label: "Net Payout", align: "text-right" },
                  { key: null, label: "Action", align: "text-center" },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`py-3 px-2 font-medium ${col.align} ${col.key ? "cursor-pointer hover:text-foreground transition-colors" : ""}`}
                    onClick={col.key ? () => toggleSort(col.key as SortCol) : undefined}
                  >
                    {col.label}
                    {col.key && sortCol === col.key && <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDancers.map((d, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                  <td className="py-3 px-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-3 px-2 font-medium text-foreground">{d.name}</td>
                  <td className="py-3 px-2 text-center">
                    {d.active ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Left
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{d.checkIn}</td>
                  <td className="py-3 px-2 text-muted-foreground">{d.checkOut || "—"}</td>
                  <td className="py-3 px-2 text-center">{d.sessions}</td>
                  <td className="py-3 px-2 text-right text-foreground">${d.gross}</td>
                  <td className="py-3 px-2 text-right text-primary">${d.houseCut}</td>
                  <td className="py-3 px-2 text-right text-muted-foreground">${d.houseFee}</td>
                  <td className={`py-3 px-2 text-right font-semibold ${d.netPayout < 0 ? "text-destructive" : "text-foreground"}`}>
                    ${d.netPayout}
                    {d.netPayout < 0 && (
                      <span className="ml-1 inline-flex" title="Dancer owes to house">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive inline" />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => setDrawerDancer(d.name)}
                      className="px-3 py-1 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold">
                <td className="py-3 px-2" />
                <td className="py-3 px-2 text-foreground">TOTAL</td>
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2 text-center">{totals.sessions}</td>
                <td className="py-3 px-2 text-right text-foreground">${totals.gross.toLocaleString()}</td>
                <td className="py-3 px-2 text-right text-primary">${totals.houseCut.toLocaleString()}</td>
                <td className="py-3 px-2 text-right text-muted-foreground">${totals.houseFee * dancers.length}</td>
                <td className="py-3 px-2 text-right text-foreground">${totals.netPayout.toLocaleString()}</td>
                <td className="py-3 px-2" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5 — Comparison Chart */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-heading text-2xl tracking-wide mb-4">Performer Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
            <XAxis type="number" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" stroke="hsl(240 8% 45%)" tick={{ fontSize: 12 }} width={90} />
            <Tooltip contentStyle={chartTooltipStyle}
              formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "houseCut" ? "House Cut" : "Dancer Cut"]}
            />
            <Bar dataKey="houseCut" stackId="a" fill="hsl(46 92% 53% / 0.7)" name="houseCut" />
            <Bar dataKey="dancerCut" stackId="a" fill="hsl(0 0% 70%)" name="dancerCut" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dancer Detail Side Drawer */}
      {drawerDancer && selectedDancer && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setDrawerDancer(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 overflow-y-auto animate-slide-in-right">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-3xl tracking-wide">{selectedDancer.name}</h3>
                <button onClick={() => setDrawerDancer(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={selectedDancer.active ? "text-success" : "text-muted-foreground"}>
                    <span className="inline-flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${selectedDancer.active ? "bg-success" : "bg-muted-foreground"}`} />
                      {selectedDancer.active ? "Active" : "Left"}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-In</span>
                  <span className="text-foreground">{selectedDancer.checkIn}</span>
                </div>
                {selectedDancer.checkOut && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-Out</span>
                    <span className="text-foreground">{selectedDancer.checkOut}</span>
                  </div>
                )}
              </div>

              <div className="glass-card p-4 mb-6">
                <h4 className="font-heading text-lg tracking-wide mb-3">Sessions Tonight</h4>
                <div className="space-y-2">
                  {selectedSessions.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">{s.time}</span>
                      <span className="text-foreground">{s.songs} Song{s.songs > 1 ? "s" : ""}</span>
                      <span className="text-primary font-medium">${s.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross</span>
                  <span className="text-foreground">${selectedDancer.gross}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">House Cut (70%)</span>
                  <span className="text-primary">${selectedDancer.houseCut}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">House Fee</span>
                  <span className="text-foreground">${selectedDancer.houseFee}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                  <span className="text-foreground">Net Payout</span>
                  <span className={selectedDancer.netPayout < 0 ? "text-destructive" : "text-success"}>
                    ${selectedDancer.netPayout} {selectedDancer.netPayout >= 0 ? <Check className="w-4 h-4 inline" /> : <AlertCircle className="w-4 h-4 inline" />}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
