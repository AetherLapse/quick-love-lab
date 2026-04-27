-- Track individual stage visits per dancer per shift
CREATE TABLE public.stage_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id    UUID        NOT NULL REFERENCES public.dancers(id) ON DELETE CASCADE,
  dancer_name  TEXT        NOT NULL,
  shift_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  duration_sec INTEGER,
  end_reason   TEXT        NOT NULL DEFAULT 'completed',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stage_sessions"
  ON public.stage_sessions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stage_sessions"
  ON public.stage_sessions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update stage_sessions"
  ON public.stage_sessions FOR UPDATE
  TO authenticated USING (true);

CREATE INDEX idx_stage_sessions_dancer_date ON public.stage_sessions (dancer_id, shift_date);
CREATE INDEX idx_stage_sessions_shift_date  ON public.stage_sessions (shift_date);
