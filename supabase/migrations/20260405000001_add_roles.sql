-- Add missing roles to app_role enum
-- Roles: owner, admin, manager, door_staff, room_attendant, house_mom

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- house_mom was already added in phase2 migration, included here for clarity
-- ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'house_mom';

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
