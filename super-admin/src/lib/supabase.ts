import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const SERVICE = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

export const supabase = createClient(URL, ANON);

export const adminClient = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
