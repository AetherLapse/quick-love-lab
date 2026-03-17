-- Add profile_photo_url to dancers table
-- Stored in private Supabase Storage bucket, used for display only.
-- Separate from facial_hash (AWS Rekognition FaceId used for biometric check-in).

ALTER TABLE public.dancers
  ADD COLUMN profile_photo_url TEXT;

-- Create private storage bucket for dancer profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dancer-profiles', 'dancer-profiles', false);

-- Storage RLS: only admins and managers can upload/update photos
CREATE POLICY "Managers can upload dancer photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dancer-profiles' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager')
    )
  );

CREATE POLICY "Managers can update dancer photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dancer-profiles' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager')
    )
  );

CREATE POLICY "Managers can delete dancer photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dancer-profiles' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'manager')
    )
  );

-- Authenticated staff can read (to display in UI)
CREATE POLICY "Staff can read dancer photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dancer-profiles');
