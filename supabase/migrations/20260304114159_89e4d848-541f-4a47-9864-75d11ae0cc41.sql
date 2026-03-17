
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'door_staff', 'room_attendant');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  pin_code TEXT,
  employee_id TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Dancers table (contractors)
CREATE TABLE public.dancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  pin_code TEXT NOT NULL,
  payout_percentage NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  entrance_fee NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance log
CREATE TABLE public.attendance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id UUID REFERENCES public.dancers(id) NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  entrance_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer entries
CREATE TABLE public.customer_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  door_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID REFERENCES auth.users(id)
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id UUID REFERENCES public.dancers(id) NOT NULL,
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  num_songs INTEGER NOT NULL DEFAULT 1,
  gross_amount NUMERIC(10,2) NOT NULL,
  house_cut NUMERIC(10,2) NOT NULL,
  dancer_cut NUMERIC(10,2) NOT NULL,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Club settings
CREATE TABLE public.club_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_price NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  default_door_fee NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  default_dancer_entrance_fee NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  default_dancer_payout_pct NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read dancers" ON public.dancers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage dancers" ON public.dancers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert attendance" ON public.attendance_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can read attendance" ON public.attendance_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can update attendance" ON public.attendance_log FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can insert customer entries" ON public.customer_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can read customer entries" ON public.customer_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can read transactions" ON public.transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can read settings" ON public.club_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.club_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.club_settings (song_price, default_door_fee, default_dancer_entrance_fee, default_dancer_payout_pct)
VALUES (50.00, 20.00, 50.00, 30.00);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dancers_updated_at BEFORE UPDATE ON public.dancers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_club_settings_updated_at BEFORE UPDATE ON public.club_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
