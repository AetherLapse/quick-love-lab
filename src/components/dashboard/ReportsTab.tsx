import { useState, useMemo } from "react";
import { Download, FileText, Users, BarChart3, DoorOpen, Lock } from "lucide-react";
import { toast } from "sonner";
import { DateFilter } from "./DateFilter";
import { type Period } from "./mockData";
import {
  useRoomSessions, useGuestVisits, useAttendanceLogs, useDancers,
  getDateRange, today,
} from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";

// ─── CSV helper ───────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][][]) {
  const flat = rows.flat();
  const csv = [headers, ...flat]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type ReportType = "dancer" | "door" | "full";

const REPORT_TYPES: { id: ReportType; label: string; ownerOnly: boolean }[] = [
  { id: "dancer", label: "Run Dancer Report",  ownerOnly: false },
  { id: "door",   label: "Run Door Report",    ownerOnly: false },
  { id: "full",   label: "Run Full Report",    ownerOnly: true  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function ReportsTab() {
  const { role } = useAuth();
  const isOwner = role === "owner" || role === "admin";

  const [reportType, setReportType] = useState<ReportType>("dancer");
  const [period, setPeriod] = useState<Period>("Tonight");
  const [customRange, setCustomRange] = useState({ start: today(), end: today() });
  const { start, end } = getDateRange(period, customRange);
  const dateLabel = start === end ? start : `${start} → ${end}`;

  const { data: sessions = [], isLoading: loadSessions } = useRoomSessions(start, end);
  const { data: visits   = [], isLoading: loadVisits }   = useGuestVisits(start, end);
  const { data: logs     = [], isLoading: loadLogs }     = useAttendanceLogs(start, end);
  const { data: dancers  = [] }                          = useDancers();

  const loading = loadSessions || loadVisits || loadLogs;

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const doorRevenue    = visits.reduce((s, v) => s + (v.door_fee ?? 0), 0);
    const roomGross      = sessions.reduce((s, r) => s + (r.gross_amount ?? 0), 0);
    const roomHouse      = sessions.reduce((s, r) => s + (r.house_cut ?? 0), 0);
    const roomDancer     = sessions.reduce((s, r) => s + (r.dancer_cut ?? 0), 0);
    const gross          = doorRevenue + roomGross;
    const houseNet       = doorRevenue + roomHouse;
    const totalGuests    = visits.length;
    const returning      = (visits as Array<{ guests?: { is_returning?: boolean } }>)
                            .filter((v) => v.guests?.is_returning).length;
    const newGuests      = totalGuests - returning;

    // Avg session minutes
    const closedSessions = sessions.filter((s) => s.exit_time);
    const avgMin = closedSessions.length
      ? Math.round(closedSessions.reduce((sum, s) => {
          return sum + (new Date(s.exit_time!).getTime() - new Date(s.entry_time).getTime()) / 60000;
        }, 0) / closedSessions.length)
      : 0;

    // Peak hour
    const hourBuckets: Record<number, number> = {};
    visits.forEach((v) => { const h = new Date(v.entry_time).getHours(); hourBuckets[h] = (hourBuckets[h] ?? 0) + 1; });
    const peakHour = Object.keys(hourBuckets).length
      ? (() => { const h = Number(Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0][0]); return h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`; })()
      : "—";

    // Dancer payroll
    const dancerMap: Record<string, { stageName: string; sessions: number; grossCut: number; entranceFeeOwed: number }> = {};
    sessions.forEach((s) => {
      if (!s.dancer_id) return;
      if (!dancerMap[s.dancer_id]) {
        const d = dancers.find((x) => x.id === s.dancer_id);
        dancerMap[s.dancer_id] = { stageName: d?.stage_name ?? "Unknown", sessions: 0, grossCut: 0, entranceFeeOwed: 0 };
      }
      dancerMap[s.dancer_id].sessions    += 1;
      dancerMap[s.dancer_id].grossCut    += s.dancer_cut ?? 0;
    });
    logs.forEach((l) => {
      if (!l.dancer_id || !dancerMap[l.dancer_id]) return;
      dancerMap[l.dancer_id].entranceFeeOwed += (l as { entrance_fee_amount?: number }).entrance_fee_amount ?? 0;
    });
    const payroll = Object.entries(dancerMap).map(([id, d]) => ({
      id,
      stageName: d.stageName,
      sessions: d.sessions,
      grossCut: d.grossCut,
      entranceFeeOwed: d.entranceFeeOwed,
      net: d.grossCut - d.entranceFeeOwed,
    })).sort((a, b) => b.net - a.net);

    return { doorRevenue, roomGross, roomHouse, roomDancer, gross, houseNet, totalGuests, returning, newGuests, avgMin, peakHour, payroll };
  }, [sessions, visits, logs, dancers]);

  // ── Export handlers ──────────────────────────────────────────────────────────
  const exportShiftReport = () => {
    downloadCSV(
      `shift-report-${start}.csv`,
      ["Type", "Time", "Details", "Amount"],
      [
        visits.map((v) => [
          "Door Entry",
          fmtTime(v.entry_time),
          `Guest #${(v as { guests?: { is_returning?: boolean } }).guests?.is_returning ? "Returning" : "New"}`,
          v.door_fee,
        ]),
        sessions.map((s) => [
          "Room Session",
          fmtTime(s.entry_time),
          `${s.room_name ?? "Room"} · ${s.package_name ?? ""}`,
          s.gross_amount,
        ]),
      ]
    );
    toast.success("Shift report downloaded");
  };

  const exportPayroll = () => {
    downloadCSV(
      `payroll-${start}.csv`,
      ["Performer", "Sessions", "Gross Cut", "Entrance Fee Owed", "Net Payout"],
      [metrics.payroll.map((d) => [d.stageName, d.sessions, d.grossCut.toFixed(2), d.entranceFeeOwed.toFixed(2), d.net.toFixed(2)])]
    );
    toast.success("Payroll sheet downloaded");
  };

  const exportFullPeriod = () => {
    downloadCSV(
      `revenue-${start}-to-${end}.csv`,
      ["Date", "Door Revenue", "Room Revenue", "Gross", "House Net", "Dancer Payouts", "Total Guests", "Sessions"],
      [[[ start === end ? start : `${start} to ${end}`, metrics.doorRevenue.toFixed(2), metrics.roomGross.toFixed(2), metrics.gross.toFixed(2), metrics.houseNet.toFixed(2), metrics.roomDancer.toFixed(2), metrics.totalGuests, sessions.length ]]]
    );
    toast.success("Revenue report downloaded");
  };

  // ── Formatted preview text ───────────────────────────────────────────────────
  const previewText = useMemo(() => {
    const line = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
    const r = metrics;
    const payrollLines = r.payroll.length
      ? r.payroll.map((d) =>
          `  ${d.stageName.padEnd(18)}${String(d.sessions).padStart(2)} session${d.sessions !== 1 ? "s" : " "}   ${
            d.net < 0 ? `Owes: -${fmt(Math.abs(d.net)).padStart(8)} [!]` : `Payout: ${fmt(d.net).padStart(8)}`
          }`
        ).join("\n")
      : "  No performer sessions recorded";

    return `${line}
         2NYT SHIFT REPORT
         ${dateLabel}
${line}

DOOR SUMMARY
  Total Guests:    ${String(r.totalGuests).padStart(10)}
  Door Revenue:    ${fmt(r.doorRevenue).padStart(10)}
  New Guests:      ${String(r.newGuests).padStart(10)}
  Returning:       ${String(r.returning).padStart(10)}  (${r.totalGuests ? Math.round((r.returning / r.totalGuests) * 100) : 0}%)

ROOM SUMMARY
  Total Sessions:  ${String(sessions.length).padStart(10)}
  Room Revenue:    ${fmt(r.roomGross).padStart(10)}
  Avg Session:     ${String(r.avgMin ? r.avgMin + " min" : "—").padStart(10)}
  Peak Hour:       ${r.peakHour.padStart(10)}

FINANCIAL SUMMARY
  Gross Revenue:   ${fmt(r.gross).padStart(10)}
  House Net:       ${fmt(r.houseNet).padStart(10)}
  Dancer Payouts:  ${fmt(r.roomDancer).padStart(10)}

DANCER BREAKDOWN
${payrollLines}
${line}`;
  }, [metrics, sessions.length, dateLabel]);

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-foreground">Reports</h2>
        <DateFilter activePeriod={period} setActivePeriod={setPeriod} customRange={customRange} setCustomRange={setCustomRange} />
      </div>

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {REPORT_TYPES.map(rt => {
          const locked = rt.ownerOnly && !isOwner;
          return (
            <button
              key={rt.id}
              disabled={locked}
              onClick={() => !locked && setReportType(rt.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                ${reportType === rt.id && !locked
                  ? "border-primary bg-primary text-white"
                  : locked
                    ? "border-border bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                    : "border-border bg-white hover:border-primary/60 text-foreground"
                }`}
            >
              {locked && <Lock className="w-3.5 h-3.5" />}
              {rt.label}
              {rt.ownerOnly && <span className="text-[10px] opacity-70">(Owner)</span>}
            </button>
          );
        })}
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Door Revenue",   value: fmt(metrics.doorRevenue),  sub: `${metrics.totalGuests} guests` },
          { label: "Room Revenue",   value: fmt(metrics.roomGross),     sub: `${sessions.length} sessions` },
          { label: "Gross Total",    value: fmt(metrics.gross),         sub: `House net ${fmt(metrics.houseNet)}` },
          { label: "Dancer Payouts", value: fmt(metrics.roomDancer),    sub: `${metrics.payroll.length} performers` },
        ].map((k) => (
          <div key={k.label} className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-xl font-heading text-primary">{loading ? "…" : k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{loading ? "" : k.sub}</p>
          </div>
        ))}
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { Icon: DoorOpen,  title: "Shift Report",           desc: "All door + room entries for the period",  action: exportShiftReport },
          { Icon: Users,     title: "Dancer Payroll Sheet",   desc: "Net payout owed per performer",            action: exportPayroll },
          { Icon: BarChart3, title: "Full Revenue Report",    desc: "Aggregated revenue for selected range",    action: exportFullPeriod },
        ].map(({ Icon, title, desc, action }) => (
          <div key={title} className="glass-card p-6 flex flex-col justify-between gap-4">
            <div>
              <Icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-heading text-xl tracking-wide mb-1">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
            <button
              onClick={action}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        ))}
      </div>

      {/* Report preview */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-2xl tracking-wide">Report Preview</h3>
          <span className="text-xs text-muted-foreground ml-2">{dateLabel}</span>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 font-mono text-sm leading-relaxed overflow-x-auto">
          {loading
            ? <p className="text-muted-foreground">Loading data…</p>
            : <pre className="text-foreground whitespace-pre-wrap">{previewText}</pre>
          }
        </div>
      </div>

      {/* Dancer payroll table */}
      <div className="glass-card p-6">
        <h3 className="font-heading text-2xl tracking-wide mb-4">Dancer Payroll Breakdown</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : metrics.payroll.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No performer sessions in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 px-3 text-left font-medium">Performer</th>
                  <th className="py-3 px-3 text-right font-medium">Sessions</th>
                  <th className="py-3 px-3 text-right font-medium">Gross Cut</th>
                  <th className="py-3 px-3 text-right font-medium">Entrance Fee</th>
                  <th className="py-3 px-3 text-right font-medium">Net Payout</th>
                  <th className="py-3 px-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.payroll.map((d) => (
                  <tr key={d.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">{d.stageName}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">{d.sessions}</td>
                    <td className="py-3 px-3 text-right text-foreground">{fmt(d.grossCut)}</td>
                    <td className="py-3 px-3 text-right text-destructive">−{fmt(d.entranceFeeOwed)}</td>
                    <td className={`py-3 px-3 text-right font-semibold ${d.net >= 0 ? "text-success" : "text-destructive"}`}>
                      {d.net >= 0 ? fmt(d.net) : `−${fmt(Math.abs(d.net))}`}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {d.net < 0
                        ? <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-medium">Owes Club</span>
                        : <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium">Pay Out</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border text-foreground font-semibold">
                  <td className="py-3 px-3">Totals</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">{metrics.payroll.reduce((s, d) => s + d.sessions, 0)}</td>
                  <td className="py-3 px-3 text-right">{fmt(metrics.payroll.reduce((s, d) => s + d.grossCut, 0))}</td>
                  <td className="py-3 px-3 text-right text-destructive">−{fmt(metrics.payroll.reduce((s, d) => s + d.entranceFeeOwed, 0))}</td>
                  <td className={`py-3 px-3 text-right ${metrics.roomDancer >= 0 ? "text-success" : "text-destructive"}`}>
                    {fmt(metrics.payroll.reduce((s, d) => s + d.net, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
