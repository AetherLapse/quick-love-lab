
-- Tighten attendance update to only allow updating records logged today
DROP POLICY "Staff can update attendance" ON public.attendance_log;
CREATE POLICY "Staff can update attendance" ON public.attendance_log FOR UPDATE TO authenticated USING (shift_date = CURRENT_DATE);

-- Tighten insert policies to require logged_by = auth.uid() where applicable
DROP POLICY "Staff can insert customer entries" ON public.customer_entries;
CREATE POLICY "Staff can insert customer entries" ON public.customer_entries FOR INSERT TO authenticated WITH CHECK (logged_by = auth.uid());

DROP POLICY "Staff can insert transactions" ON public.transactions;
CREATE POLICY "Staff can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (logged_by = auth.uid());
