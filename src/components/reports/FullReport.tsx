import { Lock } from "lucide-react";
import { MOCK_FULL_REPORT } from "@/components/door/doorMockData";

interface FullReportProps {
  period: string;
  custom?: unknown;
  isOwner: boolean;
}

export default function FullReport({ isOwner }: FullReportProps) {
  const data = MOCK_FULL_REPORT;

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="font-bold text-lg">Owner Access Only</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          The Full Report contains complete financials including commission data. Only the venue owner can view this report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Financial overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Door Revenue",   value: `$${data.doorRevenue}`,   color: "text-blue-600" },
          { label: "Room Revenue",   value: `$${data.roomRevenue}`,   color: "text-purple-600" },
          { label: "House Net",      value: `$${data.houseNet}`,      color: "text-green-600" },
          { label: "Dancer Payouts", value: `$${data.dancerPayouts}`, color: "text-amber-600" },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
            <p className={`text-2xl font-extrabold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Guest & dancer activity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Guests",   value: data.totalGuests },
          { label: "Returning %",    value: `${data.returningPct}%` },
          { label: "Room Sessions",  value: data.roomSessionCount },
          { label: "Active Dancers", value: data.activeDancerCount },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-2xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Commission tracking */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          2-for-1 Distributor Commission Tracking
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase tracking-wider border-b border-border/50">
                <th className="pb-2 pr-4">Distributor</th>
                <th className="pb-2 pr-4 text-right">Rate</th>
                <th className="pb-2 pr-4 text-right">Cards</th>
                <th className="pb-2 text-right">Owed</th>
              </tr>
            </thead>
            <tbody>
              {data.commissions.map((c) => (
                <tr key={c.name} className="border-b border-border/20 last:border-0">
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="py-2 pr-4 text-right text-muted-foreground">{c.rate}%</td>
                  <td className="py-2 pr-4 text-right">{c.cards}</td>
                  <td className="py-2 text-right font-bold text-amber-600">${c.owed}</td>
                </tr>
              ))}
              <tr className="font-bold border-t border-border/50">
                <td className="py-2 pr-4">TOTAL</td>
                <td />
                <td className="py-2 pr-4 text-right">{data.commissions.reduce((s, c) => s + c.cards, 0)}</td>
                <td className="py-2 text-right text-amber-600">
                  ${data.commissions.reduce((s, c) => s + c.owed, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
