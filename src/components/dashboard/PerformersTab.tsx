import { useState, useMemo } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { type Period } from "./mockData";
import { DateFilter } from "./DateFilter";
import { useDancerPerformance, useDancers, today } from "@/hooks/useDashboardData";

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSIC_FEE = 20; // fixed music fee per night

// ─── Dancer financial card ────────────────────────────────────────────────────

interface DancerCardProps {
  name: string;
  checkIn: string | null;
  isLate: boolean;
  houseFee: number;
  danceRevenue: number;
  outstandingBalance: number;   // carried over from previous nights
  sessions: { time: string; songs: number; amount: number }[];
}

function DancerCard({ name, checkIn, isLate, houseFee, danceRevenue, outstandingBalance, sessions }: DancerCardProps) {
  const [open, setOpen] = useState(false);

  const lateFee      = isLate ? 10 : 0;
  const effectiveHouseFee = houseFee + lateFee; // late bumps house fee from 30→50 but stored separately
  const totalFees    = effectiveHouseFee + MUSIC_FEE;
  const netPayout    = danceRevenue - totalFees;
  const owes         = Math.max(0, -netPayout) + outstandingBalance;
  const toPay        = Math.max(0, netPayout);

  const paid   = owes === 0;
  const status = paid ? "paid" : "owes";

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
      status === "owes" ? "border-red-200" : "border-green-200"
    }`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Status dot */}
        <span className={`w-3 h-3 rounded-full shrink-0 ${status === "paid" ? "bg-green-500" : "bg-red-500"}`} />

        {/* Name + time */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-base leading-none">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Arrival: {checkIn ?? "—"}
            {isLate && <span className="ml-2 text-orange-500 font-semibold">LATE +$10</span>}
            {outstandingBalance > 0 && (
              <span className="ml-2 text-red-500 font-semibold">Owes ${outstandingBalance} from prev.</span>
            )}
          </p>
        </div>

        {/* Summary */}
        <div className="text-right shrink-0">
          {status === "paid" ? (
            <div>
              <p className="text-xs text-muted-foreground">Pay Dancer</p>
              <p className="font-bold text-green-600 text-lg">${toPay}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground">Dancer Owes</p>
              <p className="font-bold text-red-500 text-lg">${owes}</p>
            </div>
          )}
        </div>

        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-border/50 px-5 py-4 space-y-4">
          {/* Sessions */}
          {sessions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Dances</p>
              <div className="space-y-1">
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground w-14">{s.time}</span>
                    <span className="flex-1 text-foreground">{s.songs} song{s.songs !== 1 ? "s" : ""}</span>
                    <span className="font-semibold text-foreground">${s.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial breakdown */}
          <div className="bg-secondary/40 rounded-xl p-4 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Detailed Report</p>

            <div className="flex justify-between">
              <span className="text-muted-foreground">House Fee</span>
              <span className="text-foreground font-medium">${effectiveHouseFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Music Fee</span>
              <span className="text-foreground font-medium">${MUSIC_FEE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dances</span>
              <span className="text-foreground font-medium">${danceRevenue}</span>
            </div>

            <div className="border-t border-border pt-2 space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total to Pay Dancer</span>
                <span className={`text-base px-2 py-0.5 rounded-lg ${toPay > 0 ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>
                  ${toPay}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total Dancer Owes</span>
                <span className={`text-base px-2 py-0.5 rounded-lg ${owes > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                  ${owes}
                </span>
              </div>
            </div>

            {owes > 0 && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">
                  Balance carries forward. Dancer will be notified at next login.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function PerformersTab() {
  const [activePeriod, setActivePeriod] = useState<Period>("Today");
  const [customRange, setCustomRange]   = useState({ start: today(), end: today() });

  const { performance: dancers, isLoading } = useDancerPerformance(activePeriod, customRange);
  const { data: allDancers = [] } = useDancers();

  const enriched = useMemo(() => {
    return dancers.map(d => {
      const rawDancer = allDancers.find(r => r.id === d.id);
      // Detect "late": check if clock_in is after 8:30pm (configurable in future)
      const isLate = (() => {
        if (!d.checkIn) return false;
        const t = new Date(`1970-01-01 ${d.checkIn}`);
        return t.getHours() >= 20 && t.getMinutes() >= 30;
      })();
      return {
        ...d,
        isLate,
        outstandingBalance: Number((rawDancer as any)?.outstanding_balance ?? 0),
        houseFee: isLate
          ? Number((rawDancer as any)?.late_house_fee_rate ?? 50)
          : Number((rawDancer as any)?.house_fee_rate ?? 30),
      };
    });
  }, [dancers, allDancers]);

  // Totals
  const totals = useMemo(() => enriched.reduce((acc, d) => ({
    dancers: acc.dancers + 1,
    sessions: acc.sessions + d.sessions,
    gross: acc.gross + d.gross,
    toPay: acc.toPay + Math.max(0, d.gross - (d.houseFee + MUSIC_FEE)),
    owes: acc.owes + Math.max(0, (d.houseFee + MUSIC_FEE) - d.gross),
  }), { dancers: 0, sessions: 0, gross: 0, toPay: 0, owes: 0 }), [enriched]);

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dancer Financials</h2>
          <p className="text-sm text-muted-foreground">Per-dancer breakdown — fees, dances & payouts</p>
        </div>
        <DateFilter
          activePeriod={activePeriod}
          setActivePeriod={setActivePeriod}
          customRange={customRange}
          setCustomRange={setCustomRange}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Dancers",        value: totals.dancers,  prefix: ""  },
          { label: "Total Sessions", value: totals.sessions, prefix: ""  },
          { label: "Dance Gross",    value: totals.gross,    prefix: "$" },
          { label: "Total Payouts",  value: totals.toPay,    prefix: "$" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-border px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground mb-0.5">{k.label}</p>
            <p className="text-xl font-bold text-foreground">{k.prefix}{k.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Dancer cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : enriched.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground">
          No dancer data for this period.
        </div>
      ) : (
        <div className="space-y-3">
          {enriched.map(d => (
            <DancerCard
              key={d.id}
              name={d.name}
              checkIn={d.checkIn}
              isLate={d.isLate}
              houseFee={d.houseFee}
              danceRevenue={d.gross}
              outstandingBalance={d.outstandingBalance}
              sessions={d.sessionDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
