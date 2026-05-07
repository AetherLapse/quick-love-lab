import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import type { Period } from "@/components/dashboard/mockData";
import { getClubId } from "@/lib/clubId";

// ─── Date range helpers ───────────────────────────────────────────────────────

export type CustomRange = { start: string; end: string };

export function getDateRange(period: Period, custom?: CustomRange): CustomRange {
  if (period === "Custom" && custom?.start && custom?.end) return custom;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (period === "Tonight") return { start: todayStr, end: todayStr };
  if (period === "Last Night") {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    const yest = d.toISOString().split("T")[0];
    return { start: yest, end: yest };
  }
  if (period === "This Week") {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    return { start: d.toISOString().split("T")[0], end: todayStr };
  }
  if (period === "This Month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: d.toISOString().split("T")[0], end: todayStr };
  }
  if (period === "This Year") {
    const d = new Date(now.getFullYear(), 0, 1);
    return { start: d.toISOString().split("T")[0], end: todayStr };
  }
  return { start: todayStr, end: todayStr };
}

export function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Raw data hooks ───────────────────────────────────────────────────────────

export function useRoomSessions(start: string, end: string) {
  return useQuery({
    queryKey: ["room_sessions", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("entry_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });
}

export function useActiveRoomSessions() {
  return useQuery({
    queryKey: ["room_sessions_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_sessions")
        .select("*, dancers(stage_name, full_name)")
        .is("exit_time", null)
        .eq("shift_date", today());
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });
}

export function useGuestVisits(start: string, end: string) {
  return useQuery({
    queryKey: ["guest_visits", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_visits")
        .select("*, guests(is_returning, visit_count)")
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("entry_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });
}

export function useCustomerEntries(start: string, end: string) {
  return useQuery({
    queryKey: ["customer_entries", start, end],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_entries")
        .select("*, vendors(id, name), entry_tiers(id, name)")
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("entry_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });
}

export function useAttendanceLogs(start: string, end: string) {
  return useQuery({
    queryKey: ["attendance_log", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_log")
        .select("*, dancers(stage_name, full_name, payout_percentage, entrance_fee)")
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("clock_in", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });
}

export function useDancers() {
  return useQuery({
    queryKey: ["dancers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dancers")
        .select("*")
        .order("stage_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActiveDancers() {
  return useQuery({
    queryKey: ["dancers_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dancers")
        .select("*")
        .eq("is_active", true)
        .order("live_status");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });
}

/** Returns only dancers who have checked in today and haven't clocked out yet */
export function usePresentDancersToday() {
  return useQuery({
    queryKey: ["dancers_present_today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_log")
        .select("dancer_id, dancers(id, stage_name, live_status, dancer_number, is_active)")
        .eq("shift_date", today())
        .is("clock_out", null);
      if (error) throw error;
      // Deduplicate by dancer_id (a dancer could theoretically have multiple open records)
      const seen = new Set<string>();
      const result: Array<{ id: string; stage_name: string; live_status: string | null; dancer_number: number | null }> = [];
      for (const row of data ?? []) {
        const d = (row as any).dancers;
        if (d && !seen.has(d.id)) {
          seen.add(d.id);
          result.push(d);
        }
      }
      return result;
    },
    refetchInterval: 15000,
  });
}

export const HOUSE_FEE             = 30;
export const MUSIC_FEE_PER_SHIFT   = 20;
export const LATE_ARRIVAL_FEE      = 20;
export const LATE_ARRIVAL_CUTOFF_H = 20; // 8 PM hour
export const LATE_ARRIVAL_CUTOFF_M = 30; // :30

/** Returns the late arrival fee if current time is at or after 8:30 PM, else 0 */
export function calcLateArrivalFee(): number {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  return (h > LATE_ARRIVAL_CUTOFF_H || (h === LATE_ARRIVAL_CUTOFF_H && m >= LATE_ARRIVAL_CUTOFF_M))
    ? LATE_ARRIVAL_FEE
    : 0;
}

export interface DancerBalance {
  attendanceId: string;
  dancerId: string;
  stageName: string;
  houseFee: number;
  musicFee: number;
  lateArrivalFee: number;
  fines: number;
  roomCut: number;
  totalDue: number;
  amountPaid: number;
  stillOwed: number;
  paymentStatus: string;
}

/** Per-dancer fee balances for all dancers currently checked in today */
export function useDancerBalancesToday() {
  return useQuery({
    queryKey: ["dancer_balances_today"],
    queryFn: async () => {
      const dateStr = today();

      const [{ data: logs }, { data: roomSessions }] = await Promise.all([
        supabase
          .from("attendance_log")
          .select("id, dancer_id, entrance_fee_amount, late_arrival_fee_amount, early_leave_fine, fine_waived, amount_paid, payment_status, dancers(stage_name)")
          .eq("shift_date", dateStr)
          .is("clock_out", null),
        supabase
          .from("room_sessions")
          .select("dancer_id, dancer_cut")
          .gte("created_at", `${dateStr}T00:00:00`)
          .lte("created_at", `${dateStr}T23:59:59`),
      ]);

      const cutByDancer: Record<string, number> = {};
      for (const rs of roomSessions ?? []) {
        cutByDancer[rs.dancer_id] = (cutByDancer[rs.dancer_id] ?? 0) + Number(rs.dancer_cut ?? 0);
      }

      const seen = new Set<string>();
      const result: DancerBalance[] = [];
      for (const log of logs ?? []) {
        if (seen.has(log.dancer_id)) continue;
        seen.add(log.dancer_id);
        const houseFee       = Number(log.entrance_fee_amount ?? 0);
        const lateArrivalFee = Number((log as any).late_arrival_fee_amount ?? 0);
        const fines          = log.fine_waived ? 0 : Number((log as any).early_leave_fine ?? 0);
        const roomCut        = cutByDancer[log.dancer_id] ?? 0;
        const totalDue       = houseFee + MUSIC_FEE_PER_SHIFT + lateArrivalFee + fines - roomCut;
        const amountPaid     = Number((log as any).amount_paid ?? 0);
        result.push({
          attendanceId:  log.id,
          dancerId:      log.dancer_id,
          stageName:     (log as any).dancers?.stage_name ?? "Unknown",
          houseFee,
          musicFee:      MUSIC_FEE_PER_SHIFT,
          lateArrivalFee,
          fines,
          roomCut,
          totalDue,
          amountPaid,
          stillOwed:     Math.max(0, totalDue - amountPaid),
          paymentStatus: (log as any).payment_status ?? "unpaid",
        });
      }
      return result;
    },
    refetchInterval: 20000,
  });
}

export function useGuestVisitHistory(guestId: string | null) {
  return useQuery({
    queryKey: ["guest_visit_history", guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_visits")
        .select("id, entry_time, exit_time, door_fee, shift_date")
        .eq("guest_id", guestId!)
        .order("entry_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!guestId,
  });
}

export function useGuests(search = "") {
  return useQuery({
    queryKey: ["guests", search],
    queryFn: async () => {
      let q = supabase
        .from("guests")
        .select("*")
        .order("last_visit_date", { ascending: false });
      if (search.trim()) {
        q = q.ilike("guest_display_id", `%${search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roles = rolesRes.data ?? [];
      return (profilesRes.data ?? []).map((p) => ({
        ...p,
        user_roles: roles.filter((r) => r.user_id === p.user_id),
      }));
    },
  });
}

export function useClubSettings() {
  return useQuery({
    queryKey: ["club_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_settings")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useClubRooms() {
  return useQuery({
    queryKey: ["club_rooms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("club_rooms")
        .select("id, name, floor, is_active")
        .eq("is_active", true)
        .order("floor,name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; floor: string; is_active: boolean }[];
    },
  });
}

// ─── Aggregated dashboard stats ───────────────────────────────────────────────

export function useDashboardStats(period: Period, custom?: CustomRange) {
  const { start, end } = getDateRange(period, custom);
  const sessions = useRoomSessions(start, end);
  const guestVisits = useGuestVisits(start, end);
  const customerEntries = useCustomerEntries(start, end);
  const attendance = useAttendanceLogs(start, end);

  const stats = useMemo(() => {
    const rs = sessions.data ?? [];
    const gv = guestVisits.data ?? [];
    const ce = customerEntries.data ?? [];
    const al = attendance.data ?? [];

    const doorRevenue =
      gv.reduce((s, r) => s + Number(r.door_fee), 0) +
      ce.reduce((s, r) => s + Number(r.door_fee), 0);
    const roomRevenue = rs.reduce((s, r) => s + Number(r.gross_amount), 0);
    const houseNet =
      rs.reduce((s, r) => s + Number(r.house_cut), 0) + doorRevenue;
    const payoutsOwed =
      rs.reduce((s, r) => s + Number(r.dancer_cut), 0) -
      al.reduce((s, r) => s + Number(r.entrance_fee_amount), 0);

    const totalGuests = gv.length + ce.length;
    const returningGuests = gv.filter(
      (g) => (g.guests as { is_returning: boolean } | null)?.is_returning
    ).length;
    const returningPct =
      totalGuests > 0 ? Math.round((returningGuests / totalGuests) * 100) : 0;

    const roomSessionCount = rs.length;

    // Unique dancer IDs currently on shift (checked in but not yet checked out)
    const activeDancerIds = new Set(al.filter((a) => !a.clock_out).map((a) => a.dancer_id));
    const activeDancerCount = activeDancerIds.size;

    return {
      doorRevenue,
      roomRevenue,
      houseNet,
      payoutsOwed: Math.max(0, payoutsOwed),
      totalGuests,
      returningPct,
      roomSessionCount,
      activeDancerCount,
    };
  }, [sessions.data, guestVisits.data, customerEntries.data, attendance.data]);

  const isLoading =
    sessions.isLoading ||
    guestVisits.isLoading ||
    customerEntries.isLoading ||
    attendance.isLoading;

  return { stats, isLoading };
}

// ─── Per-dancer performance for today / period ───────────────────────────────

export function useDancerPerformance(period: Period, custom?: CustomRange) {
  const { start, end } = getDateRange(period, custom);
  const sessions = useRoomSessions(start, end);
  const attendance = useAttendanceLogs(start, end);
  const dancers = useDancers();

  const performance = useMemo(() => {
    const rs = sessions.data ?? [];
    const al = attendance.data ?? [];
    const ds = dancers.data ?? [];

    // Group sessions by dancer_id
    const sessionsByDancer: Record<string, typeof rs> = {};
    rs.forEach((s) => {
      if (!sessionsByDancer[s.dancer_id]) sessionsByDancer[s.dancer_id] = [];
      sessionsByDancer[s.dancer_id].push(s);
    });

    // Group attendance by dancer_id (most recent entry)
    const attendanceByDancer: Record<string, (typeof al)[0]> = {};
    al.forEach((a) => {
      if (!attendanceByDancer[a.dancer_id]) attendanceByDancer[a.dancer_id] = a;
    });

    // Build per-dancer stats
    return ds
      .filter((d) => sessionsByDancer[d.id] || attendanceByDancer[d.id])
      .map((d) => {
        const dancerSessions = sessionsByDancer[d.id] ?? [];
        const att = attendanceByDancer[d.id];
        const gross = dancerSessions.reduce((s, r) => s + Number(r.gross_amount), 0);
        const houseCut = dancerSessions.reduce((s, r) => s + Number(r.house_cut), 0);
        const dancerCut = dancerSessions.reduce((s, r) => s + Number(r.dancer_cut), 0);
        const houseFee = att ? Number(att.entrance_fee_amount) : Number(d.entrance_fee);
        const netPayout = dancerCut - houseFee;

        const amountPaid = att ? Number((att as any).amount_paid ?? 0) : 0;
        const paymentStatus = att ? ((att as any).payment_status ?? "unpaid") : "unpaid";

        return {
          id: d.id,
          name: d.stage_name,
          active: d.live_status !== "inactive",
          liveStatus: d.live_status,
          checkIn: att
            ? new Date(att.clock_in).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : null,
          checkOut: att?.clock_out
            ? new Date(att.clock_out).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : null,
          sessions: dancerSessions.length,
          gross,
          houseCut,
          houseFee,
          netPayout,
          amountPaid,
          paymentStatus,
          sessionDetails: dancerSessions.map((s) => ({
            time: new Date(s.entry_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            songs: s.num_songs,
            amount: Number(s.gross_amount),
          })),
        };
      })
      .sort((a, b) => b.gross - a.gross);
  }, [sessions.data, attendance.data, dancers.data]);

  const isLoading = sessions.isLoading || attendance.isLoading || dancers.isLoading;
  return { performance, isLoading };
}

// ─── Revenue chart data ───────────────────────────────────────────────────────

export function useRevenueChartData(period: Period, custom?: CustomRange) {
  const { start, end } = getDateRange(period, custom);
  const sessions = useRoomSessions(start, end);
  const guestVisits = useGuestVisits(start, end);
  const customerEntries = useCustomerEntries(start, end);

  const chartData = useMemo(() => {
    const rs = sessions.data ?? [];
    const gv = guestVisits.data ?? [];
    const ce = customerEntries.data ?? [];

    if (period === "Tonight") {
      const hours = ["8PM", "9PM", "10PM", "11PM", "12AM", "1AM", "2AM", "3AM"];
      const hourMap: Record<string, number> = {
        "8PM": 20, "9PM": 21, "10PM": 22, "11PM": 23,
        "12AM": 0, "1AM": 1, "2AM": 2, "3AM": 3,
      };
      return hours.map((h) => {
        const targetHour = hourMap[h];
        const door =
          gv
            .filter((g) => new Date(g.entry_time).getHours() === targetHour)
            .reduce((s, g) => s + Number(g.door_fee), 0) +
          ce
            .filter((c) => new Date(c.entry_time).getHours() === targetHour)
            .reduce((s, c) => s + Number(c.door_fee), 0);
        const room = rs
          .filter((r) => new Date(r.entry_time).getHours() === targetHour)
          .reduce((s, r) => s + Number(r.gross_amount), 0);
        return { period: h, door, room };
      });
    }

    if (period === "This Week") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days.map((day, i) => {
        const door =
          gv
            .filter((g) => new Date(g.entry_time).getDay() === i)
            .reduce((s, g) => s + Number(g.door_fee), 0) +
          ce
            .filter((c) => new Date(c.entry_time).getDay() === i)
            .reduce((s, c) => s + Number(c.door_fee), 0);
        const room = rs
          .filter((r) => new Date(r.entry_time).getDay() === i)
          .reduce((s, r) => s + Number(r.gross_amount), 0);
        return { period: day, door, room };
      });
    }

    if (period === "This Month") {
      return ["Week 1", "Week 2", "Week 3", "Week 4"].map((w, wi) => {
        const doorRev =
          gv
            .filter((g) => {
              const d = new Date(g.entry_time).getDate();
              return d >= wi * 7 + 1 && d <= (wi + 1) * 7;
            })
            .reduce((s, g) => s + Number(g.door_fee), 0) +
          ce
            .filter((c) => {
              const d = new Date(c.entry_time).getDate();
              return d >= wi * 7 + 1 && d <= (wi + 1) * 7;
            })
            .reduce((s, c) => s + Number(c.door_fee), 0);
        const room = rs
          .filter((r) => {
            const d = new Date(r.entry_time).getDate();
            return d >= wi * 7 + 1 && d <= (wi + 1) * 7;
          })
          .reduce((s, r) => s + Number(r.gross_amount), 0);
        return { period: w, door: doorRev, room };
      });
    }

    // This Year or Custom — by month (Custom with wide range) or by day (Custom narrow)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);

    if (period === "Custom" && daysDiff <= 31) {
      // Day-by-day for short custom ranges
      return Array.from({ length: daysDiff + 1 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const dateStr = d.toISOString().split("T")[0];
        const door =
          gv.filter((g) => g.entry_time.startsWith(dateStr)).reduce((s, g) => s + Number(g.door_fee), 0) +
          ce.filter((c) => c.entry_time.startsWith(dateStr)).reduce((s, c) => s + Number(c.door_fee), 0);
        const room = rs.filter((r) => r.entry_time.startsWith(dateStr)).reduce((s, r) => s + Number(r.gross_amount), 0);
        return { period: label, door, room };
      });
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((m, mi) => {
      const door =
        gv
          .filter((g) => new Date(g.entry_time).getMonth() === mi)
          .reduce((s, g) => s + Number(g.door_fee), 0) +
        ce
          .filter((c) => new Date(c.entry_time).getMonth() === mi)
          .reduce((s, c) => s + Number(c.door_fee), 0);
      const room = rs
        .filter((r) => new Date(r.entry_time).getMonth() === mi)
        .reduce((s, r) => s + Number(r.gross_amount), 0);
      return { period: m, door, room };
    });
  }, [period, start, end, sessions.data, guestVisits.data, customerEntries.data]);

  const splitData = useMemo(() => {
    return chartData.map((d) => ({
      period: d.period,
      house: Math.round((d.door + d.room) * 0.7),
      dancer: Math.round((d.door + d.room) * 0.3),
    }));
  }, [chartData]);

  const isLoading = sessions.isLoading || guestVisits.isLoading || customerEntries.isLoading;
  return { chartData, splitData, isLoading };
}

// ─── Revenue streams breakdown ────────────────────────────────────────────────

export function useRevenueStreams(period: Period, custom?: CustomRange) {
  const { start, end } = getDateRange(period, custom);
  const sessions = useRoomSessions(start, end);
  const guestVisits = useGuestVisits(start, end);
  const customerEntries = useCustomerEntries(start, end);
  const settings = useClubSettings();

  const streams = useMemo(() => {
    const rs = sessions.data ?? [];
    const gv = guestVisits.data ?? [];
    const ce = customerEntries.data ?? [];
    const housePct = 100 - (Number(settings.data?.default_dancer_payout_pct) ?? 30);
    const dancerPct = Number(settings.data?.default_dancer_payout_pct) ?? 30;

    const doorTransactions = gv.length + ce.length;
    const doorGross =
      gv.reduce((s, g) => s + Number(g.door_fee), 0) +
      ce.reduce((s, c) => s + Number(c.door_fee), 0);

    // Group room sessions by package name
    const packageMap: Record<string, { transactions: number; gross: number }> = {};
    rs.forEach((s) => {
      if (!packageMap[s.package_name]) packageMap[s.package_name] = { transactions: 0, gross: 0 };
      packageMap[s.package_name].transactions++;
      packageMap[s.package_name].gross += Number(s.gross_amount);
    });

    const result = [
      {
        stream: "Door Entry",
        transactions: doorTransactions,
        gross: doorGross,
        housePct: 100,
        houseEarned: doorGross,
        dancerPct: 0,
        dancerEarned: 0,
      },
      ...Object.entries(packageMap).map(([name, v]) => ({
        stream: name,
        transactions: v.transactions,
        gross: v.gross,
        housePct,
        houseEarned: Math.round(v.gross * (housePct / 100)),
        dancerPct,
        dancerEarned: Math.round(v.gross * (dancerPct / 100)),
      })),
    ];

    return result;
  }, [sessions.data, guestVisits.data, customerEntries.data, settings.data]);

  return { streams, isLoading: sessions.isLoading || guestVisits.isLoading };
}

// ─── Heatmap (monthly revenue per day) ───────────────────────────────────────

export function useMonthlyHeatmap() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end = now.toISOString().split("T")[0];
  const sessions = useRoomSessions(start, end);
  const guestVisits = useGuestVisits(start, end);
  const customerEntries = useCustomerEntries(start, end);

  const heatmap = useMemo(() => {
    const rs = sessions.data ?? [];
    const gv = guestVisits.data ?? [];
    const ce = customerEntries.data ?? [];

    // Revenue by day-of-month
    const revenueByDay: Record<number, number> = {};
    const guestsByDay: Record<number, number> = {};
    const dancersByDay: Record<number, Set<string>> = {};

    [...gv, ...ce].forEach((g) => {
      const d = new Date(g.entry_time).getDate();
      revenueByDay[d] = (revenueByDay[d] ?? 0) + Number(g.door_fee);
      guestsByDay[d] = (guestsByDay[d] ?? 0) + 1;
    });
    rs.forEach((s) => {
      const d = new Date(s.entry_time).getDate();
      revenueByDay[d] = (revenueByDay[d] ?? 0) + Number(s.gross_amount);
      if (!dancersByDay[d]) dancersByDay[d] = new Set();
      dancersByDay[d].add(s.dancer_id);
    });

    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();

    const days: (null | {
      day: number;
      revenue: number;
      guests: number;
      dancers: number;
      isToday: boolean;
      isPast: boolean;
    })[] = [];

    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const isPast = d <= now.getDate();
      days.push({
        day: d,
        revenue: revenueByDay[d] ?? 0,
        guests: guestsByDay[d] ?? 0,
        dancers: dancersByDay[d]?.size ?? 0,
        isToday: d === now.getDate(),
        isPast,
      });
    }
    return days;
  }, [sessions.data, guestVisits.data, customerEntries.data]);

  return { heatmap, isLoading: sessions.isLoading };
}

// ─── Write: dancer check-in ───────────────────────────────────────────────────

export function useDancerCheckIn() {
  const qc = useQueryClient();

  const findByPin = async (pin: string) => {
    const { data, error } = await supabase
      .from("dancers")
      .select("*")
      .eq("pin_code", pin)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const checkIn = useMutation({
    mutationFn: async ({
      dancerId,
      entranceFee,
      lateArrivalFee = 0,
      method,
      authorId,
    }: {
      dancerId: string;
      entranceFee: number;
      lateArrivalFee?: number;
      method: "pin" | "facial";
      authorId: string;
    }) => {
      // Reject if dancer already has an open shift today
      const { data: existing } = await supabase
        .from("attendance_log")
        .select("id")
        .eq("dancer_id", dancerId)
        .eq("shift_date", today())
        .is("clock_out", null)
        .maybeSingle();
      if (existing) throw new Error("Dancer is already checked in and has not checked out.");

      // Insert attendance log — select id so caller can record payment immediately
      const { data: attRow, error: attErr } = await supabase
        .from("attendance_log")
        .insert({
          club_id: await getClubId(),
          dancer_id: dancerId,
          entrance_fee_amount: entranceFee,
          late_arrival_fee_amount: lateArrivalFee,
          shift_date: today(),
        } as any)
        .select("id")
        .single();
      if (attErr) throw attErr;

      // Append to event log
      await (supabase as any).from("dancer_event_log").insert({
        club_id: await getClubId(),
        dancer_id: dancerId,
        event_type: "check_in",
        payload: { method, house_fee_applied: entranceFee, late_arrival_fee: lateArrivalFee },
        author_id: authorId,
      });

      return { attendanceId: attRow.id as string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance_log"] });
      qc.invalidateQueries({ queryKey: ["dancers_active"] });
    },
  });

  return { findByPin, checkIn };
}

export type PaymentStatus = "unpaid" | "paid_checkin" | "paid_during" | "paid_checkout" | "ran_off";

/** Record a dancer payment against their attendance_log row */
export function useMarkDancerPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attendanceId,
      amountPaid,
      status,
    }: {
      attendanceId: string;
      amountPaid: number;
      status: PaymentStatus;
    }) => {
      const { error } = await supabase
        .from("attendance_log")
        .update({ amount_paid: amountPaid, payment_status: status } as any)
        .eq("id", attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dancer_balances_today"] });
      qc.invalidateQueries({ queryKey: ["attendance_log"] });
    },
  });
}

// ─── Read: checked-in dancers still on shift today ───────────────────────────

export function useCheckedInDancersToday() {
  return useQuery({
    queryKey: ["attendance_today_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_log")
        .select("id, dancer_id, clock_in, early_leave_fine, fine_waived, dancers(id, stage_name, enroll_id, entrance_fee)")
        .eq("shift_date", today())
        .is("clock_out", null)
        .order("clock_in", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        dancer_id: string;
        clock_in: string;
        early_leave_fine: number;
        fine_waived: boolean;
        dancers: { id: string; stage_name: string; enroll_id: string | null; entrance_fee: number } | null;
      }>;
    },
    refetchInterval: 15000,
  });
}

// ─── Write: dancer check-out ──────────────────────────────────────────────────

export const EARLY_LEAVE_FINE_AMOUNT = 20; // $20 fine for leaving before midnight

export function useDancerCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attendanceId,
      dancerId,
      fine,
      fineWaived,
      waiverCodeId,
      checkedOutBy,
    }: {
      attendanceId: string;
      dancerId: string;
      fine: number;
      fineWaived: boolean;
      waiverCodeId?: string;
      checkedOutBy: string;
    }) => {
      const { error } = await supabase.from("attendance_log").update({
        clock_out:       new Date().toISOString(),
        early_leave_fine: fine,
        fine_waived:     fineWaived,
        checked_out_by:  checkedOutBy,
        ...(waiverCodeId ? { waiver_code_id: waiverCodeId } : {}),
      }).eq("id", attendanceId);
      if (error) throw error;

      if (waiverCodeId) {
        await supabase.from("early_leave_codes").update({
          used:               true,
          used_at:            new Date().toISOString(),
          used_by_dancer_id:  dancerId,
        }).eq("id", waiverCodeId);
      }

      await (supabase as any).from("dancer_event_log").insert({
        club_id: await getClubId(),
        dancer_id:  dancerId,
        event_type: "check_out",
        payload:    { fine, fine_waived: fineWaived, waiver_used: !!waiverCodeId },
        author_id:  checkedOutBy,
      }).then(() => {}); // non-blocking, ignore error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance_today_active"] });
      qc.invalidateQueries({ queryKey: ["dancers_active"] });
      qc.invalidateQueries({ queryKey: ["attendance_log"] });
    },
  });
}

// ─── Read: today's early-leave codes ─────────────────────────────────────────

export function useEarlyLeaveCodes() {
  return useQuery({
    queryKey: ["early_leave_codes_today"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("early_leave_codes")
        .select("*, dancers(stage_name)")
        .eq("shift_date", today())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        code: string;
        reason: string;
        dancer_id: string | null;
        used: boolean;
        used_at: string | null;
        valid_from: string | null;
        valid_until: string | null;
        created_at: string;
        dancers: { stage_name: string } | null;
      }>;
    },
    refetchInterval: 20000,
  });
}

// ─── Write: generate early-leave code ────────────────────────────────────────

export function useGenerateEarlyLeaveCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reason,
      dancerId,
      generatedBy,
      validFrom,
      validUntil,
    }: {
      reason: string;
      dancerId?: string;
      generatedBy: string;
      validFrom?: string;
      validUntil?: string;
    }) => {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes    = crypto.getRandomValues(new Uint8Array(8));
      const code     = Array.from(bytes).map(b => alphabet[b % alphabet.length]).join("");

      const { data, error } = await (supabase as any)
        .from("early_leave_codes")
        .insert({
          club_id: await getClubId(),
          code,
          reason,
          generated_by: generatedBy,
          shift_date:   today(),
          ...(dancerId   ? { dancer_id:   dancerId }   : {}),
          ...(validFrom  ? { valid_from:  validFrom }  : {}),
          ...(validUntil ? { valid_until: validUntil } : {}),
        })
        .select()
        .single();
      if (error) throw error;
      return data as { id: string; code: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["early_leave_codes_today"] });
    },
  });
}

// ─── Write: guest entry (manual) ─────────────────────────────────────────────

export function useGuestCheckIn() {
  const qc = useQueryClient();

  const manualAdd = useMutation({
    mutationFn: async ({ doorFee, loggedBy, tierId, guestCount = 1, vendorId, vendorName }: { doorFee: number; loggedBy: string; tierId?: string; guestCount?: number; vendorId?: string; vendorName?: string }) => {
      const { error } = await (supabase as any).from("customer_entries").insert({
        club_id: await getClubId(),
        door_fee: doorFee,
        shift_date: today(),
        logged_by: loggedBy,
        guest_count: guestCount,
        ...(tierId ? { entry_tier_id: tierId } : {}),
        ...(vendorId ? { vendor_id: vendorId } : {}),
        ...(vendorName ? { vendor_name: vendorName } : {}),
      });
      if (error) throw error;
    },
    onMutate: async ({ doorFee, tierId, guestCount = 1 }) => {
      const todayStr = today();
      await qc.cancelQueries({ queryKey: ["customer_entries", todayStr, todayStr] });
      const prev = qc.getQueryData<any[]>(["customer_entries", todayStr, todayStr]);
      qc.setQueryData(["customer_entries", todayStr, todayStr], (old: any[] = []) => [
        { id: `optimistic-${Date.now()}`, door_fee: doorFee, entry_tier_id: tierId ?? null, guest_count: guestCount, entry_time: new Date().toISOString(), shift_date: todayStr },
        ...old,
      ]);
      return { prev, todayStr };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(["customer_entries", ctx.todayStr, ctx.todayStr], ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_entries"] });
    },
  });

  const scanAdd = useMutation({
    mutationFn: async ({
      dlHash,
      displayId,
      doorFee,
      loggedBy,
      fullName,
      address,
    }: {
      dlHash: string;
      displayId: string;
      doorFee: number;
      loggedBy: string;
      fullName?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase.rpc("upsert_guest", {
        p_dl_hash: dlHash,
        p_display_id: displayId,
        p_door_fee: doorFee,
        p_logged_by: loggedBy,
        p_full_name: fullName ?? null,
        p_address: address ?? null,
      });
      if (error) throw error;

      // Check if returning
      const { data: guest } = await supabase
        .from("guests")
        .select("visit_count, is_returning")
        .eq("dl_hash", dlHash)
        .single();

      return { guestId: data, visitCount: guest?.visit_count ?? 1, isReturning: guest?.is_returning ?? false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest_visits"] });
    },
  });

  return { manualAdd, scanAdd };
}

// ─── Dance tiers ─────────────────────────────────────────────────────────────

export interface DanceTier {
  id: string;
  name: string;
  price: number;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
}

export function useDanceTiers() {
  return useQuery({
    queryKey: ["dance_tiers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dance_tiers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as DanceTier[];
    },
  });
}

export function useLogDanceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dancerId,
      tierId,
      totalAmount,
      durationMinutes,
      notes,
    }: {
      dancerId: string;
      tierId: string;
      totalAmount: number;
      durationMinutes?: number;
      notes?: string;
    }) => {
      // Use RPC to bypass PostgREST schema cache issues on new tables
      const { error } = await supabase.rpc("log_dance_session" as any, {
        p_dancer_id:    dancerId,
        p_tier_id:      tierId,
        p_total_amount: totalAmount,
        p_duration_min: durationMinutes ?? null,
        p_notes:        notes ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dance_sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance_log"] });
    },
  });
}

export function useDanceSessionsToday() {
  const todayStr = today();
  return useQuery({
    queryKey: ["dance_sessions", todayStr],
    queryFn: async () => {
      const start = `${todayStr}T00:00:00`;
      const end   = `${todayStr}T23:59:59`;
      const { data, error } = await (supabase as any)
        .from("dance_sessions")
        .select("*, dancers(stage_name), dance_tiers(name, price)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        dancer_id: string;
        tier_id: string;
        total_amount: number;
        duration_minutes: number | null;
        customer_count: number;
        completed_at: string;
        dancers: { stage_name: string } | null;
        dance_tiers: { name: string; price: number } | null;
      }>;
    },
    refetchInterval: 15000,
  });
}

export function useLogRoomSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dancerId,
      roomName,
      packageName,
      amount,
      durationMinutes,
    }: {
      dancerId: string;
      roomName: string;
      packageName: string;
      amount: number;
      durationMinutes?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("room_sessions").insert({
        club_id: await getClubId(),
        dancer_id: dancerId,
        room_name: roomName,
        package_name: packageName,
        gross_amount: amount,
        house_cut: Math.round(amount * 0.7),
        dancer_cut: Math.round(amount * 0.3),
        shift_date: new Date().toISOString().slice(0, 10),
        logged_by: user?.id,
        package_log: `${packageName} ($${amount})`,
        ...(durationMinutes != null ? { duration_minutes: durationMinutes } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room_sessions"] });
      qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
    },
  });
}

export function useExtendRoomSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      packageName,
      amount,
      extraMinutes,
    }: {
      sessionId: string;
      packageName: string;
      amount: number;
      extraMinutes: number;
    }) => {
      const { data: session, error: fetchErr } = await supabase
        .from("room_sessions")
        .select("extension_minutes, gross_amount, package_log")
        .eq("id", sessionId)
        .single();
      if (fetchErr) throw fetchErr;
      const s = session as any;
      const newGross = (s.gross_amount ?? 0) + amount;
      const newLog   = s.package_log
        ? `${s.package_log} + ${packageName} ($${amount})`
        : `${packageName} ($${amount})`;
      const { error } = await supabase.from("room_sessions").update({
        extension_minutes: (s.extension_minutes ?? 0) + extraMinutes,
        gross_amount: newGross,
        house_cut:    Math.round(newGross * 0.7),
        dancer_cut:   Math.round(newGross * 0.3),
        package_log:  newLog,
      }).eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
      qc.invalidateQueries({ queryKey: ["room_sessions"] });
    },
  });
}

// ─── Entry tiers + today's door status ───────────────────────────────────────

export function useEntryTiers() {
  return useQuery({
    queryKey: ["entry_tiers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("entry_tiers").select("*").order("price", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; price: number; admits_count: number; requires_distributor: boolean; is_active: boolean }[];
    },
  });
}

// ── Active kiosk sessions ──────────────────────────────────────────────────────

export interface KioskSession {
  id: string;
  session_token: string;
  user_id: string;
  role: string | null;
  path: string | null;
  user_agent: string | null;
  status: "active" | "locked";
  locked_at: string | null;
  last_seen: string;
  created_at: string;
}

export function useActiveKiosks() {
  return useQuery({
    queryKey: ["kiosk_sessions"],
    queryFn: async () => {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("kiosk_sessions")
        .select("*")
        .gte("last_seen", twoMinAgo)
        .order("last_seen", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KioskSession[];
    },
    refetchInterval: 30_000,
  });
}

export function useSetKioskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "locked" }) => {
      const { error } = await (supabase as any)
        .from("kiosk_sessions")
        .update({
          status,
          locked_at: status === "locked" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kiosk_sessions"] }),
  });
}

export function useDoorStatusToday() {
  const todayStr = today();
  const guestVisits  = useGuestVisits(todayStr, todayStr);
  const customerEntries = useCustomerEntries(todayStr, todayStr);
  const tiers = useEntryTiers();

  const rows = useMemo(() => {
    const gv = guestVisits.data ?? [];
    const ce = customerEntries.data ?? [];
    const tierList = tiers.data ?? [];

    // Entries with explicit tier ID — sum guest_count (e.g. 2-for-1 = 2 guests per row)
    // and count rows separately for revenue (1 card = 1 payment regardless of admits_count)
    const guestsByTierId: Record<string, number> = {};
    const cardsByTierId: Record<string, number> = {};
    ce.forEach((e: any) => {
      if (e.entry_tier_id) {
        guestsByTierId[e.entry_tier_id] = (guestsByTierId[e.entry_tier_id] ?? 0) + (Number(e.guest_count) || 1);
        cardsByTierId[e.entry_tier_id]  = (cardsByTierId[e.entry_tier_id]  ?? 0) + 1;
      }
    });

    // Legacy entries (no entry_tier_id) — count by fee, split across same-price tiers
    const legacyCeByFee: Record<number, number> = {};
    ce.filter((e: any) => !e.entry_tier_id).forEach((e: any) => {
      const fee = Number(e.door_fee);
      legacyCeByFee[fee] = (legacyCeByFee[fee] ?? 0) + 1;
    });
    // guest_visits never have tier_id — split by fee
    const gvByFee: Record<number, number> = {};
    gv.forEach(v => { const fee = Number(v.door_fee); gvByFee[fee] = (gvByFee[fee] ?? 0) + 1; });

    const feeGroups: Record<number, typeof tierList> = {};
    tierList.filter(t => t.is_active).forEach(t => {
      if (!feeGroups[t.price]) feeGroups[t.price] = [];
      feeGroups[t.price].push(t);
    });

    const result: { id: string; name: string; price: number; guestCount: number; revenue: number }[] = [];
    tierList.filter(t => t.is_active).forEach(tier => {
      const exactGuests = guestsByTierId[tier.id] ?? 0;
      const exactCards  = cardsByTierId[tier.id]  ?? 0;
      // Legacy / scan entries split evenly across same-price tiers (1 row = 1 guest assumed)
      const siblings = feeGroups[tier.price]?.length ?? 1;
      const legacySplit = Math.round(((legacyCeByFee[tier.price] ?? 0) + (gvByFee[tier.price] ?? 0)) / siblings);
      const guestCount = exactGuests + legacySplit;
      const revenue    = exactCards * tier.price + legacySplit * tier.price;
      result.push({ id: tier.id, name: tier.name, price: tier.price, guestCount, revenue });
    });

    return result;
  }, [guestVisits.data, customerEntries.data, tiers.data]);

  // Total guests = sum of guest_count on each entry (respects multi-admit tiers)
  // Total revenue = sum of door_fee (one payment per row regardless of admits_count)
  const totalGuests = [
    ...(guestVisits.data  ?? []).map(() => 1),
    ...(customerEntries.data ?? []).map((e: any) => Number(e.guest_count) || 1),
  ].reduce((s, n) => s + n, 0);
  const totalRevenue = [
    ...(guestVisits.data  ?? []).map(v => Number(v.door_fee)),
    ...(customerEntries.data ?? []).map(v => Number(v.door_fee)),
  ].reduce((s, f) => s + f, 0);

  return {
    rows,
    totalGuests,
    totalRevenue,
    isLoading: guestVisits.isLoading || customerEntries.isLoading || tiers.isLoading,
  };
}

export function useUpdateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      notes,
      flagged,
      flagged_reason,
    }: {
      id: string;
      notes?: string | null;
      flagged?: boolean;
      flagged_reason?: string | null;
    }) => {
      const { error } = await (supabase as any)
        .from("guests")
        .update({ notes, flagged, flagged_reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guests"] }),
  });
}

// ─── Read: dancer ban log ─────────────────────────────────────────────────────

export function useDancerBanLog(dancerId: string) {
  return useQuery({
    queryKey: ["dancer_ban_log", dancerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dancer_ban_log")
        .select("id, action, reason, created_at, profiles:actioned_by(full_name)")
        .eq("dancer_id", dancerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        action: "banned" | "unbanned";
        reason: string | null;
        created_at: string;
        profiles: { full_name: string } | null;
      }>;
    },
    enabled: !!dancerId,
  });
}

// ─── Write: ban / unban dancer ────────────────────────────────────────────────

export function useBanDancer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dancerId,
      reason,
      actionedBy,
    }: {
      dancerId: string;
      reason: string;
      actionedBy: string;
    }) => {
      const { error } = await (supabase as any)
        .from("dancers")
        .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString(), banned_by: actionedBy })
        .eq("id", dancerId);
      if (error) throw error;
      await (supabase as any).from("dancer_ban_log").insert({
        club_id: await getClubId(), dancer_id: dancerId, action: "banned", reason, actioned_by: actionedBy,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["dancers"] });
      qc.invalidateQueries({ queryKey: ["dancer_ban_log", v.dancerId] });
    },
  });
}

export function useUnbanDancer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dancerId,
      reason,
      actionedBy,
    }: {
      dancerId: string;
      reason: string;
      actionedBy: string;
    }) => {
      const { error } = await (supabase as any)
        .from("dancers")
        .update({ is_banned: false, ban_reason: null, banned_at: null, banned_by: null })
        .eq("id", dancerId);
      if (error) throw error;
      await (supabase as any).from("dancer_ban_log").insert({
        club_id: await getClubId(), dancer_id: dancerId, action: "unbanned", reason, actioned_by: actionedBy,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["dancers"] });
      qc.invalidateQueries({ queryKey: ["dancer_ban_log", v.dancerId] });
    },
  });
}
