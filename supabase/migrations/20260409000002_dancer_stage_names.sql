-- ── Dancer stage names ────────────────────────────────────────────────────────
-- Each dancer can have multiple stage names; exactly one is active at a time.
-- The active name is mirrored to dancers.stage_name for use across the venue.

CREATE TABLE IF NOT EXISTS public.dancer_stage_names (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id   UUID        NOT NULL REFERENCES public.dancers(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dancer_id, name)
);

-- Seed one row per existing dancer using their current stage_name
INSERT INTO public.dancer_stage_names (dancer_id, name, is_active)
SELECT id, stage_name, TRUE
FROM public.dancers
WHERE stage_name IS NOT NULL AND stage_name <> ''
ON CONFLICT (dancer_id, name) DO NOTHING;
