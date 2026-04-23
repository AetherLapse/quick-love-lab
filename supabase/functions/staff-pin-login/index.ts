import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { role, pin } = await req.json();

    if (!role || !pin) {
      return new Response(JSON.stringify({ success: false, reason: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find staff member by PIN
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, full_name, user_id, is_active")
      .eq("pin_code", String(pin))
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ success: false, reason: "wrong_pin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.is_active) {
      return new Response(JSON.stringify({ success: false, reason: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the staff member's actual role (don't filter by the requested role —
    // the button click is just a hint, the DB role is authoritative)
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ success: false, reason: "no_role" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actualRole = roleRow.role as string;

    // Get user's email so we can generate a magic-link token
    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(profile.user_id);
    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ success: false, reason: "user_not_found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic-link token (does NOT send email — we just extract the token)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(
        JSON.stringify({ success: false, reason: "link_error", detail: linkErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record check-in using the staff member's actual role
    const today = new Date().toISOString().split("T")[0];
    await admin.from("staff_attendance").insert({
      profile_id: profile.id,
      role:       actualRole,
      shift_date: today,
      clock_in:   new Date().toISOString(),
    });

    // Return the hashed_token — the client will call verifyOtp to exchange it for a session
    return new Response(
      JSON.stringify({
        success:      true,
        token_hash:   linkData.properties.hashed_token,
        full_name:    profile.full_name,
        role:         actualRole,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, reason: "server_error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
