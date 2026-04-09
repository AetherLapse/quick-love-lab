import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { dancer_id } = await req.json();
    if (!dancer_id) {
      return new Response(JSON.stringify({ error: "dancer_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Dancer profile ──────────────────────────────────────────────────────
    const { data: dancer, error: dErr } = await supabase
      .from("dancers")
      .select("id, full_name, stage_name, email, phone, employee_id, dancer_number, is_enrolled")
      .eq("id", dancer_id)
      .single();

    if (dErr || !dancer) {
      return new Response(JSON.stringify({ error: "Dancer not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── 2. Stage names ─────────────────────────────────────────────────────────
    const { data: stageNames } = await supabase
      .from("dancer_stage_names")
      .select("id, name, is_active, created_at")
      .eq("dancer_id", dancer_id)
      .order("created_at", { ascending: false });

    // ── 3. Attendance history (last 60 days) ───────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: attendance } = await supabase
      .from("attendance_log")
      .select("id, shift_date, clock_in, clock_out, entrance_fee_amount, early_leave_fine, fine_waived")
      .eq("dancer_id", dancer_id)
      .gte("shift_date", sinceStr)
      .order("shift_date", { ascending: false });

    // ── 4. Room session earnings (same window) ─────────────────────────────────
    const { data: sessions } = await supabase
      .from("room_sessions")
      .select("shift_date, dancer_cut")
      .eq("dancer_id", dancer_id)
      .gte("shift_date", sinceStr);

    // Group room earnings by shift_date
    const earningsByDate: Record<string, number> = {};
    for (const s of sessions ?? []) {
      earningsByDate[s.shift_date] = (earningsByDate[s.shift_date] ?? 0) + Number(s.dancer_cut ?? 0);
    }

    // ── 5. Build shift summary ─────────────────────────────────────────────────
    const shifts = (attendance ?? []).map((a) => {
      const fee        = Number(a.entrance_fee_amount ?? 0);
      const fine       = a.fine_waived ? 0 : Number(a.early_leave_fine ?? 0);
      const earnings   = earningsByDate[a.shift_date] ?? 0;
      const net        = earnings - fee - fine; // positive = club owes dancer; negative = dancer owes club
      return {
        id:             a.id,
        shift_date:     a.shift_date,
        clock_in:       a.clock_in,
        clock_out:      a.clock_out,
        entrance_fee:   fee,
        early_leave_fine: Number(a.early_leave_fine ?? 0),
        fine_waived:    a.fine_waived,
        room_earnings:  earnings,
        net,
      };
    });

    // Outstanding = sum of all negative nets (what dancer still owes)
    const total_outstanding = shifts.reduce((sum, s) => sum + (s.net < 0 ? Math.abs(s.net) : 0), 0);

    return new Response(
      JSON.stringify({ dancer, stage_names: stageNames ?? [], shifts, total_outstanding }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
