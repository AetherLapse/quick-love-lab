import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Sparkles, Plus, Check, ChevronDown, ChevronUp,
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Loader2, Mic2, X,
} from "lucide-react";
import logo from "@/assets/logo-2nyt.png";

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8";
const BASE = "https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1";

const headers = {
  "Content-Type": "application/json",
  "apikey": ANON_KEY,
  "Authorization": `Bearer ${ANON_KEY}`,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DancerSession {
  id: string;
  name?: string;
  stage_name?: string;
  method: "face" | "pin";
}

interface StageName {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Shift {
  id: string;
  shift_date: string;
  clock_in: string;
  clock_out: string | null;
  entrance_fee: number;
  early_leave_fine: number;
  fine_waived: boolean;
  room_earnings: number;
  net: number;
}

interface PortalData {
  dancer: {
    id: string; full_name: string; stage_name: string;
    email: string; enroll_id: string; dancer_number: number | null; is_enrolled: boolean;
  };
  stage_names: StageName[];
  shifts: Shift[];
  total_outstanding: number;
}

// ─── Main portal ──────────────────────────────────────────────────────────────

export default function DancerPortal() {
  const navigate  = useNavigate();
  const [session, setSession] = useState<DancerSession | null>(null);
  const [data, setData]       = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("dancer_session");
    if (!raw) { navigate("/dancer-login"); return; }
    try {
      const s = JSON.parse(raw) as DancerSession;
      setSession(s);
    } catch { navigate("/dancer-login"); }
  }, [navigate]);

  const fetchData = useCallback(async (dancerId: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/dancer-portal-data`, {
        method: "POST", headers,
        body: JSON.stringify({ dancer_id: dancerId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setData(json as PortalData);
    } catch (e: any) {
      setError(e.message ?? "Failed to load portal data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.id) fetchData(session.id);
  }, [session, fetchData]);

  const handleLogout = () => {
    sessionStorage.removeItem("dancer_session");
    navigate("/");
  };

  const handleStageNameUpdate = (updatedNames: StageName[], newActiveName: string) => {
    setData(prev => prev ? {
      ...prev,
      dancer: { ...prev.dancer, stage_name: newActiveName },
      stage_names: updatedNames,
    } : prev);
    // Update session storage display name
    const raw = sessionStorage.getItem("dancer_session");
    if (raw) {
      try {
        const s = JSON.parse(raw);
        sessionStorage.setItem("dancer_session", JSON.stringify({ ...s, stage_name: newActiveName }));
      } catch { /* ignore */ }
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={bgStyle}>
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-destructive">{error ?? "Failed to load"}</p>
        <button onClick={() => session && fetchData(session.id)}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm">Retry</button>
      </div>
    );
  }

  const { dancer, stage_names, shifts, total_outstanding } = data;

  return (
    <div className="min-h-screen" style={bgStyle}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <img src={logo} alt="2NYT" className="h-7 w-auto" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-none">Dancer Portal</p>
            <p className="text-sm font-bold text-foreground truncate">{dancer.stage_name || dancer.full_name}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Balance summary card ── */}
        <BalanceSummaryCard total_outstanding={total_outstanding} shifts={shifts} />

        {/* ── Stage names ── */}
        <StageNamesPanel
          dancerId={dancer.id}
          stageNames={stage_names}
          onUpdate={handleStageNameUpdate}
        />

        {/* ── Booking history ── */}
        <ShiftHistoryPanel shifts={shifts} />

      </main>
    </div>
  );
}

const bgStyle = {
  background: "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(328 78% 90% / 0.35) 0%, hsl(0 0% 98%) 70%)",
};

// ─── Balance summary ──────────────────────────────────────────────────────────

function BalanceSummaryCard({ total_outstanding, shifts }: { total_outstanding: number; shifts: Shift[] }) {
  const totalEarnings = shifts.reduce((s, sh) => s + sh.room_earnings, 0);
  const totalFees     = shifts.reduce((s, sh) => s + sh.entrance_fee + (sh.fine_waived ? 0 : sh.early_leave_fine), 0);

  return (
    <div className={`rounded-2xl border-2 p-5 space-y-4
      ${total_outstanding > 0 ? "border-red-200 bg-red-50/60" : "border-green-200 bg-green-50/60"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
          ${total_outstanding > 0 ? "bg-red-100" : "bg-green-100"}`}>
          {total_outstanding > 0
            ? <AlertTriangle className="w-5 h-5 text-red-500" />
            : <Sparkles className="w-5 h-5 text-green-600" />}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding Balance</p>
          <p className={`text-2xl font-bold ${total_outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
            {total_outstanding > 0 ? `-$${total_outstanding.toFixed(2)}` : "All Clear"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/70 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
          <p className="text-lg font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">from room sessions</p>
        </div>
        <div className="bg-white/70 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <p className="text-xs text-muted-foreground">Total Fees</p>
          </div>
          <p className="text-lg font-bold text-red-500">${totalFees.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">house fees + fines</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stage names panel ────────────────────────────────────────────────────────

function StageNamesPanel({
  dancerId, stageNames, onUpdate,
}: {
  dancerId: string;
  stageNames: StageName[];
  onUpdate: (names: StageName[], activeName: string) => void;
}) {
  const [names, setNames]       = useState<StageName[]>(stageNames);
  const [newName, setNewName]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true); setError(null);
    try {
      const res = await fetch(`${BASE}/dancer-stage-name`, {
        method: "POST", headers,
        body: JSON.stringify({ dancer_id: dancerId, action: "add", name: newName.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const updated = [json.stage_name as StageName, ...names];
      setNames(updated);
      setNewName(""); setShowAdd(false);
      const active = updated.find(n => n.is_active);
      onUpdate(updated, active?.name ?? "");
    } catch (e: any) {
      setError(e.message ?? "Failed to add name");
    } finally {
      setAdding(false);
    }
  };

  const handleSelect = async (nameId: string) => {
    setSelecting(nameId); setError(null);
    try {
      const res = await fetch(`${BASE}/dancer-stage-name`, {
        method: "POST", headers,
        body: JSON.stringify({ dancer_id: dancerId, action: "select", stage_name_id: nameId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const updated = names.map(n => ({ ...n, is_active: n.id === nameId }));
      setNames(updated);
      onUpdate(updated, json.active_name);
    } catch (e: any) {
      setError(e.message ?? "Failed to select name");
    } finally {
      setSelecting(null);
    }
  };

  const active = names.find(n => n.is_active);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mic2 className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground">Stage Name</h2>
          <p className="text-xs text-muted-foreground">
            Active: <span className="text-primary font-semibold">{active?.name ?? "—"}</span>
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setError(null); setNewName(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/50 hover:text-primary transition-all"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add New"}
        </button>
      </div>

      <div className="p-5 space-y-3">
        {/* Add new form */}
        {showAdd && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Crystal"
              maxLength={30}
              className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </p>
        )}

        {/* Name list */}
        {names.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No stage names yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {names.map(n => (
              <div key={n.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
                  ${n.is_active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white hover:border-primary/30"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${n.is_active ? "text-primary" : "text-foreground"}`}>
                    {n.name}
                  </p>
                  {n.is_active && (
                    <p className="text-[10px] text-primary/70 mt-0.5">Currently active</p>
                  )}
                </div>

                {n.is_active ? (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelect(n.id)}
                    disabled={!!selecting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary hover:text-primary disabled:opacity-50 transition-all flex items-center gap-1"
                  >
                    {selecting === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Use This
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Booking history ─────────────────────────────────────────────────────────

function ShiftHistoryPanel({ shifts }: { shifts: Shift[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No shifts in the last 60 days</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h2 className="text-sm font-bold text-foreground">Booking History</h2>
        <p className="text-xs text-muted-foreground">Last 60 days</p>
      </div>

      <div className="divide-y divide-border/50">
        {shifts.map(shift => {
          const isOpen = expanded === shift.id;
          const fmtDate = new Date(shift.shift_date + "T12:00:00").toLocaleDateString([], {
            weekday: "short", month: "short", day: "numeric",
          });
          const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

          return (
            <div key={shift.id}>
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isOpen ? null : shift.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
              >
                {/* Date */}
                <div className="shrink-0 w-14 text-center">
                  <p className="text-xs font-bold text-foreground">{fmtDate.split(",")[0]}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate.split(",")[1]?.trim()}</p>
                </div>

                {/* Net */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${shift.net >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {shift.net >= 0 ? `+$${shift.net.toFixed(2)}` : `-$${Math.abs(shift.net).toFixed(2)}`}
                    </span>
                    {shift.early_leave_fine > 0 && !shift.fine_waived && (
                      <span className="text-[10px] text-orange-500 font-medium">Early leave fine</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Earned ${shift.room_earnings.toFixed(2)} · Fees ${(shift.entrance_fee + (shift.fine_waived ? 0 : shift.early_leave_fine)).toFixed(2)}
                  </p>
                </div>

                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-5 pb-4 bg-secondary/20 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <DetailRow label="Clock In"  value={fmtTime(shift.clock_in)} />
                    <DetailRow label="Clock Out" value={shift.clock_out ? fmtTime(shift.clock_out) : "Still in"} />
                    <DetailRow label="House Fee" value={`$${shift.entrance_fee.toFixed(2)}`} negative />
                    <DetailRow label="Room Earnings" value={`$${shift.room_earnings.toFixed(2)}`} positive />
                    {shift.early_leave_fine > 0 && (
                      <DetailRow
                        label="Early Leave Fine"
                        value={shift.fine_waived ? "Waived" : `-$${shift.early_leave_fine.toFixed(2)}`}
                        negative={!shift.fine_waived}
                        neutral={shift.fine_waived}
                      />
                    )}
                  </div>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-sm
                    ${shift.net >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    <span>{shift.net >= 0 ? "Club owes you" : "You owe club"}</span>
                    <span>${Math.abs(shift.net).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ label, value, positive, negative, neutral }: {
  label: string; value: string; positive?: boolean; negative?: boolean; neutral?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold
        ${positive ? "text-green-600" : negative ? "text-red-500" : neutral ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
