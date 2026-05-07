-- Configurable room layout per club
CREATE TABLE IF NOT EXISTS public.club_rooms (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   UUID        NOT NULL REFERENCES public.clubs(id),
  name      TEXT        NOT NULL,
  floor     TEXT        NOT NULL DEFAULT 'Floor 1',
  is_active BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.club_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_select_club_rooms" ON public.club_rooms
  FOR SELECT TO authenticated USING (club_id = public.jwt_club_id());
CREATE POLICY "club_insert_club_rooms" ON public.club_rooms
  FOR INSERT TO authenticated WITH CHECK (club_id = public.jwt_club_id());
CREATE POLICY "club_update_club_rooms" ON public.club_rooms
  FOR UPDATE TO authenticated USING (club_id = public.jwt_club_id());
CREATE POLICY "club_delete_club_rooms" ON public.club_rooms
  FOR DELETE TO authenticated USING (club_id = public.jwt_club_id());

CREATE INDEX idx_club_rooms_club ON public.club_rooms (club_id);

-- Seed 2NYT's existing rooms
INSERT INTO public.club_rooms (club_id, name, floor) VALUES
  ('894b8f8b-f5d3-4102-9997-5c29815893d1', 'VIP Room 1', 'Floor 1'),
  ('894b8f8b-f5d3-4102-9997-5c29815893d1', 'VIP Room 2', 'Floor 1');
