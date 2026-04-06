import { Monitor, Tablet, Smartphone, RefreshCw, Wifi, WifiOff, Lock, LockOpen, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveKiosks, useSetKioskStatus, type KioskSession } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { PanelStack } from "./DraggablePanels";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/door":      "Door Panel",
  "/stage":     "Stage",
  "/floor":     "House Mom",
  "/dancers":   "Dancers",
  "/reports":   "Reports",
  "/settings":  "Settings",
  "/kiosks":    "Kiosks",
};

const ROLE_LABELS: Record<string, string> = {
  admin:          "Owner / Admin",
  owner:          "Owner / Admin",
  manager:        "Manager",
  door_staff:     "Door Staff",
  room_attendant: "Room Attendant",
  house_mom:      "House Mom",
};

const ROLE_COLORS: Record<string, string> = {
  admin:          "bg-purple-100 text-purple-700",
  owner:          "bg-purple-100 text-purple-700",
  manager:        "bg-blue-100 text-blue-700",
  door_staff:     "bg-amber-100 text-amber-700",
  room_attendant: "bg-green-100 text-green-700",
  house_mom:      "bg-pink-100 text-pink-700",
};

function detectDevice(ua: string): { label: string; Icon: React.ElementType } {
  if (/iPad/.test(ua))                          return { label: "iPad",           Icon: Tablet };
  if (/iPhone/.test(ua))                        return { label: "iPhone",         Icon: Smartphone };
  if (/Android/.test(ua) && /Mobile/.test(ua))  return { label: "Android Phone",  Icon: Smartphone };
  if (/Android/.test(ua))                       return { label: "Android Tablet", Icon: Tablet };
  return                                               { label: "Desktop",         Icon: Monitor };
}

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 10)  return "just now";
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 120) return "1 min ago";
  return `${Math.floor(secs / 60)} min ago`;
}

function sessionDuration(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

// ── Kiosk card ────────────────────────────────────────────────────────────────

function KioskCard({ session, canManage }: { session: KioskSession; canManage: boolean }) {
  const secsAgo  = Math.floor((Date.now() - new Date(session.last_seen).getTime()) / 1000);
  const isOnline = secsAgo < 45;
  const isRecent = secsAgo < 90;
  const isLocked = session.status === "locked";

  const { label: deviceLabel, Icon: DeviceIcon } = detectDevice(session.user_agent ?? "");
  const screenLabel = PATH_LABELS[session.path ?? ""] ?? session.path ?? "Unknown";
  const roleLabel   = ROLE_LABELS[session.role ?? ""] ?? session.role ?? "Unknown";
  const roleColor   = ROLE_COLORS[session.role ?? ""] ?? "bg-secondary text-muted-foreground";

  const { mutate: setStatus, isPending } = useSetKioskStatus();

  const toggleLock = () => setStatus({ id: session.id, status: isLocked ? "active" : "locked" });

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
      isLocked        ? "border-red-200 bg-red-50/30"  :
      isOnline        ? "border-green-200"              :
      isRecent        ? "border-amber-200"              : "border-border"
    }`}>
      <div className="flex items-center gap-4">
        {/* Status + device icon */}
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLocked ? "bg-red-100"    :
            isOnline ? "bg-green-50"   :
            isRecent ? "bg-amber-50"   : "bg-secondary"
          }`}>
            <DeviceIcon className={`w-6 h-6 ${
              isLocked ? "text-red-500"          :
              isOnline ? "text-green-600"         :
              isRecent ? "text-amber-500"         : "text-muted-foreground"
            }`} />
          </div>
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
            isLocked ? "bg-red-500"           :
            isOnline ? "bg-green-500"          :
            isRecent ? "bg-amber-400"          : "bg-muted-foreground"
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{deviceLabel}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
            {isLocked && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Screen: <span className="font-medium text-foreground">{screenLabel}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Session: {sessionDuration(session.created_at)}
            {isLocked && session.locked_at && (
              <span className="ml-2 text-red-500">· Locked {relativeTime(session.locked_at)}</span>
            )}
          </p>
        </div>

        {/* Right — status + action */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isLocked ? "text-red-500"  :
            isOnline ? "text-green-600" :
            isRecent ? "text-amber-500" : "text-muted-foreground"
          }`}>
            {isLocked
              ? <><Lock className="w-3 h-3" /> Locked</>
              : isOnline
                ? <><Wifi className="w-3 h-3" /> Online</>
                : <><WifiOff className="w-3 h-3" /> {isRecent ? "Recent" : "Offline"}</>
            }
          </div>
          <p className="text-[11px] text-muted-foreground">{relativeTime(session.last_seen)}</p>

          {canManage && (
            <button
              onClick={toggleLock}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                isLocked
                  ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                  : "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
              }`}
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isLocked ? (
                <><LockOpen className="w-3 h-3" /> Unlock</>
              ) : (
                <><Lock className="w-3 h-3" /> Lock</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function KiosksTab() {
  const { data: kiosks = [], isLoading, refetch } = useActiveKiosks();
  const { role } = useAuth();
  const qc = useQueryClient();

  const canManage = role === "admin" || role === "owner";

  const online = kiosks.filter(k => (Date.now() - new Date(k.last_seen).getTime()) < 45_000);
  const locked = kiosks.filter(k => k.status === "locked");

  const byRole = kiosks.reduce<Record<string, number>>((acc, k) => {
    const r = k.role ?? "unknown";
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["kiosk_sessions"] });
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Active Kiosks</h2>
          <p className="text-sm text-muted-foreground">
            Screens connected to 2NYT · updates every 30s
            {!canManage && <span className="ml-1 text-muted-foreground/60">· view only</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <PanelStack storageKey="kiosks" panels={[
        {
          id: "kpis", label: "Summary",
          node: (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Active",  value: kiosks.length,              color: "text-foreground" },
                { label: "Online",        value: online.length,              color: "text-green-600"  },
                { label: "Locked",        value: locked.length,              color: locked.length > 0 ? "text-red-500" : "text-muted-foreground" },
                { label: "Roles Active",  value: Object.keys(byRole).length, color: "text-foreground" },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-xl border border-border px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: "list", label: "Connected Screens",
          node: isLoading ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : kiosks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <WifiOff className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No active screens detected</p>
              <p className="text-xs text-muted-foreground mt-1">Screens appear here once they load the app</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kiosks.map(k => (
                <KioskCard key={k.id} session={k} canManage={canManage} />
              ))}
            </div>
          ),
        },
      ]} />
    </div>
  );
}
