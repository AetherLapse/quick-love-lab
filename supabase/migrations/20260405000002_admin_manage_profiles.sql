-- Allow admins and owners to update any profile (e.g. toggle is_active)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner')
  );

-- Allow admins and owners to read all user_roles
CREATE POLICY "Admins can read all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner')
  );

notify pgrst, 'reload schema';
