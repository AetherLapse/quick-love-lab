import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { MOCK_DANCER_REPORT } from "@/components/door/doorMockData";

interface DancerReportProps {
  period: string;
  custom?: unknown;
}

export default function DancerReport(_props: DancerReportProps) {
  const rows = MOCK_DANCER_REPORT;

  if (rows.length === 0) {
    return <div className="py-10 text-center text-muted-foreground">No dancer activity for this period.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Dancer</th>
              <th className="px-3 py-3">Check-In</th>
              <th className="px-3 py-3 text-right">House</th>
              <th className="px-3 py-3 text-right">Music</th>
              <th className="px-3 py-3 text-right">Late</th>
              <th className="px-3 py-3 text-right">Dances</th>
              <th className="px-3 py-3 text-right font-bold">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((r) => (
              <tr key={r.dancerId} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-semibold">
                  {r.stageName}
                  {r.isLate && (
                    <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-600 font-bold px-1.5 py-0.5 rounded">LATE</span>
                  )}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.checkIn}
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-destructive/80">${r.houseFee}</td>
                <td className="px-3 py-3 text-right text-destructive/80">${r.musicFee}</td>
                <td className="px-3 py-3 text-right text-amber-600">
                  {r.lateFee > 0 ? `$${r.lateFee}` : "—"}
                </td>
                <td className="px-3 py-3 text-right text-primary font-semibold">${r.earnings}</td>
                <td className={`px-3 py-3 text-right font-bold ${r.net >= 0 ? "text-green-600" : "text-destructive"}`}>
                  <div className="flex items-center justify-end gap-1">
                    {r.net >= 0
                      ? <><CheckCircle className="w-3.5 h-3.5" /> Pay ${r.net}</>
                      : <><AlertCircle className="w-3.5 h-3.5" /> Owes ${Math.abs(r.net)}</>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      <div className="glass-card p-4 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Dancers: </span>
          <span className="font-bold">{rows.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Earnings: </span>
          <span className="font-bold text-primary">${rows.reduce((s, r) => s + r.earnings, 0)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Fees Collected: </span>
          <span className="font-bold">${rows.reduce((s, r) => s + r.houseFee + r.musicFee + r.lateFee, 0)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Owing Club: </span>
          <span className="font-bold text-destructive">
            ${rows.filter((r) => r.net < 0).reduce((s, r) => s + Math.abs(r.net), 0)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">To Pay Out: </span>
          <span className="font-bold text-green-600">
            ${rows.filter((r) => r.net > 0).reduce((s, r) => s + r.net, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
