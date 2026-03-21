import { useState, useCallback } from "react";
import { UserPlus, UserCheck, UserX, ShieldCheck, ShieldX, Hand, Loader2 } from "lucide-react";
import CameraIDScanner from "@/components/CameraIDScanner";
import { useGuestCheckIn, useClubSettings } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GuestLogEntry {
  time: string;
  hash: string;
  status: "new" | "returning" | "manual" | "denied";
  visitCount?: number;
}

interface CustomerEntryTabProps {
  onNewGuest: () => void;
}

export default function CustomerEntryTab({ onNewGuest }: CustomerEntryTabProps) {
  const [guestLog, setGuestLog] = useState<GuestLogEntry[]>([]);
  const { manualAdd, scanAdd } = useGuestCheckIn();
  const { data: settings } = useClubSettings();

  const doorFee = Number(settings?.default_door_fee ?? 20);
  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  const handleScanEntry = useCallback(
    async (result: { hash: string; denied: boolean; isReturning: boolean; visitCount?: number; fullName?: string | null; address?: string | null }) => {
      if (result.denied) {
        setGuestLog((prev) => [{ time: now(), hash: "", status: "denied" }, ...prev].slice(0, 8));
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      try {
        const data = await scanAdd.mutateAsync({
          dlHash: result.hash,
          displayId: result.hash.slice(0, 8).toUpperCase(),
          doorFee,
          loggedBy: userId,
          fullName: result.fullName ?? undefined,
          address: result.address ?? undefined,
        });

        onNewGuest();
        setGuestLog((prev) => [
          {
            time: now(),
            hash: `#${result.hash.slice(0, 8).toUpperCase()}`,
            status: data.isReturning ? "returning" : "new",
            visitCount: data.visitCount,
          },
          ...prev,
        ].slice(0, 8));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("scanAdd failed:", msg);
        toast.error("Entry failed: " + msg);
      }
    },
    [scanAdd, doorFee, onNewGuest]
  );

  const handleManualAdd = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    try {
      await manualAdd.mutateAsync({ doorFee, loggedBy: userId });
      onNewGuest();
      setGuestLog((prev) => [{ time: now(), hash: "", status: "manual" }, ...prev].slice(0, 8));
    } catch {
      // silent — UI still shows
    }
  }, [manualAdd, doorFee, onNewGuest]);

  const isPending = scanAdd.isPending || manualAdd.isPending;

  return (
    <div className="space-y-4">
      {/* Camera Scanner */}
      <div className="glass-card p-6">
        <CameraIDScanner onEntry={handleScanEntry} />

        <button
          onClick={handleManualAdd}
          disabled={isPending}
          className="w-full touch-target border border-border rounded-xl font-medium flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all mt-3 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Skip Scan — Manual Add + ${doorFee}
        </button>
      </div>

      {/* Recent Guest Log */}
      <div className="glass-card p-5">
        <h3 className="font-heading text-xl tracking-wide text-muted-foreground mb-4">Recent Guest Log</h3>
        {guestLog.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No entries logged yet this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-left">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Guest ID</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Entry</th>
                </tr>
              </thead>
              <tbody>
                {guestLog.map((entry, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border/20 last:border-0 ${entry.status === "denied" ? "text-destructive/80" : ""}`}
                  >
                    <td className="py-2.5 pr-3 text-muted-foreground">{entry.time}</td>
                    <td className="py-2.5 pr-3 font-mono text-foreground/80">
                      {entry.status === "manual" ? "Manual" : entry.status === "denied" ? "—" : entry.hash}
                    </td>
                    <td className="py-2.5 pr-3">
                      {entry.status === "new" && (
                        <span className="text-foreground flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-primary" /> New Guest
                        </span>
                      )}
                      {entry.status === "returning" && (
                        <span className="text-primary flex items-center gap-1">
                          <Hand className="w-3.5 h-3.5" /> Returning (Visit {entry.visitCount})
                        </span>
                      )}
                      {entry.status === "manual" && <span className="text-muted-foreground">Manual Add</span>}
                      {entry.status === "denied" && (
                        <span className="text-destructive flex items-center gap-1">
                          <ShieldX className="w-3.5 h-3.5" /> Underage
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {entry.status === "denied" ? (
                        <span className="text-destructive font-medium flex items-center justify-end gap-1">
                          <UserX className="w-3.5 h-3.5" /> Denied
                        </span>
                      ) : (
                        <span className="text-success font-medium flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> ${doorFee}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
