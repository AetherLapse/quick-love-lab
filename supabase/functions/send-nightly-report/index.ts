import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL    = Deno.env.get("REPORT_FROM_EMAIL") ?? "reports@aethercodes.xyz";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const fmt  = (n: number) => `$${Number(n).toFixed(2)}`;
const fmtN = (n: number) => n.toLocaleString();

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function fetchDayData(dateStr: string) {
  const [
    { data: entries },
    { data: attendance },
    { data: rooms },
  ] = await Promise.all([
    supabase.from("customer_entries")
      .select("guest_count, door_fee, entry_tier_id, entry_tiers(name, price)")
      .eq("shift_date", dateStr),
    supabase.from("attendance_log")
      .select("dancer_id, entrance_fee_amount, late_arrival_fee_amount, early_leave_fine, fine_waived, amount_paid, payment_status, check_in_time, dancers(stage_name)")
      .eq("shift_date", dateStr)
      .order("check_in_time", { ascending: true }),
    supabase.from("room_sessions")
      .select("gross_amount, house_cut, dancer_cut, package_name, room_name, entry_time")
      .eq("shift_date", dateStr)
      .order("entry_time", { ascending: true }),
  ]);

  const totalGuests  = (entries ?? []).reduce((s: number, e: any) => s + Number(e.guest_count ?? 0), 0);
  const doorRevenue  = (entries ?? []).reduce((s: number, e: any) => s + Number(e.door_fee ?? 0), 0);
  const roomGross    = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.gross_amount ?? 0), 0);
  const roomHouse    = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.house_cut ?? 0), 0);
  const houseFees    = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.entrance_fee_amount ?? 0), 0);
  const lateFees     = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.late_arrival_fee_amount ?? 0), 0);
  const musicFees    = (attendance ?? []).length * 20;
  const finesOwed    = (attendance ?? []).reduce((s: number, a: any) =>
    s + (a.fine_waived ? 0 : Number(a.early_leave_fine ?? 0)), 0);
  const totalPaid    = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.amount_paid ?? 0), 0);

  // Group door entries by tier
  const tierMap: Record<string, { name: string; price: number; guests: number; revenue: number }> = {};
  for (const e of (entries ?? []) as any[]) {
    const tierName = e.entry_tiers?.name ?? "Unknown";
    const price    = Number(e.entry_tiers?.price ?? 0);
    if (!tierMap[tierName]) tierMap[tierName] = { name: tierName, price, guests: 0, revenue: 0 };
    tierMap[tierName].guests  += Number(e.guest_count ?? 1);
    tierMap[tierName].revenue += Number(e.door_fee ?? 0);
  }
  const tierRows = Object.values(tierMap).sort((a, b) => b.revenue - a.revenue);

  // Group rooms by package
  const packageMap: Record<string, { name: string; count: number; gross: number; house: number; dancer: number }> = {};
  for (const r of (rooms ?? []) as any[]) {
    const key = r.package_name ?? "Room Session";
    if (!packageMap[key]) packageMap[key] = { name: key, count: 0, gross: 0, house: 0, dancer: 0 };
    packageMap[key].count  += 1;
    packageMap[key].gross  += Number(r.gross_amount ?? 0);
    packageMap[key].house  += Number(r.house_cut ?? 0);
    packageMap[key].dancer += Number(r.dancer_cut ?? 0);
  }
  const packageRows = Object.values(packageMap).sort((a, b) => b.gross - a.gross);

  const unpaidDancers = (attendance ?? []).filter((a: any) =>
    !["paid_checkin","paid_during","paid_checkout","ran_off"].includes(a.payment_status)
  );
  const ranOffDancers = (attendance ?? []).filter((a: any) => a.payment_status === "ran_off");
  const lateDancers   = (attendance ?? []).filter((a: any) => Number(a.late_arrival_fee_amount ?? 0) > 0);

  return {
    dateStr, totalGuests, doorRevenue, roomGross, roomHouse,
    houseFees, lateFees, musicFees, finesOwed, totalPaid,
    dancerCount:  (attendance ?? []).length,
    roomCount:    (rooms ?? []).length,
    grossTotal:   doorRevenue + roomHouse + houseFees + lateFees + musicFees + finesOwed,
    attendance:   attendance ?? [],
    rooms:        rooms ?? [],
    tierRows, packageRows,
    unpaidDancers, ranOffDancers, lateDancers,
  };
}

async function fetchWeekData(endDate: Date) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - 6);
  const startStr = isoDate(start);
  const endStr   = isoDate(endDate);

  const [{ data: entries }, { data: attendance }, { data: rooms }] = await Promise.all([
    supabase.from("customer_entries")
      .select("guest_count, door_fee, shift_date, entry_tiers(name)")
      .gte("shift_date", startStr).lte("shift_date", endStr),
    supabase.from("attendance_log")
      .select("entrance_fee_amount, late_arrival_fee_amount, early_leave_fine, fine_waived, amount_paid, payment_status, shift_date")
      .gte("shift_date", startStr).lte("shift_date", endStr),
    supabase.from("room_sessions")
      .select("gross_amount, house_cut, dancer_cut, shift_date")
      .gte("shift_date", startStr).lte("shift_date", endStr),
  ]);

  const totalGuests   = (entries ?? []).reduce((s: number, e: any) => s + Number(e.guest_count ?? 0), 0);
  const doorRevenue   = (entries ?? []).reduce((s: number, e: any) => s + Number(e.door_fee ?? 0), 0);
  const roomHouse     = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.house_cut ?? 0), 0);
  const roomGross     = (rooms   ?? []).reduce((s: number, r: any) => s + Number(r.gross_amount ?? 0), 0);
  const houseFees     = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.entrance_fee_amount ?? 0), 0);
  const lateFees      = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.late_arrival_fee_amount ?? 0), 0);
  const musicFees     = (attendance ?? []).length * 20;
  const fines         = (attendance ?? []).reduce((s: number, a: any) =>
    s + (a.fine_waived ? 0 : Number(a.early_leave_fine ?? 0)), 0);
  const totalPaid     = (attendance ?? []).reduce((s: number, a: any) => s + Number(a.amount_paid ?? 0), 0);
  const ranOffCount   = (attendance ?? []).filter((a: any) => a.payment_status === "ran_off").length;
  const unpaidCount   = (attendance ?? []).filter((a: any) =>
    !["paid_checkin","paid_during","paid_checkout","ran_off"].includes(a.payment_status)
  ).length;

  // Group by date for per-night breakdown
  const byDate: Record<string, { guests: number; door: number; rooms: number; dancers: number; houseFees: number; lateFees: number }> = {};
  const addDay = (d: string) => {
    if (!byDate[d]) byDate[d] = { guests: 0, door: 0, rooms: 0, dancers: 0, houseFees: 0, lateFees: 0 };
  };
  (entries ?? []).forEach((e: any) => {
    addDay(e.shift_date);
    byDate[e.shift_date].guests += Number(e.guest_count ?? 0);
    byDate[e.shift_date].door   += Number(e.door_fee ?? 0);
  });
  (rooms ?? []).forEach((r: any) => {
    addDay(r.shift_date);
    byDate[r.shift_date].rooms += Number(r.house_cut ?? 0);
  });
  (attendance ?? []).forEach((a: any) => {
    addDay(a.shift_date);
    byDate[a.shift_date].dancers   += 1;
    byDate[a.shift_date].houseFees += Number(a.entrance_fee_amount ?? 0);
    byDate[a.shift_date].lateFees  += Number(a.late_arrival_fee_amount ?? 0);
  });

  return {
    startStr, endStr, totalGuests, doorRevenue, roomHouse, roomGross,
    houseFees, lateFees, musicFees, fines, totalPaid,
    byDate, ranOffCount, unpaidCount,
    grossTotal: doorRevenue + roomHouse + houseFees + lateFees + musicFees + fines,
    dancerNights: (attendance ?? []).length,
  };
}

// ── HTML builders ──────────────────────────────────────────────────────────────

const css = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f0f5; margin: 0; padding: 24px 16px; color: #1d1d1f; }
  .wrap { max-width: 620px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #2d1f3d 0%, #6b21a8 100%); border-radius: 16px 16px 0 0; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
  .header p  { color: rgba(255,255,255,0.65); margin: 0; font-size: 13px; }
  .body { background: #fff; border-radius: 0 0 16px 16px; padding: 24px 28px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 24px; }
  .kpi { background: #f5f5f7; border-radius: 12px; padding: 14px 16px; }
  .kpi .label { font-size: 10px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi .value { font-size: 20px; font-weight: 800; color: #1d1d1f; }
  .kpi.green .value { color: #16a34a; }
  .kpi.pink  .value { color: #c2185b; }
  .kpi.amber .value { color: #d97706; }
  .section { margin: 20px 0 0; }
  .section-title { font-size: 10px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e8e8ed; display: flex; align-items: center; gap: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #86868b; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 8px; }
  th.right, td.right { text-align: right; }
  td { padding: 9px 8px; border-bottom: 1px solid #f0f0f5; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
  .badge.green  { background: #dcfce7; color: #166534; }
  .badge.amber  { background: #fef9c3; color: #854d0e; }
  .badge.red    { background: #fee2e2; color: #991b1b; }
  .badge.purple { background: #f3e8ff; color: #6b21a8; }
  .total-row { background: linear-gradient(135deg, #2d1f3d, #6b21a8); color: #fff; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
  .total-row .label { font-size: 12px; opacity: 0.7; }
  .total-row .value { font-size: 26px; font-weight: 800; color: #fde68a; }
  .alert { border-radius: 10px; padding: 12px 16px; margin: 0 0 12px; font-size: 13px; }
  .alert.warn { background: #fffbeb; border: 1px solid #fcd34d; }
  .alert.danger { background: #fef2f2; border: 1px solid #fca5a5; }
  .fee-cell { line-height: 1.3; }
  .fee-cell .main { font-weight: 600; }
  .fee-cell .sub  { font-size: 11px; color: #86868b; }
  .zero { color: #c5c5c7; }
  .divider { height: 1px; background: #f0f0f5; margin: 20px 0; }
  .footer { text-align: center; padding: 20px; color: #86868b; font-size: 11px; }
  .pill-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
  .pill { background: #f5f5f7; border-radius: 20px; padding: 3px 10px; font-size: 11px; color: #3f3f46; }
`;

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function dailyHtml(d: Awaited<ReturnType<typeof fetchDayData>>, dateLabel: string) {

  // ── Alerts ──
  const alerts = [
    d.ranOffDancers.length > 0
      ? `<div class="alert danger">⚠️ <strong>${d.ranOffDancers.length} dancer(s) ran off</strong> without paying: ${d.ranOffDancers.map((a: any) => a.dancers?.stage_name ?? "Unknown").join(", ")}</div>`
      : "",
    d.unpaidDancers.length > 0
      ? `<div class="alert warn">🔴 <strong>${d.unpaidDancers.length} dancer(s) still unpaid</strong> — follow up before next shift</div>`
      : "",
  ].filter(Boolean).join("");

  // ── Door entry tier table ──
  const ALL_TIERS = ["Full Cover", "2-for-1 Card", "Reduced Cover", "VIP", "CCC Card"];
  const tierByName: Record<string, typeof d.tierRows[0]> = {};
  for (const t of d.tierRows) tierByName[t.name] = t;

  const tierTableRows = ALL_TIERS.map(name => {
    const t = tierByName[name];
    const guests  = t?.guests  ?? 0;
    const revenue = t?.revenue ?? 0;
    const price   = t?.price   ?? 0;
    return `<tr>
      <td><div class="fee-cell"><div class="main">${name}</div><div class="sub">${fmt(price)} / person</div></div></td>
      <td class="right ${guests === 0 ? "zero" : ""}">${guests}</td>
      <td class="right ${revenue === 0 ? "zero" : ""}"><strong>${fmt(revenue)}</strong></td>
    </tr>`;
  }).join("");

  const doorSection = `
  <div class="section">
    <div class="section-title">🚪 Door Entry</div>
    <div class="kpi-grid" style="grid-template-columns:1fr 1fr;">
      <div class="kpi"><div class="label">Total Guests</div><div class="value">${fmtN(d.totalGuests)}</div></div>
      <div class="kpi green"><div class="label">Door Revenue</div><div class="value">${fmt(d.doorRevenue)}</div></div>
    </div>
    <table>
      <tr><th>Tier</th><th class="right">Guests</th><th class="right">Revenue</th></tr>
      ${tierTableRows}
      <tr style="background:#f9f9fb;">
        <td><strong>Total</strong></td>
        <td class="right"><strong>${d.totalGuests}</strong></td>
        <td class="right"><strong style="color:#16a34a;">${fmt(d.doorRevenue)}</strong></td>
      </tr>
    </table>
  </div>`;

  // ── Dancer section ──
  const dancerRows = d.attendance.map((a: any) => {
    const ps          = a.payment_status ?? "unpaid";
    const badgeClass  = ps === "ran_off" ? "red" : (ps === "unpaid" ? "amber" : "green");
    const badgeLabel  = ({ paid_checkin: "Paid Check-In", paid_during: "Paid During", paid_checkout: "Paid Check-Out", ran_off: "Ran Off", unpaid: "Unpaid" } as any)[ps] ?? ps;
    const houseFee    = Number(a.entrance_fee_amount ?? 0);
    const lateFee     = Number(a.late_arrival_fee_amount ?? 0);
    const musicFee    = 20;
    const total       = houseFee + lateFee + musicFee;
    const lateBadge   = lateFee > 0 ? ` <span class="badge amber">LATE +${fmt(lateFee)}</span>` : "";
    return `<tr>
      <td>
        <div class="fee-cell">
          <div class="main">${a.dancers?.stage_name ?? "—"}${lateBadge}</div>
          <div class="sub">In ${fmtTime(a.check_in_time)}</div>
        </div>
      </td>
      <td class="right">
        <div class="fee-cell">
          <div class="main">${fmt(total)}</div>
          <div class="sub">H:${fmt(houseFee)} · M:${fmt(musicFee)}${lateFee > 0 ? ` · L:${fmt(lateFee)}` : ""}</div>
        </div>
      </td>
      <td class="right">${fmt(Number(a.amount_paid ?? 0))}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
    </tr>`;
  }).join("");

  const feesOwed      = d.houseFees + d.lateFees + d.musicFees + d.finesOwed;
  const feesSection = d.attendance.length > 0 ? `
  <div class="section">
    <div class="section-title">💃 Dancer Summary (${d.dancerCount})</div>
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="kpi"><div class="label">House Fees</div><div class="value">${fmt(d.houseFees)}</div></div>
      <div class="kpi amber"><div class="label">Late Fees</div><div class="value">${fmt(d.lateFees)}</div></div>
      <div class="kpi"><div class="label">Music Fees</div><div class="value">${fmt(d.musicFees)}</div></div>
      <div class="kpi green"><div class="label">Collected</div><div class="value">${fmt(d.totalPaid)}</div></div>
    </div>
    <table>
      <tr><th>Dancer</th><th class="right">Owed</th><th class="right">Paid</th><th>Status</th></tr>
      ${dancerRows}
    </table>
  </div>` : "";

  // ── Private rooms section ──
  const roomRows = d.packageRows.map(p => `<tr>
    <td><div class="fee-cell"><div class="main">${p.name}</div><div class="sub">${p.count} session${p.count !== 1 ? "s" : ""}</div></div></td>
    <td class="right">${fmt(p.gross)}</td>
    <td class="right" style="color:#16a34a;"><strong>${fmt(p.house)}</strong></td>
    <td class="right" style="color:#6b21a8;">${fmt(p.dancer)}</td>
  </tr>`).join("");

  const roomsSection = d.roomCount > 0 ? `
  <div class="section">
    <div class="section-title">🛋️ Private Rooms (${d.roomCount} session${d.roomCount !== 1 ? "s" : ""})</div>
    <div class="kpi-grid" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="kpi"><div class="label">Gross Revenue</div><div class="value">${fmt(d.roomGross)}</div></div>
      <div class="kpi green"><div class="label">House Cut</div><div class="value">${fmt(d.roomHouse)}</div></div>
      <div class="kpi pink"><div class="label">Dancer Cut</div><div class="value">${fmt(d.roomGross - d.roomHouse)}</div></div>
    </div>
    ${d.packageRows.length > 1 ? `<table>
      <tr><th>Package</th><th class="right">Gross</th><th class="right">House</th><th class="right">Dancer</th></tr>
      ${roomRows}
    </table>` : ""}
  </div>` : "";

  // ── Financial summary ──
  const summarySection = `
  <div class="section">
    <div class="section-title">💰 Financial Summary</div>
    <table>
      <tr><td>Door Revenue</td><td class="right">${fmt(d.doorRevenue)}</td></tr>
      <tr><td>Private Rooms (house cut)</td><td class="right">${fmt(d.roomHouse)}</td></tr>
      <tr><td>Dancer House Fees</td><td class="right">${fmt(d.houseFees)}</td></tr>
      <tr><td>Dancer Music Fees</td><td class="right">${fmt(d.musicFees)}</td></tr>
      ${d.lateFees > 0 ? `<tr><td>Late Arrival Fees</td><td class="right">${fmt(d.lateFees)}</td></tr>` : ""}
      ${d.finesOwed > 0 ? `<tr><td>Early Leave Fines</td><td class="right">${fmt(d.finesOwed)}</td></tr>` : ""}
    </table>
  </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>📊 Daily Report</h1>
      <p>${dateLabel}</p>
    </div>
    <div class="body">
      ${alerts}
      ${doorSection}
      ${feesSection}
      ${roomsSection}
      ${summarySection}
      <div class="total-row">
        <div><div class="label">Gross Night Total</div></div>
        <div class="value">${fmt(d.grossTotal)}</div>
      </div>
    </div>
    <div class="footer">2NYT Entertainment · Automated nightly report · Do not reply to this email</div>
  </div>
</body></html>`;
}

function weeklyHtml(w: Awaited<ReturnType<typeof fetchWeekData>>) {
  const days = Object.entries(w.byDate).sort(([a], [b]) => a.localeCompare(b));

  const dayRows = days.map(([d, v]) => {
    const label     = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const nightTotal = v.door + v.rooms + v.houseFees + v.lateFees + (v.dancers * 20);
    return `<tr>
      <td><strong>${label}</strong></td>
      <td class="right">${fmtN(v.guests)}</td>
      <td class="right">${fmt(v.door)}</td>
      <td class="right">${fmtN(v.dancers)}</td>
      <td class="right">${fmt(v.rooms)}</td>
      <td class="right">${fmt(v.houseFees + v.lateFees + v.dancers * 20)}</td>
      <td class="right"><strong style="color:#16a34a;">${fmt(nightTotal)}</strong></td>
    </tr>`;
  }).join("");

  const startLabel = new Date(w.startStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel   = new Date(w.endStr   + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const alerts = [
    w.ranOffCount > 0
      ? `<div class="alert danger">⚠️ <strong>${w.ranOffCount} ran-off incident${w.ranOffCount !== 1 ? "s" : ""}</strong> this week — ${fmt(0)} recovered</div>`
      : "",
    w.unpaidCount > 0
      ? `<div class="alert warn">🔴 <strong>${w.unpaidCount} unpaid dancer shift${w.unpaidCount !== 1 ? "s" : ""}</strong> outstanding — review balances</div>`
      : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>📅 Weekly Report</h1>
      <p>${startLabel} – ${endLabel}</p>
    </div>
    <div class="body">
      ${alerts}
      <div class="section">
        <div class="kpi-grid">
          <div class="kpi"><div class="label">Total Guests</div><div class="value">${fmtN(w.totalGuests)}</div></div>
          <div class="kpi green"><div class="label">Door Revenue</div><div class="value">${fmt(w.doorRevenue)}</div></div>
          <div class="kpi pink"><div class="label">Dancer Nights</div><div class="value">${fmtN(w.dancerNights)}</div></div>
          <div class="kpi green"><div class="label">Room Gross</div><div class="value">${fmt(w.roomGross)}</div></div>
          <div class="kpi"><div class="label">House Fees</div><div class="value">${fmt(w.houseFees + w.lateFees + w.musicFees)}</div></div>
          <div class="kpi green"><div class="label">Fees Collected</div><div class="value">${fmt(w.totalPaid)}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📆 Night-by-Night Breakdown</div>
        <table>
          <tr>
            <th>Night</th>
            <th class="right">Guests</th>
            <th class="right">Door</th>
            <th class="right">Dancers</th>
            <th class="right">Rooms</th>
            <th class="right">Fees</th>
            <th class="right">Night Total</th>
          </tr>
          ${dayRows}
          <tr style="background:#f9f9fb;">
            <td><strong>7-Day Total</strong></td>
            <td class="right"><strong>${fmtN(w.totalGuests)}</strong></td>
            <td class="right"><strong>${fmt(w.doorRevenue)}</strong></td>
            <td class="right"><strong>${fmtN(w.dancerNights)}</strong></td>
            <td class="right"><strong>${fmt(w.roomHouse)}</strong></td>
            <td class="right"><strong>${fmt(w.houseFees + w.lateFees + w.musicFees)}</strong></td>
            <td class="right"><strong style="color:#16a34a;">${fmt(w.grossTotal)}</strong></td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">💰 Revenue Breakdown</div>
        <table>
          <tr><td>Door Revenue</td><td class="right">${fmt(w.doorRevenue)}</td></tr>
          <tr><td>Private Rooms (house cut)</td><td class="right">${fmt(w.roomHouse)}</td></tr>
          <tr><td>Dancer House Fees</td><td class="right">${fmt(w.houseFees)}</td></tr>
          <tr><td>Dancer Music Fees</td><td class="right">${fmt(w.musicFees)}</td></tr>
          ${w.lateFees > 0 ? `<tr><td>Late Arrival Fees</td><td class="right">${fmt(w.lateFees)}</td></tr>` : ""}
          ${w.fines > 0 ? `<tr><td>Early Leave Fines</td><td class="right">${fmt(w.fines)}</td></tr>` : ""}
        </table>
      </div>

      <div class="total-row">
        <div><div class="label">Week Gross Total</div></div>
        <div class="value">${fmt(w.grossTotal)}</div>
      </div>
    </div>
    <div class="footer">2NYT Entertainment · Automated weekly report · Do not reply to this email</div>
  </div>
</body></html>`;
}

// ── Handler ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });

  const body = await req.json().catch(() => ({}));
  const type: "daily" | "weekly" = body.type ?? "daily";

  const { data: settings } = await supabase.from("club_settings").select("report_email, daily_report_enabled, weekly_report_enabled").single();
  const toEmail = body.to_email ?? settings?.report_email;

  if (!toEmail) return new Response(JSON.stringify({ error: "No report_email configured in club settings" }), { status: 400 });
  if (type === "daily"  && settings?.daily_report_enabled  === false) return new Response(JSON.stringify({ skipped: "daily reports disabled" }));
  if (type === "weekly" && settings?.weekly_report_enabled === false) return new Response(JSON.stringify({ skipped: "weekly reports disabled" }));
  if (!RESEND_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY secret not set" }), { status: 500 });

  const now = new Date();
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
