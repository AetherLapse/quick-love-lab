import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { dancer_id, action, name, stage_name_id } = body as {
    dancer_id?: string;
    action?: string;
    name?: string;
    stage_name_id?: string;
  };

  if (!dancer_id || !action) {
    return json({ error: "dancer_id and action are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfiguration" }, 500);
  }

  const db = createClient(supabaseUrl, serviceKey);

  try {
    // ── ADD ───────────────────────────────────────────────────────────────────
    if (action === "add") {
      const trimmed = String(name ?? "").trim();
      if (trimmed.length < 2)  return json({ error: "Name must be at least 2 characters" }, 400);
      if (trimmed.length > 30) return json({ error: "Name must be 30 characters or less" }, 400);

      // Get club_id from the dancer record
      const { data: dancer } = await db.from("dancers").select("club_id").eq("id", dancer_id).single();
      const club_id = (dancer as any)?.club_id;

      const { data: inserted, error: insertErr } = await db
        .from("dancer_stage_names")
        .insert({ dancer_id, name: trimmed, is_active: false, ...(club_id ? { club_id } : {}) })
        .select("id, name, is_active, created_at")
        .single();

      if (insertErr) {
        const msg = insertErr.message.toLowerCase().includes("unique")
          ? "You already have a stage name with that spelling"
          : `DB error: ${insertErr.message}`;
        return json({ error: msg }, 409);
      }

      return json({ success: true, stage_name: inserted });
    }

    // ── SELECT ────────────────────────────────────────────────────────────────
    if (action === "select") {
      if (!stage_name_id) return json({ error: "stage_name_id required" }, 400);

      const { data: chosen } = await db
        .from("dancer_stage_names")
        .select("id, name")
        .eq("id", stage_name_id)
        .eq("dancer_id", dancer_id)
        .single();

      if (!chosen) return json({ error: "Stage name not found for this dancer" }, 404);

      await db.from("dancer_stage_names").update({ is_active: false }).eq("dancer_id", dancer_id);
      await db.from("dancer_stage_names").update({ is_active: true  }).eq("id", stage_name_id);
      await db.from("dancers").update({ stage_name: (chosen as any).name }).eq("id", dancer_id);

      return json({ success: true, active_name: (chosen as any).name });
    }

    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (err) {
    return json({ error: `Unhandled error: ${String(err)}` }, 500);
  }
});
