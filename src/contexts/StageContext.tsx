import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClubId } from "@/lib/clubId";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

export interface StageHistoryEntry {
  id:              string;
  dancerId:        string;
  dancerName:      string;
  startTime:       Date;
  endTime:         Date;
  durationSeconds: number;
  endReason:       "completed" | "skipped" | "removed";
  skipReason?:     string;
}

const AUTO_ADVANCE_SECS  = 600;
const ROOM_GRACE_SECS    = 120;

function todayStr() { return new Date().toISOString().slice(0, 10); }

interface StageContextType {
  current:            StageEntry | null;
  queue:              StageEntry[];
  waiting:            StageEntry[];
  secondsUntilNext:   number;
  fines:              StageFine[];
  stageHistory:       StageHistoryEntry[];
  roomExitTimes:      Record<string, Date>;
  putOnStage:         (dancerId: string, dancerName: string) => void;
  addToQueue:         (dancerId: string, dancerName: string) => void;
  addToWaiting:       (dancerId: string, dancerName: string) => void;
  promoteFromWaiting: (dancerId: string) => void;
  removeFromWaiting:  (dancerId: string) => void;
  advanceQueue:       () => void;
  offStageEarly:      () => void;
  removeFromQueue:    (dancerId: string, reason?: string) => void;
  reorderQueue:       (fromIdx: number, toIdx: number) => void;
  setFullQueue:       (entries: StageEntry[]) => void;
  skipDancer:         (reason: string) => void;
  clearStage:         () => void;
  issueFine:          (dancerId: string, dancerName: string, reason: string, amount: number) => void;
  notifyRoomExit:     (dancerId: string) => void;
  clearFines:         () => void;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

// ── DB helpers ───────────────────────────────────────────────────────────────

async function dbUpsert(dancerId: string, dancerName: string, status: string, position: number) {
  const clubId = await getClubId();
  const today = todayStr();
  await (supabase as any).from("stage_queue").upsert({
    club_id: clubId, dancer_id: dancerId, dancer_name: dancerName,
    status, position, shift_date: today, started_at: new Date().toISOString(),
  }, { onConflict: "club_id,shift_date,dancer_id" });
}

async function dbUpdateStatus(dancerId: string, status: string, position: number, startedAt?: string) {
  const clubId = await getClubId();
  const update: Record<string, unknown> = { status, position };
  if (startedAt) update.started_at = startedAt;
  await (supabase as any).from("stage_queue")
    .update(update)
    .eq("club_id", clubId).eq("shift_date", todayStr()).eq("dancer_id", dancerId);
}

async function dbRemove(dancerId: string) {
  const clubId = await getClubId();
  await (supabase as any).from("stage_queue")
    .delete()
    .eq("club_id", clubId).eq("shift_date", todayStr()).eq("dancer_id", dancerId);
}

async function dbClearAll() {
  const clubId = await getClubId();
  await (supabase as any).from("stage_queue")
    .delete()
    .eq("club_id", clubId).eq("shift_date", todayStr());
}

async function persistStageStart(dancerId: string, dancerName: string) {
  await (supabase as any).from("stage_sessions").insert({
    club_id: await getClubId(), dancer_id: dancerId, dancer_name: dancerName,
    shift_date: todayStr(), started_at: new Date().toISOString(),
  });
}

async function persistStageEnd(dancerId: string, endReason: string) {
  const { data } = await (supabase as any).from("stage_sessions")
    .select("id, started_at").eq("dancer_id", dancerId).eq("shift_date", todayStr())
    .is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (data) {
    const dur = Math.round((Date.now() - new Date(data.started_at).getTime()) / 1000);
    await (supabase as any).from("stage_sessions").update({
      ended_at: new Date().toISOString(), duration_sec: dur, end_reason: endReason,
    }).eq("id", data.id);
  }
}

// ── Hook: fetch stage_queue for today ────────────────────────────────────────

interface QueueRow {
  id: string; dancer_id: string; dancer_name: string; status: string; position: number; started_at: string;
}

function useStageQueue() {
  return useQuery({
    queryKey: ["stage_queue"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("stage_queue")
        .select("*").eq("shift_date", todayStr()).order("position");
      if (error) throw error;
      return (data ?? []) as QueueRow[];
    },
    refetchInterval: 10_000,
  });
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function StageProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useStageQueue();

  // Client-only state (not persisted — session-scoped)
  const [fines, setFines] = useState<StageFine[]>([]);
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([]);
  const [roomExitTimes, setRoomExitTimes] = useState<Record<string, Date>>({});

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["stage_queue"] });
  }, [qc]);

  // Derive current / queue / waiting from DB rows
  const current = useMemo((): StageEntry | null => {
    const row = rows.find(r => r.status === "on_stage");
    if (!row) return null;
    return { dancerId: row.dancer_id, dancerName: row.dancer_name, startTime: new Date(row.started_at) };
  }, [rows]);

  const queue = useMemo((): StageEntry[] => {
    return rows
      .filter(r => r.status === "queued")
      .sort((a, b) => a.position - b.position)
      .map(r => ({ dancerId: r.dancer_id, dancerName: r.dancer_name, startTime: new Date(r.started_at) }));
  }, [rows]);

  const waiting = useMemo((): StageEntry[] => {
    return rows
      .filter(r => r.status === "waiting")
      .sort((a, b) => a.position - b.position)
      .map(r => ({ dancerId: r.dancer_id, dancerName: r.dancer_name, startTime: new Date(r.started_at) }));
  }, [rows]);

  // Countdown: derived from current's started_at
  const [secondsUntilNext, setSecondsUntilNext] = useState(AUTO_ADVANCE_SECS);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    if (!current) { setSecondsUntilNext(AUTO_ADVANCE_SECS); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - current.startTime.getTime()) / 1000);
      const remaining = AUTO_ADVANCE_SECS - elapsed;
      if (remaining <= 0) {
        // Auto-advance: move current off, next in queue goes on
        (async () => {
          await persistStageEnd(current.dancerId, "completed");
          setStageHistory(prev => [{
            id: crypto.randomUUID(), dancerId: current.dancerId, dancerName: current.dancerName,
            startTime: current.startTime, endTime: new Date(),
            durationSeconds: Math.round((Date.now() - current.startTime.getTime()) / 1000),
            endReason: "completed",
          }, ...prev]);
          const nextInQueue = queue[0];
          if (nextInQueue) {
            await dbUpdateStatus(current.dancerId, "done", 999);
            await dbUpdateStatus(nextInQueue.dancerId, "on_stage", 0, new Date().toISOString());
            await persistStageStart(nextInQueue.dancerId, nextInQueue.dancerName);
          } else {
            await dbRemove(current.dancerId);
          }
          invalidate();
        })();
        setSecondsUntilNext(AUTO_ADVANCE_SECS);
      } else {
        setSecondsUntilNext(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [current?.dancerId, current?.startTime.getTime(), queue.length]);

  // ── Actions (all write to DB then invalidate) ──────────────────────────────

  const putOnStage = useCallback(async (dancerId: string, dancerName: string) => {
    if (currentRef.current) {
      await persistStageEnd(currentRef.current.dancerId, "replaced");
      await dbRemove(currentRef.current.dancerId);
    }
    await dbUpsert(dancerId, dancerName, "on_stage", 0);
    await persistStageStart(dancerId, dancerName);
    invalidate();
  }, [invalidate]);

  const addToQueue = useCallback(async (dancerId: string, dancerName: string) => {
    const maxPos = rows.filter(r => r.status === "queued").reduce((m, r) => Math.max(m, r.position), -1);
    await dbUpsert(dancerId, dancerName, "queued", maxPos + 1);
    invalidate();
  }, [rows, invalidate]);

  const addToWaiting = useCallback(async (dancerId: string, dancerName: string) => {
    if (rows.some(r => r.dancer_id === dancerId)) return;
    const maxPos = rows.filter(r => r.status === "waiting").reduce((m, r) => Math.max(m, r.position), -1);
    await dbUpsert(dancerId, dancerName, "waiting", maxPos + 1);
    invalidate();
  }, [rows, invalidate]);

  const promoteFromWaiting = useCallback(async (dancerId: string) => {
    const maxPos = rows.filter(r => r.status === "queued").reduce((m, r) => Math.max(m, r.position), -1);
    await dbUpdateStatus(dancerId, "queued", maxPos + 1, new Date().toISOString());
    invalidate();
  }, [rows, invalidate]);

  const removeFromWaiting = useCallback(async (dancerId: string) => {
    await dbRemove(dancerId);
    invalidate();
  }, [invalidate]);

  const advanceQueue = useCallback(async () => {
    if (currentRef.current) {
      await persistStageEnd(currentRef.current.dancerId, "advanced");
      await dbRemove(currentRef.current.dancerId);
      setStageHistory(prev => [{
        id: crypto.randomUUID(), dancerId: currentRef.current!.dancerId, dancerName: currentRef.current!.dancerName,
        startTime: currentRef.current!.startTime, endTime: new Date(),
        durationSeconds: Math.round((Date.now() - currentRef.current!.startTime.getTime()) / 1000),
        endReason: "completed",
      }, ...prev]);
    }
    const next = queue[0];
    if (next) {
      await dbUpdateStatus(next.dancerId, "on_stage", 0, new Date().toISOString());
      await persistStageStart(next.dancerId, next.dancerName);
    }
    invalidate();
  }, [queue, invalidate]);

  const offStageEarly = useCallback(async () => {
    if (!currentRef.current) return;
    const cur = currentRef.current;
    await persistStageEnd(cur.dancerId, "off_stage_early");
    const maxPos = rows.filter(r => r.status === "queued").reduce((m, r) => Math.max(m, r.position), -1);
    await dbUpdateStatus(cur.dancerId, "queued", maxPos + 1, new Date().toISOString());
    invalidate();
  }, [rows, invalidate]);

  const removeFromQueue = useCallback(async (dancerId: string, reason?: string) => {
    const entry = queue.find(e => e.dancerId === dancerId);
    if (entry && reason) {
      setStageHistory(h => [{
        id: crypto.randomUUID(), dancerId: entry.dancerId, dancerName: entry.dancerName,
        startTime: entry.startTime, endTime: new Date(),
        durationSeconds: Math.round((Date.now() - entry.startTime.getTime()) / 1000),
        endReason: "removed", skipReason: reason,
      }, ...h]);
    }
    await dbRemove(dancerId);
    invalidate();
  }, [queue, invalidate]);

  const reorderQueue = useCallback(async (fromIdx: number, toIdx: number) => {
    const queued = [...rows.filter(r => r.status === "queued").sort((a, b) => a.position - b.position)];
    const [moved] = queued.splice(fromIdx, 1);
    queued.splice(toIdx, 0, moved);
    const clubId = await getClubId();
    for (let i = 0; i < queued.length; i++) {
      await (supabase as any).from("stage_queue").update({ position: i })
        .eq("club_id", clubId).eq("shift_date", todayStr()).eq("dancer_id", queued[i].dancer_id);
    }
    invalidate();
  }, [rows, invalidate]);

  const setFullQueue = useCallback(async (entries: StageEntry[]) => {
    const clubId = await getClubId();
    const today = todayStr();
    // Remove old queued entries
    await (supabase as any).from("stage_queue").delete()
      .eq("club_id", clubId).eq("shift_date", today).eq("status", "queued");
    // Insert new ones
    for (let i = 0; i < entries.length; i++) {
      await dbUpsert(entries[i].dancerId, entries[i].dancerName, "queued", i);
    }
    invalidate();
  }, [invalidate]);

  const skipDancer = useCallback(async (reason: string) => {
    if (!currentRef.current) return;
    const cur = currentRef.current;
    setStageHistory(h => [{
      id: crypto.randomUUID(), dancerId: cur.dancerId, dancerName: cur.dancerName,
      startTime: cur.startTime, endTime: new Date(),
      durationSeconds: Math.round((Date.now() - cur.startTime.getTime()) / 1000),
      endReason: "skipped", skipReason: reason,
    }, ...h]);
    await persistStageEnd(cur.dancerId, "skipped");
    await dbRemove(cur.dancerId);
    const next = queue[0];
    if (next) {
      await dbUpdateStatus(next.dancerId, "on_stage", 0, new Date().toISOString());
      await persistStageStart(next.dancerId, next.dancerName);
    }
    invalidate();
  }, [queue, invalidate]);

  const clearStage = useCallback(async () => {
    if (currentRef.current) {
      await persistStageEnd(currentRef.current.dancerId, "cleared");
    }
    await dbClearAll();
    invalidate();
  }, [invalidate]);

  const issueFine = useCallback((dancerId: string, dancerName: string, reason: string, amount: number) => {
    setFines(prev => [{
      id: crypto.randomUUID(), dancerId, dancerName, reason, amount, issuedAt: new Date(),
    }, ...prev]);
  }, []);

  const notifyRoomExit = useCallback((dancerId: string) => {
    setRoomExitTimes(prev => ({ ...prev, [dancerId]: new Date() }));
  }, []);

  const clearFines = useCallback(() => setFines([]), []);

  return (
    <StageContext.Provider value={{
      current, queue, waiting, secondsUntilNext, fines, stageHistory, roomExitTimes,
      putOnStage, addToQueue, addToWaiting, promoteFromWaiting, removeFromWaiting,
      advanceQueue, offStageEarly, removeFromQueue,
      reorderQueue, setFullQueue, skipDancer, clearStage,
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
