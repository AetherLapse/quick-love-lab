import { periods, type Period } from "./mockData";

export function DateFilter({ activePeriod, setActivePeriod }: { activePeriod: Period; setActivePeriod: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => setActivePeriod(p)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activePeriod === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
