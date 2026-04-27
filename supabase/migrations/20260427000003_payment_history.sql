CREATE TABLE public.payment_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID        NOT NULL REFERENCES public.attendance_log(id) ON DELETE CASCADE,
  dancer_id     UUID        NOT NULL REFERENCES public.dancers(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_date    DATE        NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payment_history"
  ON public.payment_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payment_history"
  ON public.payment_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_payment_history_attendance ON public.payment_history (attendance_id);
CREATE INDEX idx_payment_history_dancer_date ON public.payment_history (dancer_id, shift_date);
