-- ── Extend enum with missing event types ──────────────────────────────────────
ALTER TYPE public.dancer_event_type ADD VALUE IF NOT EXISTS 'check_out';
ALTER TYPE public.dancer_event_type ADD VALUE IF NOT EXISTS 'ban';
ALTER TYPE public.dancer_event_type ADD VALUE IF NOT EXISTS 'unban';
ALTER TYPE public.dancer_event_type ADD VALUE IF NOT EXISTS 'enroll';
ALTER TYPE public.dancer_event_type ADD VALUE IF NOT EXISTS 'guest_entry';

-- ── Unified staff action log view ─────────────────────────────────────────────
-- Combines dancer events, room sessions, ban log, and guest entries into one
-- queryable surface for the admin Logs tab.

CREATE OR REPLACE VIEW public.v_staff_action_log AS

-- Dancer event log (check_in, check_out, enroll, ban, unban, etc.)
SELECT
  del.id                                      AS id,
  del.created_at                              AS ts,
  del.event_type::text                        AS action,
  p.full_name                                 AS staff_name,
  ur.role::text                               AS staff_role,
  del.author_id                               AS staff_id,
  d.stage_name                                AS subject_name,
  d.enroll_id                                 AS subject_id,
  del.payload                                 AS detail,
  'dancer_event'                              AS source
FROM public.dancer_event_log del
LEFT JOIN public.profiles     p  ON p.user_id  = del.author_id
LEFT JOIN public.user_roles   ur ON ur.user_id = del.author_id
LEFT JOIN public.dancers      d  ON d.id       = del.dancer_id

UNION ALL

-- Room sessions (room attendant opens a session)
SELECT
  rs.id                                       AS id,
  rs.created_at                               AS ts,
  'room_session'                              AS action,
  p.full_name                                 AS staff_name,
  ur.role::text                               AS staff_role,
  rs.logged_by                                AS staff_id,
  d.stage_name                                AS subject_name,
  d.enroll_id                                 AS subject_id,
  jsonb_build_object(
    'room', rs.room_name,
    'package', rs.package_name,
    'songs', rs.num_songs,
    'gross', rs.gross_amount,
    'ended', rs.exit_time IS NOT NULL
  )                                           AS detail,
  'room_session'                              AS source
FROM public.room_sessions rs
LEFT JOIN public.profiles   p  ON p.user_id  = rs.logged_by
LEFT JOIN public.user_roles ur ON ur.user_id = rs.logged_by
LEFT JOIN public.dancers    d  ON d.id       = rs.dancer_id

UNION ALL

-- Guest entries (door staff logs a guest)
SELECT
  ce.id                                       AS id,
  ce.entry_time                               AS ts,
  'guest_entry'                               AS action,
  p.full_name                                 AS staff_name,
  ur.role::text                               AS staff_role,
  ce.logged_by                                AS staff_id,
  COALESCE(ce.vendor_name, 'Walk-in Guest')  AS subject_name,
  NULL                                        AS subject_id,
  jsonb_build_object('door_fee', ce.door_fee, 'guest_count', COALESCE(ce.guest_count, 1)) AS detail,
  'guest_entry'                               AS source
FROM public.customer_entries ce
LEFT JOIN public.profiles   p  ON p.user_id  = ce.logged_by
LEFT JOIN public.user_roles ur ON ur.user_id = ce.logged_by

UNION ALL

-- Dancer ban log
SELECT
  dbl.id                                      AS id,
  dbl.created_at                              AS ts,
  dbl.action                                  AS action,
  p.full_name                                 AS staff_name,
  ur.role::text                               AS staff_role,
  dbl.actioned_by                             AS staff_id,
  d.stage_name                                AS subject_name,
  d.enroll_id                                 AS subject_id,
  jsonb_build_object('reason', dbl.reason)    AS detail,
  'ban_log'                                   AS source
FROM public.dancer_ban_log dbl
LEFT JOIN public.profiles   p  ON p.user_id  = dbl.actioned_by
LEFT JOIN public.user_roles ur ON ur.user_id = dbl.actioned_by
LEFT JOIN public.dancers    d  ON d.id       = dbl.dancer_id;

-- No RLS needed on a view — access controlled at app layer (role check)
