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
    const { email, password, full_name, role, pin_code, club_id } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "email, password, full_name, and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["owner", "admin", "manager", "door_staff", "room_attendant", "house_mom", "bartender", "dj", "backroom_tv"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create auth user (email pre-confirmed, club_id in app_metadata)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
      ...(club_id ? { app_metadata: { club_id } } : {}),
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Ensure profile exists (trigger may not fire for admin.createUser)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        full_name: full_name,
        is_active: true,
        ...(club_id ? { club_id } : {}),
      });
    }

    // Insert role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role, ...(club_id ? { club_id } : {}) });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw roleError;
    }

    // Store PIN if provided
    if (pin_code) {
      await supabaseAdmin
        .from("profiles")
        .update({ pin_code })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
