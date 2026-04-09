import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { dancer_id, action, name, stage_name_id } = await req.json();
    if (!dancer_id || !action) {
      return new Response(JSON.stringify({ error: "dancer_id and action required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "add") {
      // Validate name
      const trimmed = (name ?? "").trim();
      if (!trimmed || trimmed.length < 2) {
        return new Response(JSON.stringify({ error: "Name must be at least 2 characters" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (trimmed.length > 30) {
        return new Response(JSON.stringify({ error: "Name must be 30 characters or less" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("dancer_stage_names")
        .insert({ dancer_id, name: trimmed, is_active: false })
        .select("id, name, is_active, created_at")
        .single();

      if (insertErr) {
        const msg = insertErr.message.includes("unique")
          ? "You already have a stage name with that name"
          : insertErr.message;
        return new Response(JSON.stringify({ error: msg }), {
          status: 409, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, stage_name: inserted }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "select") {
      if (!stage_name_id) {
        return new Response(JSON.stringify({ error: "stage_name_id required" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Fetch the chosen name to verify it belongs to this dancer
      const { data: chosen } = await supabase
        .from("dancer_stage_names")
        .select("id, name")
        .eq("id", stage_name_id)
        .eq("dancer_id", dancer_id)
        .single();

      if (!chosen) {
        return new Response(JSON.stringify({ error: "Stage name not found" }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Deactivate all → activate chosen (two queries; no transaction needed for soft-toggle)
      await supabase
        .from("dancer_stage_names")
        .update({ is_active: false })
        .eq("dancer_id", dancer_id);

      await supabase
        .from("dancer_stage_names")
        .update({ is_active: true })
        .eq("id", stage_name_id);

      // Mirror to dancers.stage_name
      await supabase
        .from("dancers")
        .update({ stage_name: chosen.name })
        .eq("id", dancer_id);

      return new Response(JSON.stringify({ success: true, active_name: chosen.name }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
