import { supabase } from "@/integrations/supabase/client";

let _cached: string | null = null;

export async function getClubId(): Promise<string> {
  if (_cached) return _cached;
  // Fallback: read from session (only runs if onAuthStateChange hasn't fired yet)
  const { data: { session } } = await supabase.auth.getSession();
  const id = session?.user?.app_metadata?.club_id as string | undefined;
  if (!id) throw new Error("No club_id in session — user may not be logged in");
  _cached = id;
  return id;
}

// Keep cache warm — fires on login, logout, token refresh
const { data: { subscription: _sub } } = supabase.auth.onAuthStateChange((_event, session) => {
  _cached = (session?.user?.app_metadata?.club_id as string) ?? null;
});
