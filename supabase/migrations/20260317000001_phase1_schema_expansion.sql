-- =============================================================
-- PHASE 1: Schema Expansion
-- Adds dancer profile fields, privacy-safe guest tracking,
-- room sessions, append-only audit logs, and multi-tenant clubs
-- =============================================================


-- =============================================================
-- 1. NEW ENUMS
-- =============================================================

CREATE TYPE public.dancer_live_status AS ENUM ('inactive', 'on_floor', 'active_in_room');
CREATE TYPE public.dancer_event_type AS ENUM ('check_in', 'room_session', 'payout', 'behaviour_note', 'profile_edit', 'shift_end');


-- =============================================================
-- 2. EXPAND dancers TABLE
-- All new columns nullable so existing rows are not broken
-- =============================================================

ALTER TABLE public.dancers
  ADD COLUMN full_name TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN facial_hash TEXT,          -- AWS Rekognition FaceId only, never the raw photo
  ADD COLUMN govt_id_token TEXT,        -- masked token (verified in-person, never plain text)
  ADD COLUMN ssn_token TEXT,            -- AES-256 encrypted SSN, always shown as XXX-XX-XXXX in UI
  ADD COLUMN live_status public.dancer_live_status NOT NULL DEFAULT 'inactive',
  ADD COLUMN popularity_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT false;


-- =============================================================
-- 3. GUESTS TABLE
-- Privacy-first customer tracking.
-- Only SHA-256 hash of DL number is ever stored — zero PII.
-- Age check happens in memory at scan time and is never persisted.
-- =============================================================

CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dl_hash TEXT NOT NULL UNIQUE,             -- SHA-256(DL number)
  guest_display_id TEXT NOT NULL,           -- first 8 hex chars, shown as #XXXXXXXX in UI
  visit_count INTEGER NOT NULL DEFAULT 0,   -- incremented by trigger on each guest_visit insert
  first_visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_returning BOOLEAN NOT NULL DEFAULT false,  -- auto-set true after 2nd visit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- 4. GUEST_VISITS TABLE
-- Individual visit records — linked to anonymous guest only.
-- =============================================================

CREATE TABLE public.guest_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  door_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- 5. ROOM_SESSIONS TABLE
-- Tracks each private room session with full split breakdown.
-- exit_time nullable — populated when session ends.
-- =============================================================

CREATE TABLE public.room_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id UUID REFERENCES public.dancers(id) NOT NULL,
  room_name TEXT,                           -- optional room label (e.g. "Room 1")
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time TIMESTAMPTZ,                    -- null while session is active
  num_songs INTEGER NOT NULL DEFAULT 1,
  package_name TEXT NOT NULL,               -- "1 Song", "2 Songs", "3 Songs"
  gross_amount NUMERIC(10,2) NOT NULL,
  house_cut NUMERIC(10,2) NOT NULL,
  dancer_cut NUMERIC(10,2) NOT NULL,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- 6. DANCER_EVENT_LOG TABLE
-- Append-only audit trail. Six event types, all immutable.
-- No UPDATE or DELETE policies are created — enforced at DB level.
-- =============================================================

CREATE TABLE public.dancer_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id UUID REFERENCES public.dancers(id) NOT NULL,
  event_type public.dancer_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',      -- flexible per event type
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payload shapes per event_type:
-- check_in:       { method: "facial|pin", house_fee_applied: number }
-- room_session:   { session_id: uuid, package: string, gross: number, house_cut: number, dancer_cut: number }
-- payout:         { net_payout: number, marked_paid_by: uuid }
-- behaviour_note: { note_id: uuid }
-- profile_edit:   { field: string, old_value: any, new_value: any }
-- shift_end:      { total_songs: number, gross_earnings: number, deductions: object, net_payout: number }


-- =============================================================
-- 7. BEHAVIOUR_NOTES TABLE
-- Append-only internal notes. Admin and Manager visibility only.
-- Dancer never sees these. Cannot be edited or deleted.
-- =============================================================

CREATE TABLE public.behaviour_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id UUID REFERENCES public.dancers(id) NOT NULL,
  note_text TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- 8. CLUBS TABLE
-- Multi-tenant foundation. Each club gets a unique API key.
-- Managed via Super Admin only (service role). No direct
-- authenticated user access.
-- =============================================================

CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex'),
  owner_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- 9. ENABLE RLS ON ALL NEW TABLES
-- =============================================================

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dancer_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behaviour_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- 10. RLS POLICIES
-- =============================================================

-- guests
CREATE POLICY "Staff can insert guests"
  ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can read guests"
  ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can update guest metadata"
  ON public.guests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- guest_visits
CREATE POLICY "Staff can insert guest visits"
  ON public.guest_visits FOR INSERT TO authenticated WITH CHECK (logged_by = auth.uid());
CREATE POLICY "Staff can read guest visits"
  ON public.guest_visits FOR SELECT TO authenticated USING (true);

-- room_sessions
CREATE POLICY "Staff can insert room sessions"
  ON public.room_sessions FOR INSERT TO authenticated WITH CHECK (logged_by = auth.uid());
CREATE POLICY "Staff can read room sessions"
  ON public.room_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can update room sessions today"
  ON public.room_sessions FOR UPDATE TO authenticated
  USING (
    shift_date = CURRENT_DATE AND (
      public.has_role(auth.uid(), 'room_attendant') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'admin')
    )
  );

-- dancer_event_log — INSERT only, zero UPDATE/DELETE policies (append-only enforced)
CREATE POLICY "Staff can insert event log"
  ON public.dancer_event_log FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Managers and admins can read event log"
  ON public.dancer_event_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- behaviour_notes — INSERT + SELECT for admin/manager only, no UPDATE/DELETE
CREATE POLICY "Managers can insert behaviour notes"
  ON public.behaviour_notes FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
    AND author_id = auth.uid()
  );
CREATE POLICY "Managers can read behaviour notes"
  ON public.behaviour_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- clubs — no authenticated user access, managed by service role (Super Admin)
CREATE POLICY "No direct client access to clubs"
  ON public.clubs FOR ALL TO authenticated USING (false);


-- =============================================================
-- 11. TRIGGERS
-- =============================================================

-- clubs: updated_at auto-update
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- guest_visits: increment visit_count and set is_returning on guests
CREATE OR REPLACE FUNCTION public.handle_guest_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guests
  SET
    visit_count = visit_count + 1,
    last_visit_date = CURRENT_DATE,
    is_returning = (visit_count + 1) >= 2
  WHERE id = NEW.guest_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_guest_visit_inserted
  AFTER INSERT ON public.guest_visits
  FOR EACH ROW EXECUTE FUNCTION public.handle_guest_visit();

-- room_sessions: auto-update dancer live_status on session start/end
CREATE OR REPLACE FUNCTION public.handle_room_session_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Session started — dancer is now active in room
    UPDATE public.dancers SET live_status = 'active_in_room' WHERE id = NEW.dancer_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
    -- Session ended — revert to on_floor if still clocked in, else inactive
    IF EXISTS (
      SELECT 1 FROM public.attendance_log
      WHERE dancer_id = NEW.dancer_id
        AND shift_date = CURRENT_DATE
        AND clock_out IS NULL
    ) THEN
      UPDATE public.dancers SET live_status = 'on_floor' WHERE id = NEW.dancer_id;
    ELSE
      UPDATE public.dancers SET live_status = 'inactive' WHERE id = NEW.dancer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_room_session_change
  AFTER INSERT OR UPDATE ON public.room_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_room_session_status();

-- attendance_log: auto-update dancer live_status on clock-in/clock-out
CREATE OR REPLACE FUNCTION public.handle_attendance_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Clocked in — dancer is on the floor
    UPDATE public.dancers SET live_status = 'on_floor' WHERE id = NEW.dancer_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL THEN
    -- Clocked out — dancer is inactive
    UPDATE public.dancers SET live_status = 'inactive' WHERE id = NEW.dancer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_attendance_change
  AFTER INSERT OR UPDATE ON public.attendance_log
  FOR EACH ROW EXECUTE FUNCTION public.handle_attendance_status();


-- =============================================================
-- 12. POPULARITY SCORE FUNCTION
-- Called on-demand to recalculate a dancer's rolling 30-day score.
-- Score = (session_count * 10) + (total_dancer_earnings / 10)
-- =============================================================

CREATE OR REPLACE FUNCTION public.calculate_popularity_score(dancer_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  session_count INTEGER;
  total_earnings NUMERIC;
  score NUMERIC;
BEGIN
  SELECT COUNT(*) INTO session_count
  FROM public.room_sessions
  WHERE dancer_id = dancer_uuid
    AND entry_time >= now() - INTERVAL '30 days';

  SELECT COALESCE(SUM(dancer_cut), 0) INTO total_earnings
  FROM public.room_sessions
  WHERE dancer_id = dancer_uuid
    AND entry_time >= now() - INTERVAL '30 days';

  score := (session_count * 10) + (total_earnings / 10);

  UPDATE public.dancers SET popularity_score = score WHERE id = dancer_uuid;
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =============================================================
-- 13. UPSERT GUEST HELPER FUNCTION
-- Used by door check-in: inserts guest if new, returns id always.
-- Frontend passes the SHA-256 hash — raw DL data never touches server.
-- =============================================================

CREATE OR REPLACE FUNCTION public.upsert_guest(p_dl_hash TEXT, p_display_id TEXT, p_door_fee NUMERIC, p_logged_by UUID)
RETURNS UUID AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Insert new guest or do nothing if hash already exists
  INSERT INTO public.guests (dl_hash, guest_display_id)
  VALUES (p_dl_hash, p_display_id)
  ON CONFLICT (dl_hash) DO NOTHING;

  -- Get the guest id
  SELECT id INTO v_guest_id FROM public.guests WHERE dl_hash = p_dl_hash;

  -- Record the visit (triggers visit_count increment + is_returning update)
  INSERT INTO public.guest_visits (guest_id, door_fee, logged_by)
  VALUES (v_guest_id, p_door_fee, p_logged_by);

  RETURN v_guest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
