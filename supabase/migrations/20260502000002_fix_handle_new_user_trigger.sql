-- Update handle_new_user to include club_id from app_metadata
-- Super admins won't have club_id, so we allow NULL by catching the exception
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  v_club_id := (NEW.raw_app_meta_data->>'club_id')::uuid;

  IF v_club_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, club_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), v_club_id);
  END IF;
  -- Super admins (no club_id) skip profile creation entirely

  RETURN NEW;
END;
$$;
