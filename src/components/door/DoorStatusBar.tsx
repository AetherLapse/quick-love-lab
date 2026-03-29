import { useState, useEffect } from "react";
import { DollarSign, Users, Clock, ChevronDown } from "lucide-react";

export interface TierBreakdown {
  tier: string;
  label: string;
  count: number;
  revenue: number;
}

interface DoorStatusBarProps {
  tierBreakdown: TierBreakdown[];
  totalRevenue: number;
  totalGuests: number;
}

const TIER_LABELS: Record<string, string> = {
  full_cover:  "Full Cover ($10)",
  reduced:     "Reduced ($5)",
  vip:         "VIP (Free)",
  ccc_card:    "CCC Card (Free)",
  two_for_one: "2-for-1 ($10/2)",
};

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DoorStatusBar({ tierBreakdown, totalRevenue, totalGuests }: DoorStatusBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState(nowTime());

  useEffect(() => {
    const id = setInterval(() => setTime(nowTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-gray-900 text-white rounded-2xl overflow-hidden">
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1">
          <DollarSign className="w-5 h-5 text-green-400" />
          <span className="text-2xl font-extrabold tracking-tight text-green-400">
            ${totalRevenue}
          </span>
          <span className="text-gray-400 text-sm ml-1">tonight</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-300">
          <Users className="w-4 h-4" />
          <span className="font-bold">{totalGuests}</span>
          <span className="text-gray-500 text-sm">guests</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>{time}</span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Tier breakdown — expandable */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-3 space-y-2 animate-[fadeIn_0.15s_ease]">
          {tierBreakdown.map((row) => (
            <div key={row.tier} className="flex items-center text-sm">
              <span className="flex-1 text-gray-300">{TIER_LABELS[row.tier] ?? row.label}</span>
              <span className="text-gray-400 w-14 text-right">{row.count}×</span>
              <span className="text-green-400 font-bold w-16 text-right">${row.revenue}</span>
            </div>
          ))}
          <div className="flex items-center text-sm border-t border-gray-700 pt-2 font-bold">
            <span className="flex-1 text-white">TOTAL</span>
            <span className="text-gray-300 w-14 text-right">{totalGuests}</span>
            <span className="text-green-400 w-16 text-right">${totalRevenue}</span>
          </div>
        </div>
      )}
    </div>
  );
}
