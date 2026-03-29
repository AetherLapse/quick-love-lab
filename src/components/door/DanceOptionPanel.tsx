import { useState } from "react";
import { X, Plus, Users, Play, Trash2, Wine, Loader2 } from "lucide-react";

export interface DanceSession {
  dancerId: string;
  dancerName: string;
  secondDancerId?: string;
  secondDancerName?: string;
  packageKey: string;
  packageLabel: string;
  gross: number;
  house: number;
  dancer: number;
  durationSeconds?: number; // for timed sessions
}

const PACKAGES = [
  { key: "1lap",    label: "1 Lap",       gross: 30,  durationSeconds: null },
  { key: "3lap",    label: "3 Lap",       gross: 90,  durationSeconds: null },
  { key: "15min",   label: "15 Min",      gross: 140, durationSeconds: 15 * 60 },
  { key: "20min",   label: "20 Min",      gross: 200, durationSeconds: 20 * 60 },
  { key: "stage",   label: "Stage",       gross: 20,  durationSeconds: null },
  { key: "bottle",  label: "Bottle Svc",  gross: 0,   durationSeconds: null },
  { key: "custom",  label: "Custom",      gross: 0,   durationSeconds: null },
];

// House takes 60%, dancer gets 40% (can be customized)
const DANCER_PCT = 0.40;

interface DanceOptionPanelProps {
  dancer: { id: string; stage_name: string };
  allDancers: { id: string; stage_name: string }[];
  onStart: (session: DanceSession) => Promise<void>;
  onClose: () => void;
}

export default function DanceOptionPanel({ dancer, allDancers, onStart, onClose }: DanceOptionPanelProps) {
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState<string>("50");
  const [twoGirls, setTwoGirls] = useState(false);
  const [secondDancerId, setSecondDancerId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const pkg = PACKAGES.find((p) => p.key === selectedPkg);

  const gross =
    selectedPkg === "custom"
      ? Math.max(0, Number(customPrice) || 0)
      : (pkg?.gross ?? 0);

  const dancerCut = Math.round(gross * DANCER_PCT);
  const houseCut  = gross - dancerCut;

  const canStart = selectedPkg !== null && (selectedPkg !== "custom" || gross > 0) &&
    (!twoGirls || secondDancerId);

  const handleStart = async () => {
    if (!pkg && selectedPkg !== "custom") return;
    setLoading(true);
    const secondDancer = twoGirls
      ? allDancers.find((d) => d.id === secondDancerId)
      : undefined;

    try {
      await onStart({
        dancerId:          dancer.id,
        dancerName:        dancer.stage_name,
        secondDancerId:    secondDancer?.id,
        secondDancerName:  secondDancer?.stage_name,
        packageKey:        selectedPkg!,
        packageLabel:      selectedPkg === "custom" ? `Custom $${gross}` : pkg!.label,
        gross,
        house:             houseCut,
        dancer:            dancerCut,
        durationSeconds:   pkg?.durationSeconds ?? undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedPkg(null);
    setCustomPrice("50");
    setTwoGirls(false);
    setSecondDancerId("");
  };

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-4 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">
          Session with <span className="text-pink-400">{dancer.stage_name}</span>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-4 gap-2">
        {PACKAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => setSelectedPkg(p.key)}
            className={`rounded-xl py-3 px-2 text-center font-bold transition-all text-sm
              ${selectedPkg === p.key
                ? "bg-pink-500 text-white scale-[0.97]"
                : "bg-gray-800 hover:bg-gray-700 text-gray-200"
              }`}
          >
            <span className="block text-xs leading-tight">{p.label}</span>
            {p.gross > 0 && (
              <span className="block text-base font-extrabold mt-0.5">${p.gross}</span>
            )}
            {p.key === "custom" && <span className="block text-base mt-0.5">+ Enter</span>}
            {p.key === "bottle" && <Wine className="w-4 h-4 mx-auto mt-0.5 text-amber-400" />}
          </button>
        ))}
      </div>

      {/* Custom price input */}
      {selectedPkg === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-lg font-bold">$</span>
          <input
            type="number"
            min="1"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-lg font-bold focus:outline-none focus:border-pink-500"
            placeholder="Amount"
          />
        </div>
      )}

      {/* Split preview */}
      {gross > 0 && (
        <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-400">Dancer </span>
            <span className="font-bold text-green-400">${dancerCut}</span>
          </div>
          <div className="text-gray-600 font-bold">|</div>
          <div>
            <span className="text-gray-400">House </span>
            <span className="font-bold text-white">${houseCut}</span>
          </div>
          <div className="text-gray-600 font-bold">|</div>
          <div>
            <span className="text-gray-400">Total </span>
            <span className="font-bold text-pink-400">${gross}</span>
          </div>
        </div>
      )}

      {/* 2 Girls toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setTwoGirls(!twoGirls); setSecondDancerId(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all
            ${twoGirls ? "bg-pink-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
        >
          <Users className="w-4 h-4" />
          2 Girls
        </button>

        {twoGirls && (
          <select
            value={secondDancerId}
            onChange={(e) => setSecondDancerId(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
          >
            <option value="">— Add dancer —</option>
            {allDancers
              .filter((d) => d.id !== dancer.id)
              .map((d) => (
                <option key={d.id} value={d.id}>{d.stage_name}</option>
              ))}
          </select>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={handleClear}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm transition-colors"
        >
          <Trash2 className="w-4 h-4" /> CLEAR
        </button>

        <button
          onClick={handleStart}
          disabled={!canStart || loading}
          className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white font-bold text-sm transition-all"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Play className="w-4 h-4" /> START SESSION</>
          )}
        </button>
      </div>
    </div>
  );
}
