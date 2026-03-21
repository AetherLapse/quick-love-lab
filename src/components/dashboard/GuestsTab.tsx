import { useState, useMemo } from "react";
import {
  Users, UserCheck, UserPlus, Search, RefreshCw, Clock,
  QrCode, PenLine, ChevronDown, ChevronRight, Flag, FlagOff,
  StickyNote, Check, X, Eye, EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGuestVisits, useCustomerEntries, useGuests, useUpdateGuest,
  useGuestVisitHistory, today,
} from "@/hooks/useDashboardData";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubView = "live" | "directory";

interface GuestRow {
  id: string;
  dl_hash: string;
  guest_display_id: string;
  visit_count: number;
  is_returning: boolean;
  first_visit_date: string;
  last_visit_date: string;
  created_at: string;
  full_name?: string | null;
  address?: string | null;
  notes?: string | null;
  flagged?: boolean;
  flagged_reason?: string | null;
}

// ─── Masking helpers ──────────────────────────────────────────────────────────

function maskWord(word: string): string {
  if (word.length <= 2) return word;
  const visible = Math.max(2, Math.floor(word.length / 3));
  return word.slice(0, visible) + "*".repeat(word.length - visible);
}

function maskName(name: string): string {
  return name.split(/\s+/).map(maskWord).join(" ");
}

function maskText(text: string): string {
  if (!text) return "";
  const words = text.split(/\s+/);
  // Show first word partially, rest masked
  const preview = words.slice(0, 3).map(maskWord).join(" ");
  return words.length > 3 ? `${preview} ***` : preview;
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString([], {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Expandable guest profile row ─────────────────────────────────────────────

function GuestProfileRow({ guest }: { guest: GuestRow }) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { data: visitHistory = [], isLoading: loadingHistory } = useGuestVisitHistory(
    expanded ? guest.id : null
  );
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(guest.notes ?? "");
  const [flagReason, setFlagReason] = useState(guest.flagged_reason ?? "");
  const [showFlagInput, setShowFlagInput] = useState(false);
  const update = useUpdateGuest();

  // Auto-hide after 10 seconds when revealed
  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealed((r) => {
      if (!r) setTimeout(() => setRevealed(false), 10000);
      return !r;
    });
  };

  const saveNotes = async () => {
    try {
      await update.mutateAsync({ id: guest.id, notes: notesDraft || null });
      setEditingNotes(false);
      toast.success("Notes saved.");
    } catch { toast.error("Failed to save notes."); }
  };

  const toggleFlag = async () => {
    if (!guest.flagged) {
      setShowFlagInput(true);
    } else {
      try {
        await update.mutateAsync({ id: guest.id, flagged: false, flagged_reason: null });
        setShowFlagInput(false);
        setFlagReason("");
        toast.success("Flag removed.");
      } catch { toast.error("Failed to update flag."); }
    }
  };

  const saveFlag = async () => {
    try {
      await update.mutateAsync({ id: guest.id, flagged: true, flagged_reason: flagReason || null });
      setShowFlagInput(false);
      toast.success("Guest flagged.");
    } catch { toast.error("Failed to flag guest."); }
  };

  return (
    <div className={`border-b border-border last:border-0 transition-colors ${guest.flagged ? "bg-destructive/5" : ""}`}>
      {/* Main row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        <div className="flex-1 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4">
          {/* Name / ID */}
          <div>
            {guest.full_name ? (
              <p className={`text-sm font-medium text-foreground font-mono tracking-wide ${revealed ? "text-primary" : ""}`}>
                {revealed ? guest.full_name : maskName(guest.full_name)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">{guest.guest_display_id}</p>
            )}
            <p className="text-xs text-muted-foreground font-mono">{guest.guest_display_id}</p>
          </div>

          {/* Status badge */}
          <div className="hidden sm:block">
            {guest.is_returning ? (
              <Badge variant="outline" className="text-xs border-primary/40 text-primary py-0">
                <UserCheck className="w-3 h-3 mr-1" /> Returning
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground py-0">
                <UserPlus className="w-3 h-3 mr-1" /> New
              </Badge>
            )}
          </div>

          {/* Visit count */}
          <span className="text-sm font-semibold text-foreground w-12 text-right">
            {guest.visit_count}x
          </span>

          {/* Last visit */}
          <span className="text-xs text-muted-foreground hidden md:block w-28 text-right">
            {fmtDate(guest.last_visit_date)}
          </span>

          {/* Flag indicator */}
          <div className="w-5">
            {guest.flagged && <Flag className="w-4 h-4 text-destructive" />}
          </div>

          {/* Eye button — stops propagation so it doesn't toggle expand */}
          <button
            onClick={handleReveal}
            title={revealed ? "Hide details" : "Reveal details"}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              revealed
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 bg-secondary/10 border-t border-border/50">
          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Guest ID</p>
              <p className="font-mono text-foreground text-xs">{guest.guest_display_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Total Visits</p>
              <p className="font-semibold text-foreground">{guest.visit_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">First Visit</p>
              <p className="text-foreground text-xs">{fmtDate(guest.first_visit_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Last Visit</p>
              <p className="text-foreground text-xs">{fmtDate(guest.last_visit_date)}</p>
            </div>
            {guest.full_name && (
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</p>
                  {revealed && <span className="text-xs text-primary font-medium">· Revealed</span>}
                </div>
                <p className={`font-mono tracking-widest ${revealed ? "text-primary font-semibold" : "text-foreground"}`}>
                  {revealed ? guest.full_name : maskName(guest.full_name)}
                </p>
              </div>
            )}
            {guest.address && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                <p className={`text-sm ${revealed ? "text-primary font-medium" : "text-foreground font-mono"}`}>
                  {revealed ? guest.address : maskText(guest.address)}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Staff Notes
              </p>
              {!editingNotes && (
                <button
                  onClick={() => { setNotesDraft(guest.notes ?? ""); setEditingNotes(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add relevant notes (stored securely, available for official records)…"
                  className="bg-secondary text-sm resize-none h-20"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNotes} disabled={update.isPending} className="gap-1">
                    <Check className="w-3.5 h-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`text-sm bg-secondary/40 rounded-lg px-3 py-2 min-h-[38px] ${revealed ? "text-primary" : "text-foreground"}`}>
                {guest.notes
                  ? (revealed ? guest.notes : maskText(guest.notes))
                  : <span className="text-muted-foreground italic text-xs">No notes</span>}
              </p>
            )}
          </div>

          {/* Flag section */}
          <div className="flex items-start gap-3 flex-wrap">
            <button
              onClick={toggleFlag}
              disabled={update.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                guest.flagged
                  ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-warning/50 hover:text-warning"
              }`}
            >
              {guest.flagged
                ? <><FlagOff className="w-3.5 h-3.5" /> Remove Flag</>
                : <><Flag className="w-3.5 h-3.5" /> Flag for Investigation</>}
            </button>

            {guest.flagged && guest.flagged_reason && (
              <div className="text-xs text-destructive/80 flex items-center gap-1">
                <Flag className="w-3 h-3" />
                <span>{revealed ? guest.flagged_reason : maskText(guest.flagged_reason)}</span>
              </div>
            )}
          </div>

          {/* Visit history table — always visible when expanded */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Visit History
            </p>
            {loadingHistory ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : visitHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No visits recorded</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">#</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Entry</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Exit</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(visitHistory as Array<{
                      id: string;
                      entry_time: string;
                      exit_time?: string | null;
                      door_fee: number;
                      shift_date: string;
                    }>).map((v, i) => (
                      <tr key={v.id} className="hover:bg-secondary/20">
                        <td className="px-3 py-2 text-muted-foreground">{visitHistory.length - i}</td>
                        <td className="px-3 py-2 text-foreground">
                          {new Date(v.shift_date + "T00:00:00").toLocaleDateString([], {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2 font-mono text-foreground">
                          {revealed
                            ? new Date(v.entry_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                            : new Date(v.entry_time).toLocaleTimeString([], { hour: "numeric" }).replace(/\d/g, "*")}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {v.exit_time
                            ? revealed
                              ? new Date(v.exit_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                              : new Date(v.exit_time).toLocaleTimeString([], { hour: "numeric" }).replace(/\d/g, "*")
                            : <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-success font-medium">${v.door_fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Flag reason input */}
          {showFlagInput && (
            <div className="space-y-2">
              <Input
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Reason for flagging (optional, stored securely)…"
                className="bg-secondary text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveFlag} disabled={update.isPending} className="gap-1 bg-destructive hover:bg-destructive/90">
                  <Flag className="w-3.5 h-3.5" /> Confirm Flag
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowFlagInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function GuestsTab() {
  const [subView, setSubView] = useState<SubView>("live");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const todayStr = today();
  const { data: guestVisits = [], isLoading: loadingVisits } = useGuestVisits(todayStr, todayStr);
  const { data: manualEntries = [], isLoading: loadingManual } = useCustomerEntries(todayStr, todayStr);
  const { data: allGuests = [], isLoading: loadingDirectory } = useGuests(search);

  const todayEntries = useMemo(() => {
    const scanned = guestVisits.map((v) => ({
      id: v.id,
      time: v.entry_time,
      type: "scanned" as const,
      fee: Number(v.door_fee),
      displayId: `#${v.guest_id.slice(0, 8).toUpperCase()}`,
      isReturning: (v.guests as { is_returning: boolean } | null)?.is_returning ?? false,
      visitCount: (v.guests as { visit_count: number } | null)?.visit_count ?? 1,
    }));
    const manual = manualEntries.map((e) => ({
      id: e.id,
      time: e.entry_time,
      type: "manual" as const,
      fee: Number(e.door_fee),
      displayId: "Manual",
      isReturning: false,
      visitCount: null as number | null,
    }));
    return [...scanned, ...manual].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [guestVisits, manualEntries]);

  const totalToday = todayEntries.length;
  const returningToday = todayEntries.filter((e) => e.isReturning).length;
  const newToday = todayEntries.filter((e) => !e.isReturning && e.type === "scanned").length;
  const doorRevenue = todayEntries.reduce((s, e) => s + e.fee, 0);
  const flaggedCount = (allGuests as GuestRow[]).filter((g) => g.flagged).length;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["guest_visits"] });
    qc.invalidateQueries({ queryKey: ["customer_entries"] });
    qc.invalidateQueries({ queryKey: ["guests"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading text-foreground">Guests</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tonight's attendance & guest records
            {flaggedCount > 0 && (
              <span className="ml-2 text-destructive font-medium">
                · {flaggedCount} flagged
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">In Tonight</p>
          <p className="text-3xl font-bold text-foreground font-heading">{totalToday}</p>
          <p className="text-xs text-muted-foreground">Current shift</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Returning</p>
          <p className="text-3xl font-bold text-primary font-heading">{returningToday}</p>
          <p className="text-xs text-muted-foreground">Recognized IDs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">New Guests</p>
          <p className="text-3xl font-bold text-foreground font-heading">{newToday}</p>
          <p className="text-xs text-muted-foreground">First visit</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Door Revenue</p>
          <p className="text-3xl font-bold text-success font-heading">${doorRevenue}</p>
          <p className="text-xs text-muted-foreground">Tonight total</p>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-secondary/40 rounded-xl p-1 w-fit">
        {(["live", "directory"] as SubView[]).map((v) => (
          <button
            key={v}
            onClick={() => setSubView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subView === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "live" ? "Tonight's Log" : "Guest Directory"}
          </button>
        ))}
      </div>

      {/* LIVE — Tonight's entry log */}
      {subView === "live" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-foreground">Live Entry Log</span>
            </div>
            <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
          </div>

          {loadingVisits || loadingManual ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : todayEntries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">No guests logged yet tonight</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.type === "scanned" ? "bg-primary/10" : "bg-secondary"
                    }`}>
                      {entry.type === "scanned"
                        ? <QrCode className="w-4 h-4 text-primary" />
                        : <PenLine className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground">{entry.displayId}</span>
                        {entry.isReturning && (
                          <Badge variant="outline" className="text-xs py-0 border-primary/40 text-primary">
                            Returning · #{entry.visitCount}
                          </Badge>
                        )}
                        {entry.type === "scanned" && !entry.isReturning && (
                          <Badge variant="outline" className="text-xs py-0 border-success/40 text-success">New</Badge>
                        )}
                        {entry.type === "manual" && (
                          <Badge variant="outline" className="text-xs py-0 text-muted-foreground">Manual</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" /> {fmt(entry.time)}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-success">${entry.fee}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DIRECTORY — Expandable guest profiles */}
      {subView === "directory" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Guest ID…"
                className="pl-9 bg-secondary"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30 grid grid-cols-[1rem_1fr_auto_auto_auto_auto] gap-4 items-center">
              <span />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Guest</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:block">Status</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Visits</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:block text-right">Last Seen</span>
              <span className="w-5" />
            </div>

            {loadingDirectory ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : allGuests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <UserCheck className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  {search ? "No guests match that ID" : "No registered guests yet"}
                </p>
              </div>
            ) : (
              <div>
                {(allGuests as GuestRow[]).map((g) => (
                  <GuestProfileRow key={g.id} guest={g} />
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            All names and details are masked for privacy. Full records are available for authorized official requests.
          </p>
        </div>
      )}
    </div>
  );
}
