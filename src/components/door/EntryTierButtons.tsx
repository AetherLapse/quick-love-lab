import { useState } from "react";
import { ChevronDown, Users, Loader2 } from "lucide-react";

export type EntryTier = "full_cover" | "reduced" | "vip" | "ccc_card" | "two_for_one";

interface Distributor {
  id: string;
  name: string;
}

interface EntryTierButtonsProps {
  distributors: Distributor[];
  onEntry: (tier: EntryTier, distributorId?: string) => Promise<void>;
  disabled?: boolean;
}

const TIERS: { tier: EntryTier; label: string; sublabel: string; fee: number; color: string }[] = [
  { tier: "full_cover",  label: "Full Cover",   sublabel: "$10",       fee: 10,  color: "bg-green-500 hover:bg-green-600 shadow-green-200" },
  { tier: "reduced",     label: "Reduced",      sublabel: "$5",        fee: 5,   color: "bg-blue-500 hover:bg-blue-600 shadow-blue-200" },
  { tier: "vip",         label: "VIP",          sublabel: "Free",      fee: 0,   color: "bg-purple-500 hover:bg-purple-600 shadow-purple-200" },
  { tier: "ccc_card",    label: "CCC Card",     sublabel: "Free",      fee: 0,   color: "bg-amber-500 hover:bg-amber-600 shadow-amber-200" },
  { tier: "two_for_one", label: "2-for-1 Card", sublabel: "$10 / 2",   fee: 10,  color: "bg-red-500 hover:bg-red-600 shadow-red-200" },
];

export default function EntryTierButtons({ distributors, onEntry, disabled }: EntryTierButtonsProps) {
  const [twoForOneOpen, setTwoForOneOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [confirmedTwo, setConfirmedTwo] = useState(false);
  const [loading, setLoading] = useState<EntryTier | null>(null);

  const handleTierClick = async (tier: EntryTier) => {
    if (tier === "two_for_one") {
      setTwoForOneOpen(true);
      setSelectedDistributor("");
      setConfirmedTwo(false);
      return;
    }
    setLoading(tier);
    try {
      await onEntry(tier);
    } finally {
      setLoading(null);
    }
  };

  const handleTwoForOneConfirm = async () => {
    if (!confirmedTwo) return;
    setLoading("two_for_one");
    try {
      await onEntry("two_for_one", selectedDistributor || undefined);
      setTwoForOneOpen(false);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Tier Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {TIERS.map(({ tier, label, sublabel, color }) => (
          <button
            key={tier}
            onClick={() => handleTierClick(tier)}
            disabled={!!disabled || !!loading}
            className={`
              ${color} text-white rounded-xl py-4 px-3 font-bold text-center
              shadow-md active:scale-[0.97] transition-all duration-100
              disabled:opacity-50 disabled:cursor-not-allowed
              flex flex-col items-center justify-center gap-0.5
            `}
          >
            {loading === tier ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="text-sm leading-tight">{label}</span>
                <span className="text-xl font-extrabold">{sublabel}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* 2-for-1 Modal */}
      {twoForOneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-red-500" />
              2-for-1 Card Entry
            </h3>

            {/* Distributor selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Distributor <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDistributor}
                  onChange={(e) => setSelectedDistributor(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 pr-10 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">— Select distributor —</option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Confirmation */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedTwo}
                onChange={(e) => setConfirmedTwo(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-red-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 font-medium">
                I confirm <strong>2 people</strong> are present for this entry ($10 total)
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setTwoForOneOpen(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTwoForOneConfirm}
                disabled={!confirmedTwo || !!loading}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loading === "two_for_one" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm Entry"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { TIERS };
