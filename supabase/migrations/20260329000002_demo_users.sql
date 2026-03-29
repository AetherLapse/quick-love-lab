-- =============================================================
-- DEMO v2: Seed missing demo users + assign roles
-- Creates: owner, door_staff, room_attendant, house_mom
-- (admin + manager were created in prior setup)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_owner_id   uuid := gen_random_uuid();
  v_door_id    uuid := gen_random_uuid();
  v_room_id    uuid := gen_random_uuid();
  v_hmom_id    uuid := gen_random_uuid();
BEGIN

  -- ── Owner ───────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    v_owner_id, 'authenticated', 'authenticated',
    'owner@2nyt.com', crypt('owner2nyt', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id
  RETURNING id INTO v_owner_id;

  INSERT INTO public.profiles (user_id, full_name, is_active)
  VALUES (v_owner_id, 'Venue Owner', true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_owner_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ── Door Staff ──────────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    v_door_id, 'authenticated', 'authenticated',
    'door@2nyt.com', crypt('door2nyt', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id
  RETURNING id INTO v_door_id;

  INSERT INTO public.profiles (user_id, full_name, is_active)
  VALUES (v_door_id, 'Door Staff', true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_door_id, 'door_staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ── Room Attendant ──────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    v_room_id, 'authenticated', 'authenticated',
    'room@2nyt.com', crypt('room2nyt', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id
  RETURNING id INTO v_room_id;

  INSERT INTO public.profiles (user_id, full_name, is_active)
  VALUES (v_room_id, 'Room Attendant', true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_room_id, 'room_attendant')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ── House Mom ────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    v_hmom_id, 'authenticated', 'authenticated',
    'housemom@2nyt.com', crypt('hmom2nyt', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id
  RETURNING id INTO v_hmom_id;

  INSERT INTO public.profiles (user_id, full_name, is_active)
  VALUES (v_hmom_id, 'House Mom', true)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_hmom_id, 'house_mom')
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;
