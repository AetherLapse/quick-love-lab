import { supabase } from "@/integrations/supabase/client";

let _cached: string | null = null;

/** Called by ClubContext when domain resolves — sets club_id without touching auth */
export function setClubId(id: string) {
  _cached = id;
}

export async function getClubId(): Promise<string> {
  if (_cached) return _cached;
  // Last resort: read from auth session
  const { data: { session } } = await supabase.auth.getSession();
  const id = session?.user?.app_metadata?.club_id as string | undefined;
  if (!id) throw new Error("No club_id in session — user may not be logged in");
  _cached = id;
  return id;
}
