import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action } = body;
  if (!action) return json({ error: "action required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── verify_staff_pin ───────────────────────────────────────────────────────
  if (action === "verify_staff_pin") {
    const { user_id, pin } = body as { user_id: string; pin: string };
    if (!user_id || !pin) return json({ success: false, reason: "missing_fields" }, 400);

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", user_id)
      .eq("pin_code", String(pin))
      .maybeSingle();

    if (error) return json({ success: false, reason: "server_error" }, 500);
    if (!data) return json({ success: false, reason: "wrong_pin" });
    return json({ success: true, full_name: data.full_name });
  }

  // ── verify_dancer_pin ──────────────────────────────────────────────────────
  if (action === "verify_dancer_pin") {
    const { dancer_id, pin } = body as { dancer_id: string; pin: string };
    if (!dancer_id || !pin) return json({ success: false, reason: "missing_fields" }, 400);

    const { data, error } = await supabase
      .from("dancers")
      .select("id, stage_name, full_name")
      .eq("id", dancer_id)
      .eq("pin_code", String(pin))
      .maybeSingle();

    if (error) return json({ success: false, reason: "server_error" }, 500);
    if (!data) return json({ success: false, reason: "wrong_pin" });
    return json({ success: true, stage_name: data.stage_name });
  }

  // ── get_checkout_summary ───────────────────────────────────────────────────
  if (action === "get_checkout_summary") {
    const { dancer_id } = body as { dancer_id: string };
    if (!dancer_id) return json({ error: "dancer_id required" }, 400);

    const todayStr = new Date().toISOString().slice(0, 10);

    // Tonight's attendance entry (open clock-out)
    const { data: attendance } = await supabase
      .from("attendance_log")
      .select("id, clock_in, clock_out, entrance_fee_amount, early_leave_fine, fine_waived, shift_date, amount_paid, payment_status")
      .eq("dancer_id", dancer_id)
      .eq("shift_date", todayStr)
      .is("clock_out", null)
      .maybeSingle();

    // Tonight's room sessions
    const { data: sessions } = await supabase
      .from("room_sessions")
      .select("id, room_name, package_name, gross_amount, dancer_cut, entry_time, exit_time")
      .eq("dancer_id", dancer_id)
      .eq("shift_date", todayStr)
      .order("entry_time", { ascending: true });

    const tonightEarnings = (sessions ?? []).reduce(
      (s: number, r: any) => s + Number(r.dancer_cut ?? 0), 0
    );

    const entranceFee = Number(attendance?.entrance_fee_amount ?? 0);
    const earlyFine   = attendance?.fine_waived ? 0 : Number(attendance?.early_leave_fine ?? 0);
    const tonightNet  = tonightEarnings - entranceFee - earlyFine;

    // All-time outstanding (all shifts where net < 0 and clock_out is not null)
    const sinceStr = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const { data: allAttendance } = await supabase
      .from("attendance_log")
      .select("id, shift_date, entrance_fee_amount, early_leave_fine, fine_waived")
      .eq("dancer_id", dancer_id)
      .gte("shift_date", sinceStr)
      .not("clock_out", "is", null);

    const { data: allSessions } = await supabase
      .from("room_sessions")
      .select("shift_date, dancer_cut")
      .eq("dancer_id", dancer_id)
      .gte("shift_date", sinceStr);

    const earningsByDate: Record<string, number> = {};
    for (const s of allSessions ?? []) {
      earningsByDate[s.shift_date] = (earningsByDate[s.shift_date] ?? 0) + Number(s.dancer_cut ?? 0);
    }

    let historicalOutstanding = 0;
    for (const a of allAttendance ?? []) {
      const fee  = Number(a.entrance_fee_amount ?? 0);
      const fine = a.fine_waived ? 0 : Number(a.early_leave_fine ?? 0);
      const earn = earningsByDate[a.shift_date] ?? 0;
      const net  = earn - fee - fine;
      if (net < 0) historicalOutstanding += Math.abs(net);
    }

    return json({
      attendance,
      sessions: sessions ?? [],
      tonightEarnings,
      entranceFee,
      earlyFine,
      tonightNet,
      historicalOutstanding,
      totalOwed:     historicalOutstanding + (tonightNet < 0 ? Math.abs(tonightNet) : 0),
      amountPaid:    Number(attendance?.amount_paid ?? 0),
      paymentStatus: attendance?.payment_status ?? "unpaid",
    });
  }

  return json({ error: "Unknown action" }, 400);
});
