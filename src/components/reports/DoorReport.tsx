import { MOCK_TIER_BREAKDOWN, MOCK_DOOR_DETAIL } from "@/components/door/doorMockData";

const TIER_LABELS: Record<string, string> = {
  full_cover:  "Full Cover",
  reduced:     "Reduced Cover",
  vip:         "VIP",
  ccc_card:    "CCC Card",
  two_for_one: "2-for-1 Card",
};

const TIER_PRICE: Record<string, string> = {
  full_cover:  "$10",
  reduced:     "$5",
  vip:         "Free",
  ccc_card:    "Free",
  two_for_one: "$10 / 2 people",
};

interface DoorReportProps {
  period: string;
  custom?: unknown;
}

export default function DoorReport(_props: DoorReportProps) {
  const tierRows = MOCK_TIER_BREAKDOWN;
  const detailRows = MOCK_DOOR_DETAIL;
  const totalRevenue = tierRows.reduce((s, r) => s + r.revenue, 0);
  const totalGuests  = tierRows.reduce((s, r) => s + r.count,   0);

  return (
    <div className="space-y-4">
      {/* Tier Breakdown */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Tier</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3 text-right">Guests</th>
              <th className="px-3 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {tierRows.map((r) => (
              <tr key={r.tier} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-semibold">{r.label}</td>
                <td className="px-3 py-3 text-muted-foreground">{TIER_PRICE[r.tier] ?? "—"}</td>
                <td className="px-3 py-3 text-right">{r.count}</td>
                <td className="px-3 py-3 text-right font-bold text-primary">
                  {r.revenue > 0 ? `$${r.revenue}` : "—"}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-bold">
              <td className="px-4 py-3">TOTAL</td>
              <td />
              <td className="px-3 py-3 text-right">{totalGuests}</td>
              <td className="px-3 py-3 text-right text-green-600">${totalRevenue}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detailed Entry Log */}
      <details className="glass-card p-1">
        <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:text-primary transition-colors">
          Detailed Entry Log ({detailRows.length} entries)
        </summary>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border/50">
                <th className="pb-2 pr-3">Time</th>
                <th className="pb-2 pr-3">Tier</th>
                <th className="pb-2 pr-3 text-right">Party</th>
                <th className="pb-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((r, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  <td className="py-1.5 pr-3 text-muted-foreground">{r.time}</td>
                  <td className="py-1.5 pr-3">{TIER_LABELS[r.tier] ?? r.tier}</td>
                  <td className="py-1.5 pr-3 text-right">{r.partySize}</td>
                  <td className="py-1.5 text-right font-medium">
                    {r.revenue > 0 ? `$${r.revenue}` : "Free"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
