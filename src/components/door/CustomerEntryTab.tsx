import { useState, useCallback } from "react";
import { UserPlus, UserCheck, UserX, ShieldCheck, ShieldX, Hand } from "lucide-react";
import CameraIDScanner from "@/components/CameraIDScanner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GuestLogEntry {
  time: string;
  hash: string;
  status: "new" | "returning" | "manual" | "denied";
  visitCount?: number;
}

const initialLog: GuestLogEntry[] = [
  { time: "11:05 PM", hash: "#c2e8a1f4", status: "new" },
  { time: "10:52 PM", hash: "#7b3d9e12", status: "returning", visitCount: 3 },
  { time: "10:45 PM", hash: "#1a4f82c9", status: "new" },
  { time: "10:30 PM", hash: "", status: "manual" },
  { time: "10:15 PM", hash: "", status: "denied" },
];

interface CustomerEntryTabProps {
  onNewGuest: () => void;
}

export default function CustomerEntryTab({ onNewGuest }: CustomerEntryTabProps) {
  const [guestLog, setGuestLog] = useState<GuestLogEntry[]>(initialLog);

  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const handleScanEntry = useCallback(
    (result: { hash: string; denied: boolean; isReturning: boolean; visitCount?: number }) => {
      if (result.denied) {
        setGuestLog((prev) => [{ time: now(), hash: "", status: "denied" as const }, ...prev].slice(0, 8));
        return;
      }
      onNewGuest();
      const status = result.isReturning ? "returning" as const : "new" as const;
      setGuestLog((prev) =>
        [
          {
            time: now(),
            hash: `#${result.hash}`,
            status,
            visitCount: result.visitCount,
          },
          ...prev,
        ].slice(0, 8)
      );
    },
    [onNewGuest]
  );

  const handleManualAdd = useCallback(() => {
    onNewGuest();
    setGuestLog((prev) => [{ time: now(), hash: "", status: "manual" as const }, ...prev].slice(0, 8));
  }, [onNewGuest]);

  return (
    <div className="space-y-4">
      {/* Camera Scanner */}
      <div className="glass-card p-6">
        <CameraIDScanner onEntry={handleScanEntry} />

        {/* Manual Add */}
        <button
          onClick={handleManualAdd}
          className="w-full touch-target border border-border rounded-xl font-medium flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all mt-3"
        >
          <UserPlus className="w-4 h-4" />
          Skip Scan — Manual Add + $20
        </button>
      </div>

      {/* Recent Guest Log */}
      <div className="glass-card p-5">
        <h3 className="font-heading text-xl tracking-wide text-muted-foreground mb-4">Recent Guest Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-left">
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">User ID</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Entry</th>
              </tr>
            </thead>
            <tbody>
              {guestLog.map((entry, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/20 last:border-0 ${
                    entry.status === "denied" ? "text-destructive/80" : ""
                  }`}
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
                    {entry.status === "manual" && <span className="text-muted-foreground">—</span>}
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
                        <ShieldCheck className="w-3.5 h-3.5" /> $20
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
