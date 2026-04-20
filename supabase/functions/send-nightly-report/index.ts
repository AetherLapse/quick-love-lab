import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL    = Deno.env.get("REPORT_FROM_EMAIL") ?? "reports@2nyt.app";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const fmt  = (n: number) => `$${Number(n).toFixed(2)}`;
const fmtN = (n: number) => n.toLocaleString();

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function fetchDayData(dateStr: string) {
  const [{ data: entries }, { data: attendance }, { data: rooms }] = await Promise.all([
    supabase.from("customer_entries").select("guest_count, door_fee").eq("entry_date", dateStr),
    supabase.from("attendance_log")
      .select("dancer_id, entrance_fee_amount, early_leave_fine, fine_waived, amount_paid, payment_status, dancers(stage_name)")
      .eq("shift_date", dateStr),
    supabase.from("room_sessions")
      .select("gross_amount, house_cut, dancer_cut, package_name")
      .eq("shift_date", dateStr),
  ]);

  const totalGuests   = (entries ?? []).reduce((s: number, e: any) => s + Number(e.guest_count ?? 0), 0);
  const doorRevenue   = (entries ?? []).reduce((s: number, e: any) => s + Number(e.door_fee ?? 0), 0);
  const roomGross     = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.gross_amount ?? 0), 0);
  const roomHouse     = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.house_cut ?? 0), 0);
  const houseFees     = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.entrance_fee_amount ?? 0), 0);
  const musicFees     = (attendance ?? []).length * 20;
  const finesCollected = (attendance ?? []).reduce((s: number, a: any) =>
    s + (a.fine_waived ? 0 : Number(a.early_leave_fine ?? 0)), 0);
  const totalPaid     = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.amount_paid ?? 0), 0);

  const unpaidDancers = (attendance ?? []).filter((a: any) =>
    a.payment_status !== "paid_checkin" && a.payment_status !== "paid_during" &&
    a.payment_status !== "paid_checkout" && a.payment_status !== "ran_off"
  );
  const ranOffDancers = (attendance ?? []).filter((a: any) => a.payment_status === "ran_off");

  return {
    dateStr, totalGuests, doorRevenue, roomGross, roomHouse,
    houseFees, musicFees, finesCollected, totalPaid,
    dancerCount: (attendance ?? []).length,
    roomCount:   (rooms ?? []).length,
    grossTotal:  doorRevenue + roomHouse + houseFees + musicFees + finesCollected,
    attendance:  attendance ?? [],
    unpaidDancers, ranOffDancers,
  };
}

async function fetchWeekData(endDate: Date) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - 6);
  const startStr = isoDate(start);
  const endStr   = isoDate(endDate);

  const [{ data: entries }, { data: attendance }, { data: rooms }] = await Promise.all([
    supabase.from("customer_entries").select("guest_count, door_fee, entry_date")
      .gte("entry_date", startStr).lte("entry_date", endStr),
    supabase.from("attendance_log")
      .select("entrance_fee_amount, early_leave_fine, fine_waived, amount_paid, payment_status, shift_date")
      .gte("shift_date", startStr).lte("shift_date", endStr),
    supabase.from("room_sessions")
      .select("gross_amount, house_cut, shift_date")
      .gte("shift_date", startStr).lte("shift_date", endStr),
  ]);

  const totalGuests = (entries ?? []).reduce((s: number, e: any) => s + Number(e.guest_count ?? 0), 0);
  const doorRevenue = (entries ?? []).reduce((s: number, e: any) => s + Number(e.door_fee ?? 0), 0);
  const roomHouse   = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.house_cut ?? 0), 0);
  const houseFees   = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.entrance_fee_amount ?? 0), 0);
  const musicFees   = (attendance ?? []).length * 20;
  const fines       = (attendance ?? []).reduce((s: number, a: any) =>
    s + (a.fine_waived ? 0 : Number(a.early_leave_fine ?? 0)), 0);

  // Group by date for per-night breakdown
  const byDate: Record<string, { guests: number; door: number; rooms: number; dancers: number }> = {};
  const addDay = (d: string) => { if (!byDate[d]) byDate[d] = { guests: 0, door: 0, rooms: 0, dancers: 0 }; };
  (entries ?? []).forEach((e: any) => { addDay(e.entry_date); byDate[e.entry_date].guests += Number(e.guest_count ?? 0); byDate[e.entry_date].door += Number(e.door_fee ?? 0); });
  (rooms   ?? []).forEach((r: any) => { addDay(r.shift_date); byDate[r.shift_date].rooms += Number(r.house_cut ?? 0); });
  (attendance ?? []).forEach((a: any) => { addDay(a.shift_date); byDate[a.shift_date].dancers++; });

  return {
    startStr, endStr, totalGuests, doorRevenue, roomHouse,
    houseFees, musicFees, fines, byDate,
    grossTotal: doorRevenue + roomHouse + houseFees + musicFees + fines,
    dancerNights: (attendance ?? []).length,
  };
}

// ── HTML builders ──────────────────────────────────────────────────────────────

const css = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 20px; color: #1d1d1f; }
  .wrap { max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #2d1f3d 0%, #4a1942 100%); border-radius: 16px 16px 0 0; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
  .header p  { color: rgba(255,255,255,0.6); margin: 0; font-size: 13px; }
  .body { background: #fff; border-radius: 0 0 16px 16px; padding: 28px 32px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; }
  .kpi { background: #f5f5f7; border-radius: 12px; padding: 16px; }
  .kpi .label { font-size: 11px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi .value { font-size: 24px; font-weight: 800; color: #1d1d1f; }
  .kpi.green .value { color: #1d9d5f; }
  .kpi.pink  .value { color: #c2185b; }
  .section-title { font-size: 11px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 0.8px; margin: 24px 0 10px; border-bottom: 1px solid #e8e8ed; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #86868b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; }
  td { padding: 8px 8px; border-bottom: 1px solid #f0f0f5; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .badge.green  { background: #d1fae5; color: #065f46; }
  .badge.amber  { background: #fef3c7; color: #92400e; }
  .badge.red    { background: #fee2e2; color: #991b1b; }
  .total-row { background: #1d1d1f; color: #fff; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .total-row .label { font-size: 12px; opacity: 0.7; }
  .total-row .value { font-size: 22px; font-weight: 800; color: #ffd60a; }
  .alert { background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 12px 16px; margin: 12px 0; font-size: 13px; }
  .footer { text-align: center; padding: 20px; color: #86868b; font-size: 11px; }
`;

function dailyHtml(d: Awaited<ReturnType<typeof fetchDayData>>, dateLabel: string) {
  const dancerRows = d.attendance.map((a: any) => {
    const ps = a.payment_status ?? "unpaid";
    const badgeClass = ps === "ran_off" ? "red" : (ps === "unpaid" ? "amber" : "green");
    const badgeLabel = { paid_checkin: "Paid Check-In", paid_during: "Paid During", paid_checkout: "Paid Check-Out", ran_off: "Ran Off", unpaid: "Unpaid" }[ps] ?? ps;
    return `<tr>
      <td><strong>${a.dancers?.stage_name ?? "—"}</strong></td>
      <td>${fmt(Number(a.entrance_fee_amount ?? 0))}</td>
      <td>${fmt(Number(a.amount_paid ?? 0))}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
    </tr>`;
  }).join("");

  const alertSection = [
    d.ranOffDancers.length > 0 ? `<div class="alert">⚠️ <strong>${d.ranOffDancers.length} dancer(s) ran off</strong> without paying: ${d.ranOffDancers.map((a: any) => a.dancers?.stage_name ?? "Unknown").join(", ")}</div>` : "",
    d.unpaidDancers.length > 0 ? `<div class="alert" style="background:#fff3f3;border-color:#f87171;">🔴 <strong>${d.unpaidDancers.length} dancer(s) still unpaid</strong></div>` : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>📊 Daily Report</h1>
      <p>${dateLabel}</p>
    </div>
    <div class="body">
      ${alertSection}
      <div class="kpi-grid">
        <div class="kpi"><div class="label">Door Guests</div><div class="value">${fmtN(d.totalGuests)}</div></div>
        <div class="kpi green"><div class="label">Door Revenue</div><div class="value">${fmt(d.doorRevenue)}</div></div>
        <div class="kpi pink"><div class="label">Dancers In</div><div class="value">${fmtN(d.dancerCount)}</div></div>
        <div class="kpi green"><div class="label">Room Revenue</div><div class="value">${fmt(d.roomGross)}</div></div>
        <div class="kpi"><div class="label">House Fees Owed</div><div class="value">${fmt(d.houseFees + d.musicFees)}</div></div>
        <div class="kpi green"><div class="label">House Fees Collected</div><div class="value">${fmt(d.totalPaid)}</div></div>
      </div>

      ${d.attendance.length > 0 ? `
      <div class="section-title">Dancer Summary</div>
      <table>
        <tr><th>Dancer</th><th>House Fee</th><th>Paid</th><th>Status</th></tr>
        ${dancerRows}
      </table>` : ""}

      <div class="total-row">
        <div><div class="label">Gross Night Total</div></div>
        <div class="value">${fmt(d.grossTotal)}</div>
      </div>
    </div>
    <div class="footer">2NYT Entertainment · Automated nightly report</div>
  </div>
</body></html>`;
}

function weeklyHtml(w: Awaited<ReturnType<typeof fetchWeekData>>) {
  const days = Object.entries(w.byDate).sort(([a], [b]) => a.localeCompare(b));
  const dayRows = days.map(([d, v]) => {
    const label = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `<tr>
      <td>${label}</td>
      <td>${fmtN(v.guests)}</td>
      <td>${fmt(v.door)}</td>
      <td>${fmtN(v.dancers)}</td>
      <td>${fmt(v.rooms)}</td>
    </tr>`;
  }).join("");

  const startLabel = new Date(w.startStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel   = new Date(w.endStr   + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>📅 Weekly Report</h1>
      <p>${startLabel} – ${endLabel}</p>
    </div>
    <div class="body">
      <div class="kpi-grid">
        <div class="kpi"><div class="label">Total Guests</div><div class="value">${fmtN(w.totalGuests)}</div></div>
        <div class="kpi green"><div class="label">Door Revenue</div><div class="value">${fmt(w.doorRevenue)}</div></div>
        <div class="kpi pink"><div class="label">Dancer Nights</div><div class="value">${fmtN(w.dancerNights)}</div></div>
        <div class="kpi green"><div class="label">Room Revenue</div><div class="value">${fmt(w.roomHouse)}</div></div>
        <div class="kpi"><div class="label">House Fees</div><div class="value">${fmt(w.houseFees + w.musicFees)}</div></div>
        <div class="kpi"><div class="label">Fines Collected</div><div class="value">${fmt(w.fines)}</div></div>
      </div>

      <div class="section-title">Night-by-Night Breakdown</div>
      <table>
        <tr><th>Night</th><th>Guests</th><th>Door</th><th>Dancers</th><th>Rooms</th></tr>
        ${dayRows}
      </table>

      <div class="total-row">
        <div><div class="label">Week Gross Total</div></div>
        <div class="value">${fmt(w.grossTotal)}</div>
      </div>
    </div>
    <div class="footer">2NYT Entertainment · Automated weekly report</div>
  </div>
</body></html>`;
}

// ── Handler ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });

  const body = await req.json().catch(() => ({}));
  const type: "daily" | "weekly" = body.type ?? "daily";

  // Load report email from settings
  const { data: settings } = await supabase.from("club_settings").select("report_email, daily_report_enabled, weekly_report_enabled").single();
  const toEmail = body.to_email ?? settings?.report_email;

  if (!toEmail) return new Response(JSON.stringify({ error: "No report_email configured in club settings" }), { status: 400 });
  if (type === "daily"  && settings?.daily_report_enabled  === false) return new Response(JSON.stringify({ skipped: "daily reports disabled" }));
  if (type === "weekly" && settings?.weekly_report_enabled === false) return new Response(JSON.stringify({ skipped: "weekly reports disabled" }));
  if (!RESEND_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY secret not set" }), { status: 500 });

  const now = new Date();
  // For nightly cron at 3 AM: report is for yesterday
  const reportDate = new Date(now);
  reportDate.setDate(reportDate.getDate() - 1);

  let html: string;
  let subject: string;

  if (type === "daily") {
    const dateStr   = isoDate(reportDate);
    const dateLabel = reportDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const data      = await fetchDayData(dateStr);
    html    = dailyHtml(data, dateLabel);
    subject = `2NYT Daily Report — ${dateLabel}`;
  } else {
    const data = await fetchWeekData(reportDate);
    html    = weeklyHtml(data);
    subject = `2NYT Weekly Report — ${data.startStr} to ${data.endStr}`;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [toEmail], subject, html }),
  });

  const result = await res.json();
  if (!res.ok) return new Response(JSON.stringify({ error: "Resend error", detail: result }), { status: 502 });

  return new Response(JSON.stringify({ ok: true, id: result.id, to: toEmail, type }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
