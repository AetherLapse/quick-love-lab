import { useState, useRef } from "react";
import { GripVertical, RotateCcw } from "lucide-react";

// ── localStorage-backed panel order ──────────────────────────────────────────

export function usePanelOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`panel-order:${storageKey}`);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // Keep only valid IDs; append any new ones not yet saved
        const valid = parsed.filter(id => defaultOrder.includes(id));
        const added = defaultOrder.filter(id => !valid.includes(id));
        return [...valid, ...added];
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  const reorder = (fromIdx: number, toIdx: number) => {
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      localStorage.setItem(`panel-order:${storageKey}`, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    localStorage.removeItem(`panel-order:${storageKey}`);
    setOrder(defaultOrder);
  };

  return { order, reorder, reset };
}

// ── PanelStack ────────────────────────────────────────────────────────────────

export interface PanelDef {
  id:    string;
  label: string;
  node:  React.ReactNode;
}

export function PanelStack({ storageKey, panels }: { storageKey: string; panels: PanelDef[] }) {
  const defaultOrder = panels.map(p => p.id);
  const { order, reorder, reset } = usePanelOrder(storageKey, defaultOrder);

  const dragFrom = useRef<number | null>(null);
  const [dragOver,   setDragOver]   = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const panelMap = Object.fromEntries(panels.map(p => [p.id, p]));
  const ordered  = order.map(id => panelMap[id]).filter(Boolean);

  const onDragStart = (i: number) => { dragFrom.current = i; setIsDragging(true); };
  const onDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const onDrop      = (i: number) => {
    if (dragFrom.current !== null && dragFrom.current !== i) reorder(dragFrom.current, i);
    dragFrom.current = null; setDragOver(null); setIsDragging(false);
  };
  const onDragEnd   = () => { dragFrom.current = null; setDragOver(null); setIsDragging(false); };

  const isReordered = JSON.stringify(order) !== JSON.stringify(defaultOrder);

  return (
    <div className="space-y-5">
      {/* Reset hint — desktop only, only when reordered */}
      {isReordered && (
        <div className="hidden md:flex justify-end">
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset panel order
          </button>
        </div>
      )}

      {ordered.map((panel, i) => {
        const isTarget  = dragOver === i && dragFrom.current !== i;
        const isGrabbed = isDragging && dragFrom.current === i;
        return (
          <div
            key={panel.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            onDragEnd={onDragEnd}
            className={`relative group/panel transition-all duration-150
              ${isGrabbed ? "opacity-40 scale-[0.99]"                     : ""}
              ${isTarget  ? "ring-2 ring-primary ring-offset-2 rounded-2xl" : ""}`}
          >
            {/* Drag handle — desktop only, appears on hover */}
            <div
              className="hidden md:flex absolute top-2 right-2 z-[60] items-center gap-1.5
                         px-2 py-1 rounded-md
                         bg-white border border-border shadow-sm
                         opacity-0 group-hover/panel:opacity-100 transition-opacity duration-150
                         cursor-grab active:cursor-grabbing select-none pointer-events-none"
              title={`Drag to reorder — ${panel.label}`}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium leading-none">drag</span>
            </div>

            {panel.node}
          </div>
        );
      })}
    </div>
  );
}
