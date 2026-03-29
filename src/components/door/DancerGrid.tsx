import { User, Clock } from "lucide-react";

export interface DancerTile {
  id: string;
  stage_name: string;
  profile_photo_url: string | null;
  live_status: string;
  slot_label?: string | null; // 'on_stage' | 'on_deck' | 'queued' | null
  active_session_elapsed?: number | null; // ms elapsed in active room session
}

interface DancerGridProps {
  dancers: DancerTile[];
  viewMode: "icon" | "list";
  viewSection: "dancers" | "dances";
  sessionEarningsByDancer?: Record<string, { gross: number; house: number; dancer: number }>;
  onSelect: (dancer: DancerTile) => void;
  selectedId?: string | null;
}

function slotStyle(tile: DancerTile): { border: string; badge: string; badgeText: string } {
  const slot = tile.slot_label ?? (tile.live_status === "on_stage" ? "on_stage" : null);
  if (slot === "on_stage") return { border: "border-green-400 ring-2 ring-green-300",  badge: "bg-green-500",  badgeText: "ON STAGE" };
  if (slot === "on_deck")  return { border: "border-yellow-400 ring-2 ring-yellow-300", badge: "bg-yellow-500", badgeText: "ON DECK" };
  if (slot === "queued")   return { border: "border-red-400 ring-2 ring-red-300",       badge: "bg-red-500",    badgeText: "QUEUED" };
  if (tile.live_status === "active_in_room") return { border: "border-blue-400 ring-2 ring-blue-200", badge: "bg-blue-500", badgeText: "IN ROOM" };
  return { border: "border-gray-200", badge: "", badgeText: "" };
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function DancerGrid({
  dancers,
  viewMode,
  viewSection,
  sessionEarningsByDancer = {},
  onSelect,
  selectedId,
}: DancerGridProps) {
  if (dancers.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No active dancers on floor tonight.</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-1.5">
        {dancers.map((dancer) => {
          const style = slotStyle(dancer);
          const earnings = sessionEarningsByDancer[dancer.id];
          const isSelected = selectedId === dancer.id;
          return (
            <button
              key={dancer.id}
              onClick={() => onSelect(dancer)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
                ${isSelected ? "bg-gray-900 border-gray-900 text-white" : `bg-white ${style.border} hover:bg-gray-50`}
              `}
            >
              {/* Photo */}
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                {dancer.profile_photo_url ? (
                  <img src={dancer.profile_photo_url} alt={dancer.stage_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-400 m-auto mt-2.5" />
                )}
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{dancer.stage_name}</p>
                {style.badgeText && (
                  <span className={`text-xs font-semibold text-white px-1.5 py-0.5 rounded ${style.badge}`}>
                    {style.badgeText}
                  </span>
                )}
              </div>

              {/* Timer or earnings */}
              {viewSection === "dancers" && dancer.active_session_elapsed != null && (
                <span className="flex items-center gap-1 text-xs text-blue-600 font-mono">
                  <Clock className="w-3 h-3" />
                  {formatElapsed(dancer.active_session_elapsed)}
                </span>
              )}
              {viewSection === "dances" && earnings && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Dancer: <span className="font-bold text-green-600">${earnings.dancer}</span></p>
                  <p className="text-xs text-gray-500">House: <span className="font-bold">${earnings.house}</span></p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Icon grid
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {dancers.map((dancer) => {
        const style = slotStyle(dancer);
        const earnings = sessionEarningsByDancer[dancer.id];
        const isSelected = selectedId === dancer.id;
        return (
          <button
            key={dancer.id}
            onClick={() => onSelect(dancer)}
            className={`
              relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all
              ${isSelected ? "bg-gray-900 border-gray-900 text-white scale-[0.97]" : `bg-white ${style.border} hover:bg-gray-50`}
            `}
          >
            {/* Slot badge */}
            {style.badgeText && (
              <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full whitespace-nowrap ${style.badge}`}>
                {style.badgeText}
              </span>
            )}

            {/* Photo */}
            <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200">
              {dancer.profile_photo_url ? (
                <img src={dancer.profile_photo_url} alt={dancer.stage_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-gray-400 m-auto mt-3.5" />
              )}
            </div>

            {/* Name */}
            <p className="text-xs font-bold text-center leading-tight line-clamp-1 w-full">
              {dancer.stage_name}
            </p>

            {/* Timer (dancers view) */}
            {viewSection === "dancers" && dancer.active_session_elapsed != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-mono">
                <Clock className="w-2.5 h-2.5" />
                {formatElapsed(dancer.active_session_elapsed)}
              </span>
            )}

            {/* Earnings (dances view) */}
            {viewSection === "dances" && earnings && (
              <span className="text-[10px] font-bold text-green-600">${earnings.dancer}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
