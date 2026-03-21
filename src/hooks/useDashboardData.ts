import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import type { Period } from "@/components/dashboard/mockData";

// ─── Date range helpers ───────────────────────────────────────────────────────

export function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (period === "Today") return { start: today, end: today };
  if (period === "This Week") {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    return { start: d.toISOString().split("T")[0], end: today };
  }
  if (period === "This Month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: d.toISOString().split("T")[0], end: today };
  }
  const d = new Date(now.getFullYear(), 0, 1);
  return { start: d.toISOString().split("T")[0], end: today };
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
      const { data, error } = await supabase
        .from("customer_entries")
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

// ─── Aggregated dashboard stats ───────────────────────────────────────────────

export function useDashboardStats(period: Period) {
  const { start, end } = getDateRange(period);
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

    // Unique dancer IDs checked in
    const activeDancerIds = new Set(al.map((a) => a.dancer_id));
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

export function useDancerPerformance(period: Period) {
  const { start, end } = getDateRange(period);
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

export function useRevenueChartData(period: Period) {
  const { start, end } = getDateRange(period);
  const sessions = useRoomSessions(start, end);
  const guestVisits = useGuestVisits(start, end);
  const customerEntries = useCustomerEntries(start, end);

  const chartData = useMemo(() => {
    const rs = sessions.data ?? [];
    const gv = guestVisits.data ?? [];
    const ce = customerEntries.data ?? [];

    if (period === "Today") {
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

    // This Year — by month
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
  }, [period, sessions.data, guestVisits.data, customerEntries.data]);

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

export function useRevenueStreams(period: Period) {
  const { start, end } = getDateRange(period);
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
      method,
      authorId,
    }: {
      dancerId: string;
      entranceFee: number;
      method: "pin" | "facial";
      authorId: string;
    }) => {
      // Insert attendance log
      const { error: attErr } = await supabase.from("attendance_log").insert({
        dancer_id: dancerId,
        entrance_fee_amount: entranceFee,
        shift_date: today(),
      });
      if (attErr) throw attErr;

      // Append to event log
      await supabase.from("dancer_event_log").insert({
        dancer_id: dancerId,
        event_type: "check_in",
        payload: { method, house_fee_applied: entranceFee },
        author_id: authorId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance_log"] });
      qc.invalidateQueries({ queryKey: ["dancers_active"] });
    },
  });

  return { findByPin, checkIn };
}

// ─── Write: guest entry (manual) ─────────────────────────────────────────────

export function useGuestCheckIn() {
  const qc = useQueryClient();

  const manualAdd = useMutation({
    mutationFn: async ({ doorFee, loggedBy }: { doorFee: number; loggedBy: string }) => {
      const { error } = await supabase.from("customer_entries").insert({
        door_fee: doorFee,
        shift_date: today(),
        logged_by: loggedBy,
      });
      if (error) throw error;
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
      const { error } = await supabase
        .from("guests")
        .update({ notes, flagged, flagged_reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guests"] }),
  });
}
