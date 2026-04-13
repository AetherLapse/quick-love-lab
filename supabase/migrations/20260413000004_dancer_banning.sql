-- ── Dancer banning system ──────────────────────────────────────────────────────

-- Add ban fields to dancers table
ALTER TABLE dancers
  ADD COLUMN IF NOT EXISTS is_banned    BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason   TEXT,
  ADD COLUMN IF NOT EXISTS banned_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by    UUID REFERENCES auth.users(id);

-- Ban log: keeps full history including lifts
CREATE TABLE IF NOT EXISTS dancer_ban_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id   UUID        NOT NULL REFERENCES dancers(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL CHECK (action IN ('banned', 'unbanned')),
  reason      TEXT,
  actioned_by UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS dancer_ban_log_dancer_idx ON dancer_ban_log(dancer_id);
CREATE INDEX IF NOT EXISTS dancers_is_banned_idx     ON dancers(is_banned) WHERE is_banned = TRUE;

-- RLS
ALTER TABLE dancer_ban_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can read ban log"
  ON dancer_ban_log FOR SELECT
  USING (true);

CREATE POLICY "Owner/manager can write ban log"
  ON dancer_ban_log FOR INSERT
  WITH CHECK (true);
