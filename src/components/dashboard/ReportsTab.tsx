import { useState, useMemo } from "react";
import {
  Download, FileText, Users, BarChart3, DoorOpen, Lock, Tag,
  ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus,
  X, Clock, DollarSign, User, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { DateFilter } from "./DateFilter";
import { type Period } from "./mockData";
import {
  useRoomSessions, useGuestVisits, useAttendanceLogs, useDancers,
  useCustomerEntries, getDateRange, today,
} from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][][]) {
  const flat = rows.flat();
  const csv = [headers, ...flat]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDur(entry: string, exit: string | null) {
  if (!exit) return "Open";
  const m = Math.round((new Date(exit).getTime() - new Date(entry).getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ─── Dancer Detail Drawer ─────────────────────────────────────────────────────
interface DancerRecord {
  id: string;
  stageName: string;
  sessions: number;
  grossCut: number;
  entranceFeeOwed: number;
  earlyFine: number;
  net: number;
}

interface SessionRow {
  id: string;
  room_name: string | null;
  package_name: string | null;
  gross_amount: number | null;
  dancer_cut: number | null;
  entry_time: string;
  exit_time: string | null;
}

interface AttendanceRow {
  id: string;
  clock_in: string;
  clock_out: string | null;
  entrance_fee_amount: number | null;
  early_leave_fine: number | null;
  fine_waived: boolean | null;
  shift_date: string;
}

function DancerDetailPanel({
  dancer,
  sessions,
  attendance,
  onClose,
  onExport,
}: {
  dancer: DancerRecord;
  sessions: SessionRow[];
  attendance: AttendanceRow[];
  onClose: () => void;
  onExport: () => void;
}) {
  const owes = dancer.net < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-2xl max-h-[90vh] flex flex-col rounded-t-2xl md:rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-5 border-b border-border flex items-center justify-between ${owes ? "bg-destructive/5" : "bg-success/5"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${owes ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
              {dancer.stageName[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{dancer.stageName}</h3>
              <p className={`text-sm font-semibold ${owes ? "text-destructive" : "text-success"}`}>
                {owes ? `Owes Club ${fmt(Math.abs(dancer.net))}` : `Payout ${fmt(dancer.net)}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Net Summary */}
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-border/60">
            {[
              { label: "Gross Earnings", value: fmt(dancer.grossCut), color: "text-foreground" },
              { label: "Entrance Fee",   value: `−${fmt(dancer.entranceFeeOwed)}`, color: "text-destructive" },
              { label: "Early Fine",     value: dancer.earlyFine > 0 ? `−${fmt(dancer.earlyFine)}` : "None", color: dancer.earlyFine > 0 ? "text-destructive" : "text-muted-foreground" },
              { label: "Net",            value: owes ? `−${fmt(Math.abs(dancer.net))}` : fmt(dancer.net), color: owes ? "text-destructive" : "text-success" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-secondary/40 rounded-xl px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Sessions */}
          <div className="px-6 py-4 border-b border-border/60">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> Room Sessions ({sessions.length})
            </h4>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No room sessions recorded</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.room_name ?? "Room"}</p>
                      <p className="text-xs text-muted-foreground">{s.package_name ?? "—"} · {fmtDur(s.entry_time, s.exit_time)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{fmt(s.dancer_cut ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">of {fmt(s.gross_amount ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance */}
          <div className="px-6 py-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Attendance Log
            </h4>
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No attendance records</p>
            ) : (
              <div className="space-y-2">
                {attendance.map((a) => (
                  <div key={a.id} className="px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">{a.shift_date}</p>
                      <p className="text-xs text-muted-foreground">{fmtTime(a.clock_in)} → {a.clock_out ? fmtTime(a.clock_out) : "Still in"}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Entrance: <span className="text-foreground font-medium">{fmt(a.entrance_fee_amount ?? 0)}</span></span>
                      {(a.early_leave_fine ?? 0) > 0 && (
                        <span>Fine: <span className={a.fine_waived ? "line-through text-muted-foreground" : "text-destructive font-medium"}>{fmt(a.early_leave_fine ?? 0)}</span>{a.fine_waived && " (waived)"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Download className="w-4 h-4" /> Export Record
          </button>
          {dancer.net < 0 && (
            <button
              onClick={() => { toast.info("Mark as paid feature coming soon"); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive text-white text-sm font-bold hover:opacity-90 transition-all"
            >
              Mark as Paid
            </button>
          )}
          {dancer.net >= 0 && (
            <button
              onClick={() => { toast.info("Payout recorded feature coming soon"); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success text-white text-sm font-bold hover:opacity-90 transition-all"
            >
              Record Payout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ReportsTab() {
  const { role } = useAuth();
  const isOwner = role === "owner" || role === "admin";

  const [period, setPeriod] = useState<Period>("Tonight");
  const [customRange, setCustomRange] = useState({ start: today(), end: today() });
  const [selectedDancer, setSelectedDancer] = useState<DancerRecord | null>(null);

  const { start, end } = getDateRange(period, customRange);
  const dateLabel = start === end ? start : `${start} → ${end}`;

  const { data: sessions  = [], isLoading: loadSessions } = useRoomSessions(start, end);
  const { data: visits    = [], isLoading: loadVisits }   = useGuestVisits(start, end);
  const { data: logs      = [], isLoading: loadLogs }     = useAttendanceLogs(start, end);
  const { data: dancers   = [] }                          = useDancers();
  const { data: entries   = [], isLoading: loadEntries }  = useCustomerEntries(start, end);

  const loading = loadSessions || loadVisits || loadLogs || loadEntries;

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const doorRevenue = visits.reduce((s, v) => s + (v.door_fee ?? 0), 0);
    const roomGross   = sessions.reduce((s, r) => s + (r.gross_amount ?? 0), 0);
    const roomHouse   = sessions.reduce((s, r) => s + (r.house_cut ?? 0), 0);
    const roomDancer  = sessions.reduce((s, r) => s + (r.dancer_cut ?? 0), 0);
    const houseNet    = doorRevenue + roomHouse;
    const gross       = doorRevenue + roomGross;
    const totalGuests = visits.length;
    const returning   = (visits as any[]).filter((v) => v.guests?.is_returning).length;

    const closedSessions = sessions.filter((s) => s.exit_time);
    const avgMin = closedSessions.length
      ? Math.round(closedSessions.reduce((sum, s) =>
          sum + (new Date(s.exit_time!).getTime() - new Date(s.entry_time).getTime()) / 60000, 0
        ) / closedSessions.length) : 0;

    // Dancer payout with fine data
    const dancerMap: Record<string, {
      stageName: string; sessions: number; grossCut: number;
      entranceFeeOwed: number; earlyFine: number;
    }> = {};
    sessions.forEach((s) => {
      if (!s.dancer_id) return;
      if (!dancerMap[s.dancer_id]) {
        const d = dancers.find((x) => x.id === s.dancer_id);
        dancerMap[s.dancer_id] = { stageName: d?.stage_name ?? "Unknown", sessions: 0, grossCut: 0, entranceFeeOwed: 0, earlyFine: 0 };
      }
      dancerMap[s.dancer_id].sessions += 1;
      dancerMap[s.dancer_id].grossCut += s.dancer_cut ?? 0;
    });
    logs.forEach((l: any) => {
      if (!l.dancer_id) return;
      if (!dancerMap[l.dancer_id]) {
        const d = dancers.find((x) => x.id === l.dancer_id);
        dancerMap[l.dancer_id] = { stageName: d?.stage_name ?? (l.dancers as any)?.stage_name ?? "Unknown", sessions: 0, grossCut: 0, entranceFeeOwed: 0, earlyFine: 0 };
      }
      dancerMap[l.dancer_id].entranceFeeOwed += l.entrance_fee_amount ?? 0;
      if (!l.fine_waived) dancerMap[l.dancer_id].earlyFine += l.early_leave_fine ?? 0;
    });

    const payout: DancerRecord[] = Object.entries(dancerMap).map(([id, d]) => ({
      id,
      stageName: d.stageName,
      sessions: d.sessions,
      grossCut: d.grossCut,
      entranceFeeOwed: d.entranceFeeOwed,
      earlyFine: d.earlyFine,
      net: d.grossCut - d.entranceFeeOwed - d.earlyFine,
    })).sort((a, b) => b.net - a.net);

    const owingDancers = payout.filter((d) => d.net < 0).sort((a, b) => a.net - b.net);

    return { doorRevenue, roomGross, roomHouse, roomDancer, houseNet, gross, totalGuests, returning, avgMin, payout, owingDancers };
  }, [sessions, visits, logs, dancers]);

  // Sessions/attendance for selected dancer
  const selectedDancerSessions: SessionRow[] = useMemo(() => {
    if (!selectedDancer) return [];
    return (sessions as any[]).filter((s) => s.dancer_id === selectedDancer.id);
  }, [sessions, selectedDancer]);

  const selectedDancerAttendance: AttendanceRow[] = useMemo(() => {
    if (!selectedDancer) return [];
    return (logs as any[]).filter((l) => l.dancer_id === selectedDancer.id);
  }, [logs, selectedDancer]);

  // ── Vendor metrics ───────────────────────────────────────────────────────────
  const vendorStats = useMemo(() => {
    type VRow = { name: string; entries: number; guests: number; revenue: number; isManual: boolean; lastSeen: string };
    const map: Record<string, VRow> = {};
    const vendorEntries = (entries as any[]).filter((e) => e.vendor_id || e.vendor_name);
    vendorEntries.forEach((e) => {
      const key  = e.vendor_id ?? `manual:${e.vendor_name}`;
      const name = e.vendors?.name ?? e.vendor_name ?? "Unknown";
      if (!map[key]) map[key] = { name, entries: 0, guests: 0, revenue: 0, isManual: !e.vendor_id, lastSeen: e.entry_time };
      map[key].entries += 1; map[key].guests += e.guest_count ?? 1; map[key].revenue += e.door_fee ?? 0;
      if (e.entry_time > map[key].lastSeen) map[key].lastSeen = e.entry_time;
    });
    const rows = Object.values(map).sort((a, b) => b.guests - a.guests);
    const manualLog = (entries as any[])
      .filter((e) => e.vendor_name && !e.vendor_id)
      .map((e) => ({ name: e.vendor_name, tierName: e.entry_tiers?.name ?? "—", guests: e.guest_count ?? 1, fee: e.door_fee ?? 0, time: e.entry_time }))
      .sort((a, b) => b.time.localeCompare(a.time));
    return { rows, manualLog };
  }, [entries]);

  // ── Export helpers ───────────────────────────────────────────────────────────
  const exportPayout = () => {
    downloadCSV(`payout-${start}.csv`,
      ["Performer", "Sessions", "Gross Cut", "Entrance Fee", "Early Fine", "Net Payout"],
      [metrics.payout.map((d) => [d.stageName, d.sessions, d.grossCut.toFixed(2), d.entranceFeeOwed.toFixed(2), d.earlyFine.toFixed(2), d.net.toFixed(2)])]
    );
    toast.success("Payout sheet downloaded");
  };

  const exportDancerRecord = (d: DancerRecord) => {
    downloadCSV(`dancer-${d.stageName}-${start}.csv`,
      ["Date", "Type", "Details", "Amount"],
      [
        selectedDancerSessions.map((s) => [s.entry_time.slice(0, 10), "Session", `${s.room_name ?? "Room"} · ${s.package_name ?? ""}`, s.dancer_cut ?? 0]),
        selectedDancerAttendance.map((a) => [a.shift_date, "Entrance Fee", "House fee", a.entrance_fee_amount ?? 0]),
        selectedDancerAttendance.filter((a) => !a.fine_waived && (a.early_leave_fine ?? 0) > 0).map((a) => [a.shift_date, "Fine", "Early leave", a.early_leave_fine ?? 0]),
      ]
    );
    toast.success(`${d.stageName} record exported`);
  };

  const exportFullReport = () => {
    downloadCSV(`revenue-${start}-to-${end}.csv`,
      ["Period", "Door Revenue", "Room Revenue", "House Cut", "House Net", "Dancer Payouts", "Total Guests", "Sessions"],
      [[[start === end ? start : `${start} to ${end}`, metrics.doorRevenue.toFixed(2), metrics.roomGross.toFixed(2), metrics.roomHouse.toFixed(2), metrics.houseNet.toFixed(2), metrics.roomDancer.toFixed(2), metrics.totalGuests, sessions.length]]]
    );
    toast.success("Revenue report downloaded");
  };

  const exportVendors = () => {
    downloadCSV(`vendor-tracking-${start}.csv`,
      ["Vendor", "Type", "Entries", "Guests", "Revenue", "Last Seen"],
      [vendorStats.rows.map((v) => [v.name, v.isManual ? "Manual" : "Known", v.entries, v.guests, v.revenue.toFixed(2), fmtTime(v.lastSeen)])]
    );
    toast.success("Vendor report downloaded");
  };

  // ── KPI data ─────────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Door Revenue",
      value: fmt(metrics.doorRevenue),
      sub: `${metrics.totalGuests} guests`,
      icon: DoorOpen,
      color: "text-blue-500",
      bg: "bg-blue-50 border-blue-100",
    },
    {
      label: "House Fee",
      value: fmt(metrics.houseNet),
      sub: `Door + room cut`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/8 border-primary/20",
      featured: true,
    },
    {
      label: "Room Revenue",
      value: fmt(metrics.roomGross),
      sub: `${sessions.length} sessions · avg ${metrics.avgMin}m`,
      icon: DollarSign,
      color: "text-violet-500",
      bg: "bg-violet-50 border-violet-100",
    },
    {
      label: "Gross Total",
      value: fmt(metrics.gross),
      sub: `${metrics.returning} returning guests`,
      icon: BarChart3,
      color: "text-emerald-500",
      bg: "bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              onClick={exportFullReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40 shadow-sm"
            >
              <Download className="w-4 h-4" /> Full Export
            </button>
          )}
          <DateFilter activePeriod={period} setActivePeriod={setPeriod} customRange={customRange} setCustomRange={setCustomRange} />
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg, featured }) => (
          <div key={label} className={`rounded-2xl border p-5 ${featured ? "col-span-2 lg:col-span-1 " + bg : bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${featured ? "bg-primary/15" : "bg-white/80"}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${featured ? "text-primary" : "text-foreground"}`}>
              {loading ? <span className="text-muted-foreground text-lg">…</span> : value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{loading ? "" : sub}</p>
          </div>
        ))}
      </div>

      {/* ── Dancers Owing Money ── */}
      {!loading && metrics.owingDancers.length > 0 && (
        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-bold text-base text-destructive">Dancers Owing the Club</h3>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-destructive text-white">
              {metrics.owingDancers.length} dancer{metrics.owingDancers.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.owingDancers.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDancer(d)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-destructive/40 hover:border-destructive hover:shadow-md transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center font-bold text-xl text-destructive shrink-0">
                  {d.stageName[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{d.stageName}</p>
                  <p className="text-xs text-muted-foreground">{d.sessions} session{d.sessions !== 1 ? "s" : ""}</p>
                  <p className="text-lg font-extrabold text-destructive mt-0.5">−{fmt(Math.abs(d.net))}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Dancer Payout Breakdown ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">Dancer Payout Breakdown</h3>
          </div>
          <button
            onClick={exportPayout}
            disabled={loading || metrics.payout.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : metrics.payout.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground italic">No performer sessions in this period.</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-border/60 md:hidden">
              {metrics.payout.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDancer(d)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${d.net < 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                    {d.stageName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{d.stageName}</p>
                    <p className="text-xs text-muted-foreground">{d.sessions} sessions · {fmt(d.grossCut)} gross</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-base ${d.net < 0 ? "text-destructive" : "text-success"}`}>
                      {d.net < 0 ? `−${fmt(Math.abs(d.net))}` : fmt(d.net)}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${d.net < 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                      {d.net < 0 ? "Owes" : "Pay Out"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="py-3 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dancer</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessions</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Cut</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entrance Fee</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fine</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {metrics.payout.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDancer(d)}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${d.net < 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                            {d.stageName[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground">{d.stageName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted-foreground">{d.sessions}</td>
                      <td className="py-3.5 px-4 text-right text-foreground">{fmt(d.grossCut)}</td>
                      <td className="py-3.5 px-4 text-right text-destructive">−{fmt(d.entranceFeeOwed)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {d.earlyFine > 0
                          ? <span className="text-destructive">−{fmt(d.earlyFine)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold ${d.net < 0 ? "text-destructive" : "text-success"}`}>
                        {d.net < 0 ? `−${fmt(Math.abs(d.net))}` : fmt(d.net)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${d.net < 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                          {d.net < 0 ? "Owes Club" : "Pay Out"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/20">
                    <td className="py-3 px-5 font-bold text-foreground text-sm">Totals</td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-medium">{metrics.payout.reduce((s, d) => s + d.sessions, 0)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{fmt(metrics.payout.reduce((s, d) => s + d.grossCut, 0))}</td>
                    <td className="py-3 px-4 text-right text-destructive font-semibold">−{fmt(metrics.payout.reduce((s, d) => s + d.entranceFeeOwed, 0))}</td>
                    <td className="py-3 px-4 text-right text-destructive font-semibold">
                      {metrics.payout.reduce((s, d) => s + d.earlyFine, 0) > 0
                        ? `−${fmt(metrics.payout.reduce((s, d) => s + d.earlyFine, 0))}`
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold text-base ${metrics.payout.reduce((s, d) => s + d.net, 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {fmt(metrics.payout.reduce((s, d) => s + d.net, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Vendor Tracking ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">Vendor / Distributor Tracking</h3>
          </div>
          <button
            onClick={exportVendors}
            disabled={loading || vendorStats.rows.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : vendorStats.rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground italic">No vendor-tracked entries in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["Vendor / Distributor", "Type", "Entries", "Guests", "Revenue", "Last Seen"].map((h, i) => (
                    <th key={h} className={`py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${i === 0 ? "text-left" : i < 2 ? "text-center" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {vendorStats.rows.map((v, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">{v.name}</td>
                    <td className="py-3 px-4 text-center">
                      {v.isManual
                        ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Manual</span>
                        : <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">Known</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{v.entries}</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{v.guests}</td>
                    <td className="py-3 px-4 text-right text-foreground">{fmt(v.revenue)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground text-xs">{fmtTime(v.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/20">
                  <td className="py-3 px-4 font-bold text-foreground" colSpan={2}>Totals</td>
                  <td className="py-3 px-4 text-right font-medium text-muted-foreground">{vendorStats.rows.reduce((s, v) => s + v.entries, 0)}</td>
                  <td className="py-3 px-4 text-right font-bold text-foreground">{vendorStats.rows.reduce((s, v) => s + v.guests, 0)}</td>
                  <td className="py-3 px-4 text-right font-bold text-foreground">{fmt(vendorStats.rows.reduce((s, v) => s + v.revenue, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>

            {vendorStats.manualLog.length > 0 && (
              <div className="border-t border-border px-6 py-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Manual Entries Log
                </h4>
                <div className="space-y-1.5">
                  {vendorStats.manualLog.map((e, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-sm">
                      <span className="text-xs text-muted-foreground font-mono w-32 shrink-0">{fmtTime(e.time)}</span>
                      <span className="font-semibold text-foreground">{e.name}</span>
                      <span className="text-muted-foreground text-xs">{e.tierName}</span>
                      <span className="ml-auto text-muted-foreground">{e.guests} guest{e.guests !== 1 ? "s" : ""}</span>
                      <span className="font-semibold text-foreground w-16 text-right">{e.fee > 0 ? fmt(e.fee) : "Free"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Export Cards ── */}
      {isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { Icon: DoorOpen,  title: "Booking Report",       desc: "All door + room entries for the period",  action: () => { downloadCSV(`bookings-${start}.csv`, ["Type", "Time", "Details", "Amount"], [(visits as any[]).map((v) => ["Door Entry", fmtTime(v.entry_time), v.guests?.is_returning ? "Returning" : "New", v.door_fee ?? 0]), sessions.map((s) => ["Room Session", fmtTime(s.entry_time), `${s.room_name ?? "Room"} · ${s.package_name ?? ""}`, s.gross_amount ?? 0])]); toast.success("Booking report downloaded"); } },
            { Icon: Users,     title: "Dancer Payout Sheet",  desc: "Net payout owed per performer",            action: exportPayout },
            { Icon: BarChart3, title: "Full Revenue Report",  desc: "Aggregated revenue for selected range",    action: exportFullReport },
          ].map(({ Icon, title, desc, action }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-foreground mb-1">{title}</h4>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                onClick={action}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary text-sm font-medium text-foreground transition-all disabled:opacity-40"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Dancer Detail Drawer ── */}
      {selectedDancer && (
        <DancerDetailPanel
          dancer={selectedDancer}
          sessions={selectedDancerSessions}
          attendance={selectedDancerAttendance}
          onClose={() => setSelectedDancer(null)}
          onExport={() => exportDancerRecord(selectedDancer)}
        />
      )}
    </div>
  );
}
