import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LogIn, LogOut, BedDouble, Users, Ban, ShieldOff,
  Search, Filter, RefreshCw, Loader2, ShieldCheck,
  Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { today } from "@/hooks/useDashboardData";

// ── Types ─────────────────────────────────────────────────────────────────────

type LogEntry = {
  id: string;
  ts: string;
  action: string;
  staff_name: string | null;
  staff_role: string | null;
  staff_id: string | null;
  subject_name: string | null;
  subject_id: string | null;
  detail: Record<string, unknown> | null;
  source: string;
};

type Period = "Tonight" | "Yesterday" | "Last 7 Days";

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_META: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  check_in:     { label: "Check In",      icon: LogIn,     color: "text-green-600",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  check_out:    { label: "Check Out",     icon: LogOut,    color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/20"  },
  room_session: { label: "Room Session",  icon: BedDouble, color: "text-pink-500",   bg: "bg-pink-500/10",   border: "border-pink-500/20"  },
  guest_entry:  { label: "Guest Entry",   icon: Users,     color: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  banned:       { label: "Banned",        icon: Ban,       color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20"   },
  unbanned:     { label: "Ban Lifted",    icon: ShieldOff, color: "text-emerald-500",bg: "bg-emerald-500/10",border: "border-emerald-500/20"},
  enroll:       { label: "Enrolled",      icon: ShieldCheck,color:"text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
};

const defaultMeta = { label: "Action", icon: Clock, color: "text-muted-foreground", bg: "bg-secondary/40", border: "border-border" };

const ROLE_LABELS: Record<string, string> = {
  door_staff:     "Doorman",
  room_attendant: "Room Attendant",
  manager:        "Manager",
  owner:          "Owner",
  admin:          "Admin",
  house_mom:      "House Mom",
};

const ACTION_FILTER_OPTIONS = [
  { value: "all",          label: "All Actions"     },
  { value: "check_in",     label: "Check Ins"       },
  { value: "check_out",    label: "Check Outs"      },
  { value: "room_session", label: "Room Sessions"   },
  { value: "guest_entry",  label: "Guest Entries"   },
  { value: "banned",       label: "Bans"            },
  { value: "unbanned",     label: "Ban Lifts"       },
];

const ROLE_FILTER_OPTIONS = [
  { value: "all",           label: "All Staff"        },
  { value: "door_staff",    label: "Door / Bouncer"   },
  { value: "room_attendant",label: "Room Attendant"   },
  { value: "manager",       label: "Manager"          },
];

// ── Data hook ─────────────────────────────────────────────────────────────────

function useLogs(period: Period) {
  const getRange = () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (period === "Tonight") return { gte: `${todayStr}T00:00:00`, lte: `${todayStr}T23:59:59` };
    if (period === "Yesterday") {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      const y = d.toISOString().slice(0, 10);
      return { gte: `${y}T00:00:00`, lte: `${y}T23:59:59` };
    }
    // Last 7 days
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return { gte: `${d.toISOString().slice(0, 10)}T00:00:00`, lte: `${todayStr}T23:59:59` };
  };

  return useQuery({
    queryKey: ["staff_action_log", period],
    queryFn: async () => {
      const { gte, lte } = getRange();
      const { data, error } = await (supabase as any)
        .from("v_staff_action_log")
        .select("*")
        .gte("ts", gte)
        .lte("ts", lte)
        .order("ts", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LogEntry[];
    },
    refetchInterval: 30000,
  });
}

// ── Detail inline expand ──────────────────────────────────────────────────────

function DetailBadge({ action, detail }: { action: string; detail: Record<string, unknown> | null }) {
  if (!detail) return null;

  if (action === "check_in") {
    const method = detail.method as string;
    const fee    = detail.house_fee_applied as number;
    return (
      <span className="text-xs text-muted-foreground">
        via {method === "facial" ? "Face Scan" : "PIN"}{fee ? ` · $${fee} fee` : ""}
      </span>
    );
  }
  if (action === "check_out") {
    const fine   = detail.fine as number;
    const waived = detail.fine_waived as boolean;
    if (fine > 0 && !waived) return <span className="text-xs text-orange-500 font-medium">${fine} early leave fine</span>;
    if (waived) return <span className="text-xs text-amber-600">Fine waived</span>;
    return null;
  }
  if (action === "room_session") {
    const room = detail.room as string;
    const pkg  = detail.package as string;
    const gross = detail.gross as number;
    return (
      <span className="text-xs text-muted-foreground">
        {pkg ?? room} · ${gross}
      </span>
    );
  }
  if (action === "guest_entry") {
    const fee   = detail.door_fee as number;
    const count = detail.guest_count as number ?? 1;
    return (
      <span className="text-xs text-muted-foreground">
        {count > 1 ? `${count} guests · ` : ""}${fee} door fee
      </span>
    );
  }
  if (action === "banned" || action === "unbanned") {
    return <span className="text-xs text-muted-foreground italic">{detail.reason as string}</span>;
  }
  return null;
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ entries }: { entries: LogEntry[] }) {
  const stats = useMemo(() => ({
    checkIns:     entries.filter(e => e.action === "check_in").length,
    checkOuts:    entries.filter(e => e.action === "check_out").length,
    roomSessions: entries.filter(e => e.action === "room_session").length,
    guestEntries: entries.filter(e => e.action === "guest_entry").length,
    bans:         entries.filter(e => e.action === "banned").length,
  }), [entries]);

  const pills = [
    { label: "Check Ins",    value: stats.checkIns,     color: "text-green-600  bg-green-500/10"   },
    { label: "Check Outs",   value: stats.checkOuts,    color: "text-blue-500   bg-blue-500/10"    },
    { label: "Room Sessions",value: stats.roomSessions,  color: "text-pink-500   bg-pink-500/10"    },
    { label: "Guest Entries",value: stats.guestEntries,  color: "text-amber-500  bg-amber-500/10"   },
    { label: "Bans",         value: stats.bans,          color: "text-red-500    bg-red-500/10"     },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map(p => (
        <div key={p.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${p.color}`}>
          <span className="text-base font-bold">{p.value}</span>
          {p.label}
        </div>
      ))}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function LogsTab() {
  const [period, setPeriod]         = useState<Period>("Tonight");
  const [search, setSearch]         = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: rawEntries = [], isLoading, refetch, isFetching } = useLogs(period);

  const entries = useMemo(() => {
    return rawEntries.filter(e => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (roleFilter   !== "all" && e.staff_role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inStaff   = e.staff_name?.toLowerCase().includes(q)   ?? false;
        const inSubject = e.subject_name?.toLowerCase().includes(q) ?? false;
        const inId      = e.subject_id?.toLowerCase().includes(q)   ?? false;
        if (!inStaff && !inSubject && !inId) return false;
      }
      return true;
    });
  }, [rawEntries, actionFilter, roleFilter, search]);

  // Group by calendar date
  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    entries.forEach(e => {
      const day = new Date(e.ts).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return Array.from(map.entries());
  }, [entries]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-4">
        {/* Period + refresh */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-secondary/40 rounded-xl p-1">
            {(["Tonight", "Yesterday", "Last 7 Days"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff or performer..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:border-primary bg-background"
            />
          </div>
          {/* Action filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-border rounded-xl focus:outline-none focus:border-primary bg-white appearance-none"
            >
              {ACTION_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Role filter */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-border rounded-xl focus:outline-none focus:border-primary bg-white appearance-none"
            >
              {ROLE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && <StatsBar entries={rawEntries} />}
      </div>

      {/* Log entries */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No log entries found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting the filters or switching periods</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, dayEntries]) => (
            <div key={day} className="space-y-1.5">
              {/* Day header */}
              <div className="flex items-center gap-3 px-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{day}</p>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground shrink-0">{dayEntries.length} events</span>
              </div>

              {/* Entries */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border/40">
                {dayEntries.map(entry => {
                  const meta   = ACTION_META[entry.action] ?? defaultMeta;
                  const Icon   = meta.icon;
                  const isExpanded = expandedId === entry.id;
                  const timeStr = new Date(entry.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
                  const roleLabel = entry.staff_role ? (ROLE_LABELS[entry.staff_role] ?? entry.staff_role) : null;

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/20 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 border ${meta.bg} ${meta.border}`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Action badge */}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                          {/* Staff */}
                          {entry.staff_name && (
                            <span className="text-sm font-semibold text-foreground truncate">
                              {entry.staff_name}
                            </span>
                          )}
                          {roleLabel && (
                            <span className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-md">
                              {roleLabel}
                            </span>
                          )}
                        </div>

                        {/* Subject */}
                        {entry.subject_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium text-foreground/80">{entry.subject_name}</span>
                            {entry.subject_id && <span className="ml-1 text-muted-foreground/60">#{entry.subject_id}</span>}
                          </p>
                        )}

                        {/* Detail line */}
                        <div className="mt-0.5">
                          <DetailBadge action={entry.action} detail={entry.detail} />
                        </div>

                        {/* Expanded raw detail */}
                        {isExpanded && entry.detail && (
                          <div className="mt-2 px-3 py-2 rounded-xl bg-secondary/40 text-xs font-mono text-muted-foreground">
                            {JSON.stringify(entry.detail, null, 2)}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className="text-xs text-muted-foreground tabular-nums">{timeStr}</span>
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-xs text-center text-muted-foreground/50 pb-4">
            Showing {entries.length} of {rawEntries.length} entries
          </p>
        </div>
      )}
    </div>
  );
}
