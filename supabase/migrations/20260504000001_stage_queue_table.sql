-- Persistent stage queue state — syncs across all devices via Realtime
CREATE TABLE IF NOT EXISTS public.stage_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID        NOT NULL REFERENCES public.clubs(id),
  dancer_id    UUID        NOT NULL REFERENCES public.dancers(id) ON DELETE CASCADE,
  dancer_name  TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'waiting',
  position     INTEGER     NOT NULL DEFAULT 0,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: 'on_stage' | 'queued' | 'waiting'
-- position: ordering within each status group (0 = first)

ALTER TABLE public.stage_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_select_stage_queue" ON public.stage_queue
  FOR SELECT TO authenticated USING (club_id = public.jwt_club_id());
CREATE POLICY "club_insert_stage_queue" ON public.stage_queue
  FOR INSERT TO authenticated WITH CHECK (club_id = public.jwt_club_id());
CREATE POLICY "club_update_stage_queue" ON public.stage_queue
  FOR UPDATE TO authenticated USING (club_id = public.jwt_club_id());
CREATE POLICY "club_delete_stage_queue" ON public.stage_queue
  FOR DELETE TO authenticated USING (club_id = public.jwt_club_id());

CREATE INDEX idx_stage_queue_club_date ON public.stage_queue (club_id, shift_date);
CREATE INDEX idx_stage_queue_status ON public.stage_queue (club_id, shift_date, status, position);

-- Unique constraint: one dancer can only appear once per club per shift
CREATE UNIQUE INDEX idx_stage_queue_unique_dancer ON public.stage_queue (club_id, shift_date, dancer_id);
