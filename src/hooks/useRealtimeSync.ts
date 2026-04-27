import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime for every table that drives the dashboard.
 * On any INSERT / UPDATE / DELETE, the relevant React Query cache is invalidated
 * immediately — no polling delay.
 *
 * Mount this once at the AppLayout level so all pages share a single channel.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")

      // ── Attendance ──────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_log" }, () => {
        qc.invalidateQueries({ queryKey: ["attendance_log"] });
        qc.invalidateQueries({ queryKey: ["attendance_today_active"] });
        qc.invalidateQueries({ queryKey: ["dancer_balances_today"] });
        qc.invalidateQueries({ queryKey: ["dancers_active"] });
        qc.invalidateQueries({ queryKey: ["dancers_present_today"] });
      })

      // ── Room sessions ───────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "room_sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["room_sessions"] });
        qc.invalidateQueries({ queryKey: ["room_sessions_active"] });
        qc.invalidateQueries({ queryKey: ["dance_sessions"] });
      })

      // ── Customer door entries ───────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_entries" }, () => {
        qc.invalidateQueries({ queryKey: ["customer_entries"] });
        qc.invalidateQueries({ queryKey: ["guest_visits"] });
      })

      // ── Dancers ─────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "dancers" }, () => {
        qc.invalidateQueries({ queryKey: ["dancers"] });
        qc.invalidateQueries({ queryKey: ["dancers_active"] });
        qc.invalidateQueries({ queryKey: ["dancers_present_today"] });
        qc.invalidateQueries({ queryKey: ["dancer_balances_today"] });
      })

      // ── Stage rotation ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_rotation" }, () => {
        qc.invalidateQueries({ queryKey: ["dancers_active"] });
      })

      // ── Stage fines ─────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_fines" }, () => {
        qc.invalidateQueries({ queryKey: ["attendance_log"] });
        qc.invalidateQueries({ queryKey: ["dancer_balances_today"] });
      })

      // ── Kiosk sessions ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "kiosk_sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["kiosk_sessions"] });
      })

      // ── Stage sessions ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["stage_sessions"] });
      })

      // ── Early leave codes ───────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "early_leave_codes" }, () => {
        qc.invalidateQueries({ queryKey: ["early_leave_codes_today"] });
      })

      // ── Guests ──────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => {
        qc.invalidateQueries({ queryKey: ["guests"] });
        qc.invalidateQueries({ queryKey: ["guest_visits"] });
      })

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
