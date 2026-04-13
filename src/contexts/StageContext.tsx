import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";

export interface StageEntry {
  dancerId:   string;
  dancerName: string;
  startTime:  Date;
  inRoom?:    boolean;
}

export interface StageFine {
  id:         string;
  dancerId:   string;
  dancerName: string;
  reason:     string;
  amount:     number;
  issuedAt:   Date;
}

const AUTO_ADVANCE_SECS  = 600; // 10 minutes
const ROOM_GRACE_SECS    = 120; // 2 minutes grace after room session

interface StageContextType {
  current:          StageEntry | null;
  queue:            StageEntry[];
  paused:           boolean;
  secondsUntilNext: number;
  fines:            StageFine[];
  roomExitTimes:    Record<string, Date>;   // dancerId → when they left the room
  putOnStage:       (dancerId: string, dancerName: string) => void;
  addToQueue:       (dancerId: string, dancerName: string) => void;
  advanceQueue:     () => void;
  offStageEarly:    () => void;
  removeFromQueue:  (dancerId: string) => void;
  reorderQueue:     (fromIdx: number, toIdx: number) => void;
  setFullQueue:     (entries: StageEntry[]) => void;
  togglePause:      () => void;
  resetTimer:       () => void;
  clearStage:       () => void;
  issueFine:        (dancerId: string, dancerName: string, reason: string, amount: number) => void;
  notifyRoomExit:   (dancerId: string) => void;
  clearFines:       () => void;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

export function StageProvider({ children }: { children: ReactNode }) {
  const [current,          setCurrent]          = useState<StageEntry | null>(null);
  const [queue,            setQueue]            = useState<StageEntry[]>([]);
  const [paused,           setPaused]           = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState(AUTO_ADVANCE_SECS);
  const [fines,            setFines]            = useState<StageFine[]>([]);
  const [roomExitTimes,    setRoomExitTimes]    = useState<Record<string, Date>>({});

  const pausedRef  = useRef(paused);
  const currentRef = useRef(current);
  pausedRef.current  = paused;
  currentRef.current = current;

  // ── Auto-advance countdown ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || !currentRef.current) return;
      setSecondsUntilNext(s => {
        if (s <= 1) {
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

  // ── Actions ────────────────────────────────────────────────────────────────
  const putOnStage = useCallback((dancerId: string, dancerName: string) => {
    setCurrent({ dancerId, dancerName, startTime: new Date() });
    setQueue(prev => prev.filter(e => e.dancerId !== dancerId));
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
    // Clear room exit time once on stage
    setRoomExitTimes(prev => { const n = { ...prev }; delete n[dancerId]; return n; });
  }, []);

  const addToQueue = useCallback((dancerId: string, dancerName: string) => {
    setQueue(prev =>
      prev.some(e => e.dancerId === dancerId)
        ? prev
        : [...prev, { dancerId, dancerName, startTime: new Date() }]
    );
  }, []);

  const advanceQueue = useCallback(() => {
    setCurrent(null);
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  }, []);

  const offStageEarly = useCallback(() => {
    setCurrent(prev => {
      if (prev) setQueue(q => [prev, ...q]);
      return null;
    });
    setSecondsUntilNext(AUTO_ADVANCE_SECS);
  }, []);

  const removeFromQueue  = useCallback((dancerId: string) =>
    setQueue(prev => prev.filter(e => e.dancerId !== dancerId)), []);

  const reorderQueue = useCallback((fromIdx: number, toIdx: number) => {
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const setFullQueue = useCallback((entries: StageEntry[]) => setQueue(entries), []);

  const togglePause = useCallback(() => setPaused(p => !p), []);
  const resetTimer  = useCallback(() => setSecondsUntilNext(AUTO_ADVANCE_SECS), []);
  const clearStage  = useCallback(() => setCurrent(null), []);

  const issueFine = useCallback((dancerId: string, dancerName: string, reason: string, amount: number) => {
    setFines(prev => [{
      id:         crypto.randomUUID(),
      dancerId, dancerName, reason, amount,
      issuedAt:   new Date(),
    }, ...prev]);
  }, []);

  const notifyRoomExit = useCallback((dancerId: string) => {
    setRoomExitTimes(prev => ({ ...prev, [dancerId]: new Date() }));
  }, []);

  const clearFines = useCallback(() => setFines([]), []);

  return (
    <StageContext.Provider value={{
      current, queue, paused, secondsUntilNext, fines, roomExitTimes,
      putOnStage, addToQueue, advanceQueue, offStageEarly, removeFromQueue,
      reorderQueue, setFullQueue, togglePause, resetTimer, clearStage,
      issueFine, notifyRoomExit, clearFines,
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

// ── Elapsed time hook ──────────────────────────────────────────────────────────
export function useElapsed(startTime: Date | null) {
  const [elapsed, setElapsed] = useState("0:00");
  useEffect(() => {
    if (!startTime) { setElapsed("0:00"); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsed(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

// ── Room grace countdown hook (seconds remaining, null if no grace active) ─────
export function useRoomGrace(dancerId: string): number | null {
  const { roomExitTimes } = useStage();
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const exitTime = roomExitTimes[dancerId];
    if (!exitTime) { setSecs(null); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - exitTime.getTime()) / 1000);
      const remaining = ROOM_GRACE_SECS - elapsed;
      setSecs(remaining > 0 ? remaining : null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dancerId, roomExitTimes]);

  return secs;
}

export { ROOM_GRACE_SECS };
