import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

export interface StageEntry {
  dancerId: string;
  dancerName: string;
  startTime: Date;
  inRoom?: boolean; // currently in a VIP room session
}

const AUTO_ADVANCE_SECS = 600; // 10 minutes

interface StageContextType {
  current:          StageEntry | null;
  queue:            StageEntry[];
  paused:           boolean;
  secondsUntilNext: number;
  putOnStage:       (dancerId: string, dancerName: string) => void;
  addToQueue:       (dancerId: string, dancerName: string) => void;
  advanceQueue:     () => void;
  removeFromQueue:  (dancerId: string) => void;
  reorderQueue:     (fromIdx: number, toIdx: number) => void;
  setFullQueue:     (entries: StageEntry[]) => void;
  togglePause:      () => void;
  resetTimer:       () => void;
  clearStage:       () => void;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

export function StageProvider({ children }: { children: ReactNode }) {
  const [current,          setCurrent]          = useState<StageEntry | null>(null);
  const [queue,            setQueue]            = useState<StageEntry[]>([]);
  const [paused,           setPaused]           = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState(AUTO_ADVANCE_SECS);
  const pausedRef = useRef(paused);
  const currentRef = useRef(current);
  pausedRef.current  = paused;
  currentRef.current = current;

  // ── Auto-advance countdown ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || !currentRef.current) return;
      setSecondsUntilNext(s => {
        if (s <= 1) {
          // Advance: move next dancer in queue onto stage
          setQueue(prev => {
            const [next, ...rest] = prev;
            if (next) setCurrent({ ...next, startTime: new Date() });
            else      setCurrent(null);
            return rest;
          });
          return AUTO_ADVANCE_SECS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const putOnStage = (dancerId: string, dancerName: string) => {
    setCurrent({ dancerId, dancerName, startTime: new Date() });
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  };

  const addToQueue = (dancerId: string, dancerName: string) => {
    setQueue(prev =>
      prev.some(e => e.dancerId === dancerId)
        ? prev
        : [...prev, { dancerId, dancerName, startTime: new Date() }]
    );
  };

  const advanceQueue = () => {
    setQueue(prev => {
      const [next, ...rest] = prev;
      if (next) setCurrent({ ...next, startTime: new Date() });
      else      setCurrent(null);
      return rest;
    });
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  };

  const removeFromQueue = (dancerId: string) => {
    setQueue(prev => prev.filter(e => e.dancerId !== dancerId));
  };

  const reorderQueue = (fromIdx: number, toIdx: number) => {
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const setFullQueue = (entries: StageEntry[]) => {
    setQueue(entries);
  };

  const togglePause = () => setPaused(p => !p);
  const resetTimer  = () => setSecondsUntilNext(AUTO_ADVANCE_SECS);
  const clearStage  = () => setCurrent(null);

  return (
    <StageContext.Provider value={{
      current, queue, paused, secondsUntilNext,
      putOnStage, addToQueue, advanceQueue, removeFromQueue,
      reorderQueue, setFullQueue,
      togglePause, resetTimer, clearStage,
    }}>
      {children}
    </StageContext.Provider>
  );
}

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used within StageProvider");
  return ctx;
}

// ── Elapsed time hook ─────────────────────────────────────────────────────────
export function useElapsed(startTime: Date | null) {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!startTime) { setElapsed("0:00"); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const m = Math.floor(secs / 60);
      const s = String(secs % 60).padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}
