


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'manager',
    'door_staff',
    'room_attendant',
    'house_mom',
    'owner',
    'bartender',
    'dancer',
    'dj'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."dancer_event_type" AS ENUM (
    'check_in',
    'room_session',
    'payout',
    'behaviour_note',
    'profile_edit',
    'shift_end',
    'check_out',
    'ban',
    'unban',
    'enroll',
    'guest_entry'
);


ALTER TYPE "public"."dancer_event_type" OWNER TO "postgres";


CREATE TYPE "public"."dancer_live_status" AS ENUM (
    'inactive',
    'on_floor',
    'active_in_room'
);


ALTER TYPE "public"."dancer_live_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_set_employee_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.enroll_id IS NULL OR trim(NEW.enroll_id) = '' THEN
    NEW.enroll_id := 'D-' || LPAD(NEW.dancer_number::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_set_employee_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_popularity_score"("dancer_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  session_count INTEGER;
  total_earnings NUMERIC;
  score NUMERIC;
BEGIN
  SELECT COUNT(*) INTO session_count
  FROM public.room_sessions
  WHERE dancer_id = dancer_uuid
    AND entry_time >= now() - INTERVAL '30 days';

  SELECT COALESCE(SUM(dancer_cut), 0) INTO total_earnings
  FROM public.room_sessions
  WHERE dancer_id = dancer_uuid
    AND entry_time >= now() - INTERVAL '30 days';

  score := (session_count * 10) + (total_earnings / 10);

  UPDATE public.dancers SET popularity_score = score WHERE id = dancer_uuid;
  RETURN score;
END;
$$;


ALTER FUNCTION "public"."calculate_popularity_score"("dancer_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_dancer_cascade"("p_dancer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  delete from public.dancer_event_log where dancer_id = p_dancer_id;
  delete from public.room_sessions     where dancer_id = p_dancer_id;
  delete from public.attendance_log    where dancer_id = p_dancer_id;
  delete from public.dancers           where id         = p_dancer_id;
end;
$$;


ALTER FUNCTION "public"."delete_dancer_cascade"("p_dancer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_attendance_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Clocked in — dancer is on the floor
    UPDATE public.dancers SET live_status = 'on_floor' WHERE id = NEW.dancer_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL THEN
    -- Clocked out — dancer is inactive
    UPDATE public.dancers SET live_status = 'inactive' WHERE id = NEW.dancer_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_attendance_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_guest_visit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.guests
  SET
    visit_count = visit_count + 1,
    last_visit_date = CURRENT_DATE,
    is_returning = (visit_count + 1) >= 2
  WHERE id = NEW.guest_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_guest_visit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_room_session_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Session started — dancer is now active in room
    UPDATE public.dancers SET live_status = 'active_in_room' WHERE id = NEW.dancer_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
    -- Session ended — revert to on_floor if still clocked in, else inactive
    IF EXISTS (
      SELECT 1 FROM public.attendance_log
      WHERE dancer_id = NEW.dancer_id
        AND shift_date = CURRENT_DATE
        AND clock_out IS NULL
    ) THEN
      UPDATE public.dancers SET live_status = 'on_floor' WHERE id = NEW.dancer_id;
    ELSE
      UPDATE public.dancers SET live_status = 'inactive' WHERE id = NEW.dancer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_room_session_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_dance_session"("p_dancer_id" "uuid", "p_tier_id" "uuid", "p_total_amount" numeric, "p_duration_min" numeric DEFAULT NULL::numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id          uuid;
  v_tier_name   text;
  v_house_pct   numeric;
  v_dancer_pct  numeric;
  v_house_cut   numeric;
  v_dancer_cut  numeric;
begin
  -- Lookup tier details (name + split percentages)
  select name, house_pct, dancer_pct
    into v_tier_name, v_house_pct, v_dancer_pct
    from public.dance_tiers
   where id = p_tier_id;

  -- Fallback if tier not found (e.g. custom)
  if v_tier_name is null then
    v_tier_name  := 'Custom';
    v_house_pct  := 70;
    v_dancer_pct := 30;
  end if;

  v_house_cut  := round(p_total_amount * v_house_pct  / 100, 2);
  v_dancer_cut := round(p_total_amount * v_dancer_pct / 100, 2);

  insert into public.dance_sessions (
    primary_dancer_id,
    tier_id,
    tier_name,
    gross_amount,
    house_cut,
    dancer_cut,
    logged_by
  ) values (
    p_dancer_id,
    p_tier_id,
    v_tier_name,
    p_total_amount,
    v_house_cut,
    v_dancer_cut,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."log_dance_session"("p_dancer_id" "uuid", "p_tier_id" "uuid", "p_total_amount" numeric, "p_duration_min" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_guest"("p_dl_hash" "text", "p_display_id" "text", "p_door_fee" numeric, "p_logged_by" "uuid", "p_full_name" "text" DEFAULT NULL::"text", "p_address" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_guest_id uuid;
begin
  insert into public.guests (dl_hash, guest_display_id, full_name, address)
  values (p_dl_hash, p_display_id, p_full_name, p_address)
  on conflict (dl_hash) do update
    set full_name = coalesce(guests.full_name, excluded.full_name),
        address   = coalesce(guests.address,   excluded.address);

  select id into v_guest_id from public.guests where dl_hash = p_dl_hash;

  insert into public.guest_visits (guest_id, door_fee, logged_by)
  values (v_guest_id, p_door_fee, p_logged_by);

  return v_guest_id;
end;
$$;


ALTER FUNCTION "public"."upsert_guest"("p_dl_hash" "text", "p_display_id" "text", "p_door_fee" numeric, "p_logged_by" "uuid", "p_full_name" "text", "p_address" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "clock_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clock_out" timestamp with time zone,
    "entrance_fee_amount" numeric(10,2) DEFAULT 50.00 NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "early_leave_fine" integer DEFAULT 0 NOT NULL,
    "fine_waived" boolean DEFAULT false NOT NULL,
    "waiver_code_id" "uuid",
    "checked_out_by" "uuid",
    "amount_paid" numeric(10,2) DEFAULT 0 NOT NULL,
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "late_arrival_fee_amount" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."attendance_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."behaviour_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "note_text" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."behaviour_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bottle_service" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "notes" "text",
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "logged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bottle_service" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_price" numeric(10,2) DEFAULT 50.00 NOT NULL,
    "default_door_fee" numeric(10,2) DEFAULT 20.00 NOT NULL,
    "default_dancer_entrance_fee" numeric(10,2) DEFAULT 50.00 NOT NULL,
    "default_dancer_payout_pct" numeric(5,2) DEFAULT 30.00 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "report_email" "text",
    "daily_report_enabled" boolean DEFAULT true NOT NULL,
    "weekly_report_enabled" boolean DEFAULT true NOT NULL,
    "open_time" time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    "leave_cutoff_time" time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    "day_reset_time" time without time zone DEFAULT '06:00:00'::time without time zone NOT NULL,
    "late_arrival_time" time without time zone DEFAULT '20:30:00'::time without time zone NOT NULL
);


ALTER TABLE "public"."club_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "api_key" "text" DEFAULT "encode"(("uuid_send"("gen_random_uuid"()) || "uuid_send"("gen_random_uuid"())), 'hex'::"text") NOT NULL,
    "owner_email" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "door_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "logged_by" "uuid",
    "vendor_id" "uuid",
    "entry_tier_id" "uuid",
    "guest_count" integer DEFAULT 1 NOT NULL,
    "vendor_name" "text"
);


ALTER TABLE "public"."customer_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dance_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "primary_dancer_id" "uuid" NOT NULL,
    "secondary_dancer_id" "uuid",
    "tier_id" "uuid",
    "tier_name" "text" NOT NULL,
    "custom_price" numeric(10,2),
    "gross_amount" numeric(10,2) NOT NULL,
    "house_cut" numeric(10,2) NOT NULL,
    "dancer_cut" numeric(10,2) NOT NULL,
    "secondary_dancer_cut" numeric(10,2),
    "is_two_girls" boolean DEFAULT false NOT NULL,
    "entry_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exit_time" timestamp with time zone,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "logged_by" "uuid",
    "distributor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_count" integer DEFAULT 1 NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dance_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dance_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "house_pct" numeric(5,2) DEFAULT 70 NOT NULL,
    "dancer_pct" numeric(5,2) DEFAULT 30 NOT NULL,
    "duration_seconds" integer,
    "is_custom" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_minutes" integer
);


ALTER TABLE "public"."dance_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dancer_ban_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "reason" "text",
    "actioned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dancer_ban_log_action_check" CHECK (("action" = ANY (ARRAY['banned'::"text", 'unbanned'::"text"])))
);


ALTER TABLE "public"."dancer_ban_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dancer_event_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "event_type" "public"."dancer_event_type" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "author_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dancer_event_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dancer_stage_names" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dancer_stage_names" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dancers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_name" "text" NOT NULL,
    "enroll_id" "text",
    "pin_code" "text" NOT NULL,
    "payout_percentage" numeric(5,2) DEFAULT 30.00 NOT NULL,
    "entrance_fee" numeric(10,2) DEFAULT 50.00 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "facial_hash" "text",
    "govt_id_token" "text",
    "ssn_token" "text",
    "live_status" "public"."dancer_live_status" DEFAULT 'inactive'::"public"."dancer_live_status" NOT NULL,
    "popularity_score" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "onboarding_complete" boolean DEFAULT false NOT NULL,
    "profile_photo_url" "text",
    "house_fee_rate" numeric(10,2) DEFAULT 30 NOT NULL,
    "late_house_fee_rate" numeric(10,2) DEFAULT 50 NOT NULL,
    "music_fee_rate" numeric(10,2) DEFAULT 20 NOT NULL,
    "late_threshold" time without time zone,
    "outstanding_balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "dancer_number" integer NOT NULL,
    "is_enrolled" boolean DEFAULT false NOT NULL,
    "enrolled_at" timestamp with time zone,
    "enrolled_by" "uuid",
    "dl_hash" "text",
    "dl_masked" "text",
    "dob" "date",
    "dl_address" "text",
    "dl_full_name" "text",
    "ssn_encrypted" "text",
    "ssn_iv" "text",
    "is_banned" boolean DEFAULT false NOT NULL,
    "ban_reason" "text",
    "banned_at" timestamp with time zone,
    "banned_by" "uuid"
);


ALTER TABLE "public"."dancers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dancers_dancer_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dancers_dancer_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dancers_dancer_number_seq" OWNED BY "public"."dancers"."dancer_number";



CREATE TABLE IF NOT EXISTS "public"."distributors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "commission_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."distributors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."early_leave_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "generated_by" "uuid" NOT NULL,
    "dancer_id" "uuid",
    "used" boolean DEFAULT false NOT NULL,
    "used_at" timestamp with time zone,
    "used_by_dancer_id" "uuid",
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_from" time without time zone,
    "valid_until" time without time zone
);


ALTER TABLE "public"."early_leave_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entry_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "description" "text",
    "requires_distributor" boolean DEFAULT false NOT NULL,
    "admits_count" integer DEFAULT 1 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entry_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid" NOT NULL,
    "entry_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "door_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "logged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exit_time" timestamp with time zone
);


ALTER TABLE "public"."guest_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dl_hash" "text" NOT NULL,
    "guest_display_id" "text" NOT NULL,
    "visit_count" integer DEFAULT 0 NOT NULL,
    "first_visit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "last_visit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "is_returning" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text",
    "notes" "text",
    "flagged" boolean DEFAULT false NOT NULL,
    "flagged_reason" "text",
    "address" "text"
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kiosk_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_token" "text" NOT NULL,
    "user_id" "uuid",
    "role" "text",
    "path" "text" DEFAULT '/'::"text",
    "user_agent" "text",
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "locked_at" timestamp with time zone
);


ALTER TABLE "public"."kiosk_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attendance_id" "uuid" NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "pin_code" "text",
    "employee_id" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "label" "text",
    "entry_tier_id" "uuid",
    "vendor_id" "uuid",
    "max_uses" integer DEFAULT 1 NOT NULL,
    "use_count" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "redeemed_by" "uuid",
    "guest_visit_id" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE "public"."promo_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "room_name" "text",
    "entry_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exit_time" timestamp with time zone,
    "num_songs" integer DEFAULT 1 NOT NULL,
    "package_name" "text" NOT NULL,
    "gross_amount" numeric(10,2) NOT NULL,
    "house_cut" numeric(10,2) NOT NULL,
    "dancer_cut" numeric(10,2) NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "logged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_minutes" integer,
    "extension_minutes" integer DEFAULT 0 NOT NULL,
    "package_log" "text"
);


ALTER TABLE "public"."room_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "clock_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clock_out" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stage_fines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid",
    "dancer_name" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "amount" integer DEFAULT 25 NOT NULL,
    "issued_by" "uuid",
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stage_fines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stage_rotation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stage_rotation_status_check" CHECK (("status" = ANY (ARRAY['on_stage'::"text", 'on_deck'::"text", 'queued'::"text"])))
);


ALTER TABLE "public"."stage_rotation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stage_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "dancer_name" "text" NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_sec" integer,
    "end_reason" "text" DEFAULT 'completed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stage_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dancer_id" "uuid" NOT NULL,
    "transaction_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "num_songs" integer DEFAULT 1 NOT NULL,
    "gross_amount" numeric(10,2) NOT NULL,
    "house_cut" numeric(10,2) NOT NULL,
    "dancer_cut" numeric(10,2) NOT NULL,
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "logged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_action_log" AS
 SELECT "del"."id",
    "del"."created_at" AS "ts",
    ("del"."event_type")::"text" AS "action",
    "p"."full_name" AS "staff_name",
    ("ur"."role")::"text" AS "staff_role",
    "del"."author_id" AS "staff_id",
    "d"."stage_name" AS "subject_name",
    "d"."enroll_id" AS "subject_id",
    "del"."payload" AS "detail",
    'dancer_event'::"text" AS "source"
   FROM ((("public"."dancer_event_log" "del"
     LEFT JOIN "public"."profiles" "p" ON (("p"."user_id" = "del"."author_id")))
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "del"."author_id")))
     LEFT JOIN "public"."dancers" "d" ON (("d"."id" = "del"."dancer_id")))
UNION ALL
 SELECT "rs"."id",
    "rs"."created_at" AS "ts",
    'room_session'::"text" AS "action",
    "p"."full_name" AS "staff_name",
    ("ur"."role")::"text" AS "staff_role",
    "rs"."logged_by" AS "staff_id",
    "d"."stage_name" AS "subject_name",
    "d"."enroll_id" AS "subject_id",
    "jsonb_build_object"('room', "rs"."room_name", 'package', "rs"."package_name", 'songs', "rs"."num_songs", 'gross', "rs"."gross_amount", 'ended', ("rs"."exit_time" IS NOT NULL)) AS "detail",
    'room_session'::"text" AS "source"
   FROM ((("public"."room_sessions" "rs"
     LEFT JOIN "public"."profiles" "p" ON (("p"."user_id" = "rs"."logged_by")))
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "rs"."logged_by")))
     LEFT JOIN "public"."dancers" "d" ON (("d"."id" = "rs"."dancer_id")))
UNION ALL
 SELECT "ce"."id",
    "ce"."entry_time" AS "ts",
    'guest_entry'::"text" AS "action",
    "p"."full_name" AS "staff_name",
    ("ur"."role")::"text" AS "staff_role",
    "ce"."logged_by" AS "staff_id",
    COALESCE("ce"."vendor_name", 'Walk-in Guest'::"text") AS "subject_name",
    NULL::"text" AS "subject_id",
    "jsonb_build_object"('door_fee', "ce"."door_fee", 'guest_count', COALESCE("ce"."guest_count", 1)) AS "detail",
    'guest_entry'::"text" AS "source"
   FROM (("public"."customer_entries" "ce"
     LEFT JOIN "public"."profiles" "p" ON (("p"."user_id" = "ce"."logged_by")))
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "ce"."logged_by")))
UNION ALL
 SELECT "dbl"."id",
    "dbl"."created_at" AS "ts",
    "dbl"."action",
    "p"."full_name" AS "staff_name",
    ("ur"."role")::"text" AS "staff_role",
    "dbl"."actioned_by" AS "staff_id",
    "d"."stage_name" AS "subject_name",
    "d"."enroll_id" AS "subject_id",
    "jsonb_build_object"('reason', "dbl"."reason") AS "detail",
    'ban_log'::"text" AS "source"
   FROM ((("public"."dancer_ban_log" "dbl"
     LEFT JOIN "public"."profiles" "p" ON (("p"."user_id" = "dbl"."actioned_by")))
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "dbl"."actioned_by")))
     LEFT JOIN "public"."dancers" "d" ON (("d"."id" = "dbl"."dancer_id")));


ALTER VIEW "public"."v_staff_action_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "phone" "text",
    "email" "text",
    "commission_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."dancers" ALTER COLUMN "dancer_number" SET DEFAULT "nextval"('"public"."dancers_dancer_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."attendance_log"
    ADD CONSTRAINT "attendance_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."behaviour_notes"
    ADD CONSTRAINT "behaviour_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bottle_service"
    ADD CONSTRAINT "bottle_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_settings"
    ADD CONSTRAINT "club_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_api_key_key" UNIQUE ("api_key");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."customer_entries"
    ADD CONSTRAINT "customer_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dance_sessions"
    ADD CONSTRAINT "dance_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dance_tiers"
    ADD CONSTRAINT "dance_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dancer_ban_log"
    ADD CONSTRAINT "dancer_ban_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dancer_event_log"
    ADD CONSTRAINT "dancer_event_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dancer_stage_names"
    ADD CONSTRAINT "dancer_stage_names_dancer_id_name_key" UNIQUE ("dancer_id", "name");



ALTER TABLE ONLY "public"."dancer_stage_names"
    ADD CONSTRAINT "dancer_stage_names_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dancers"
    ADD CONSTRAINT "dancers_employee_id_key" UNIQUE ("enroll_id");



ALTER TABLE ONLY "public"."dancers"
    ADD CONSTRAINT "dancers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."early_leave_codes"
    ADD CONSTRAINT "early_leave_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."early_leave_codes"
    ADD CONSTRAINT "early_leave_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_tiers"
    ADD CONSTRAINT "entry_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_visits"
    ADD CONSTRAINT "guest_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_dl_hash_key" UNIQUE ("dl_hash");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kiosk_sessions"
    ADD CONSTRAINT "kiosk_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kiosk_sessions"
    ADD CONSTRAINT "kiosk_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_sessions"
    ADD CONSTRAINT "room_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_attendance"
    ADD CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stage_fines"
    ADD CONSTRAINT "stage_fines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stage_rotation"
    ADD CONSTRAINT "stage_rotation_dancer_id_key" UNIQUE ("dancer_id");



ALTER TABLE ONLY "public"."stage_rotation"
    ADD CONSTRAINT "stage_rotation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stage_sessions"
    ADD CONSTRAINT "stage_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "dancer_ban_log_dancer_idx" ON "public"."dancer_ban_log" USING "btree" ("dancer_id");



CREATE UNIQUE INDEX "dancers_dancer_number_idx" ON "public"."dancers" USING "btree" ("dancer_number");



CREATE INDEX "dancers_dl_hash_idx" ON "public"."dancers" USING "btree" ("dl_hash");



CREATE INDEX "dancers_is_banned_idx" ON "public"."dancers" USING "btree" ("is_banned") WHERE ("is_banned" = true);



CREATE INDEX "idx_payment_history_attendance" ON "public"."payment_history" USING "btree" ("attendance_id");



CREATE INDEX "idx_payment_history_dancer_date" ON "public"."payment_history" USING "btree" ("dancer_id", "shift_date");



CREATE INDEX "idx_stage_sessions_dancer_date" ON "public"."stage_sessions" USING "btree" ("dancer_id", "shift_date");



CREATE INDEX "idx_stage_sessions_shift_date" ON "public"."stage_sessions" USING "btree" ("shift_date");



CREATE INDEX "staff_attendance_profile_date" ON "public"."staff_attendance" USING "btree" ("profile_id", "shift_date");



CREATE OR REPLACE TRIGGER "on_attendance_change" AFTER INSERT OR UPDATE ON "public"."attendance_log" FOR EACH ROW EXECUTE FUNCTION "public"."handle_attendance_status"();



CREATE OR REPLACE TRIGGER "on_guest_visit_inserted" AFTER INSERT ON "public"."guest_visits" FOR EACH ROW EXECUTE FUNCTION "public"."handle_guest_visit"();



CREATE OR REPLACE TRIGGER "on_room_session_change" AFTER INSERT OR UPDATE ON "public"."room_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_room_session_status"();



CREATE OR REPLACE TRIGGER "trg_auto_employee_id" BEFORE INSERT ON "public"."dancers" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_employee_id"();



CREATE OR REPLACE TRIGGER "update_club_settings_updated_at" BEFORE UPDATE ON "public"."club_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clubs_updated_at" BEFORE UPDATE ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dancers_updated_at" BEFORE UPDATE ON "public"."dancers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."attendance_log"
    ADD CONSTRAINT "attendance_log_checked_out_by_fkey" FOREIGN KEY ("checked_out_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."attendance_log"
    ADD CONSTRAINT "attendance_log_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."behaviour_notes"
    ADD CONSTRAINT "behaviour_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."behaviour_notes"
    ADD CONSTRAINT "behaviour_notes_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."bottle_service"
    ADD CONSTRAINT "bottle_service_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_entries"
    ADD CONSTRAINT "customer_entries_entry_tier_id_fkey" FOREIGN KEY ("entry_tier_id") REFERENCES "public"."entry_tiers"("id");



ALTER TABLE ONLY "public"."customer_entries"
    ADD CONSTRAINT "customer_entries_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_entries"
    ADD CONSTRAINT "customer_entries_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dance_sessions"
    ADD CONSTRAINT "dance_sessions_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributors"("id");



ALTER TABLE ONLY "public"."dance_sessions"
    ADD CONSTRAINT "dance_sessions_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dance_sessions"
    ADD CONSTRAINT "dance_sessions_primary_dancer_id_fkey" FOREIGN KEY ("primary_dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."dance_sessions"
    ADD CONSTRAINT "dance_sessions_secondary_dancer_id_fkey" FOREIGN KEY ("secondary_dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."dance_sessions"
    ADD CONSTRAINT "dance_sessions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."dance_tiers"("id");



ALTER TABLE ONLY "public"."dancer_ban_log"
    ADD CONSTRAINT "dancer_ban_log_actioned_by_fkey" FOREIGN KEY ("actioned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dancer_ban_log"
    ADD CONSTRAINT "dancer_ban_log_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dancer_event_log"
    ADD CONSTRAINT "dancer_event_log_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dancer_event_log"
    ADD CONSTRAINT "dancer_event_log_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."dancer_stage_names"
    ADD CONSTRAINT "dancer_stage_names_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dancers"
    ADD CONSTRAINT "dancers_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dancers"
    ADD CONSTRAINT "dancers_enrolled_by_fkey" FOREIGN KEY ("enrolled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."early_leave_codes"
    ADD CONSTRAINT "early_leave_codes_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."early_leave_codes"
    ADD CONSTRAINT "early_leave_codes_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."early_leave_codes"
    ADD CONSTRAINT "early_leave_codes_used_by_dancer_id_fkey" FOREIGN KEY ("used_by_dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."guest_visits"
    ADD CONSTRAINT "guest_visits_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_visits"
    ADD CONSTRAINT "guest_visits_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."kiosk_sessions"
    ADD CONSTRAINT "kiosk_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_log"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_entry_tier_id_fkey" FOREIGN KEY ("entry_tier_id") REFERENCES "public"."entry_tiers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id");



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."room_sessions"
    ADD CONSTRAINT "room_sessions_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."room_sessions"
    ADD CONSTRAINT "room_sessions_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."staff_attendance"
    ADD CONSTRAINT "staff_attendance_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stage_fines"
    ADD CONSTRAINT "stage_fines_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stage_fines"
    ADD CONSTRAINT "stage_fines_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stage_rotation"
    ADD CONSTRAINT "stage_rotation_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."stage_sessions"
    ADD CONSTRAINT "stage_sessions_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_dancer_id_fkey" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage dancers" ON "public"."dancers" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage settings" ON "public"."club_settings" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read all user_roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role")));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role")));



CREATE POLICY "Authenticated can read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert payment_history" ON "public"."payment_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert stage_sessions" ON "public"."stage_sessions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read payment_history" ON "public"."payment_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read stage_sessions" ON "public"."stage_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update stage_sessions" ON "public"."stage_sessions" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Club staff can read ban log" ON "public"."dancer_ban_log" FOR SELECT USING (true);



CREATE POLICY "Managers and admins can read event log" ON "public"."dancer_event_log" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'manager'::"public"."app_role")));



CREATE POLICY "Managers can insert behaviour notes" ON "public"."behaviour_notes" FOR INSERT TO "authenticated" WITH CHECK ((("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'manager'::"public"."app_role")) AND ("author_id" = "auth"."uid"())));



CREATE POLICY "Managers can read behaviour notes" ON "public"."behaviour_notes" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'manager'::"public"."app_role")));



CREATE POLICY "Managers can update guest metadata" ON "public"."guests" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'manager'::"public"."app_role")));



CREATE POLICY "No direct client access to clubs" ON "public"."clubs" TO "authenticated" USING (false);



CREATE POLICY "Owner/manager can write ban log" ON "public"."dancer_ban_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Staff can insert attendance" ON "public"."attendance_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Staff can insert customer entries" ON "public"."customer_entries" FOR INSERT TO "authenticated" WITH CHECK (("logged_by" = "auth"."uid"()));



CREATE POLICY "Staff can insert event log" ON "public"."dancer_event_log" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Staff can insert guest visits" ON "public"."guest_visits" FOR INSERT TO "authenticated" WITH CHECK (("logged_by" = "auth"."uid"()));



CREATE POLICY "Staff can insert guests" ON "public"."guests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Staff can insert room sessions" ON "public"."room_sessions" FOR INSERT TO "authenticated" WITH CHECK (("logged_by" = "auth"."uid"()));



CREATE POLICY "Staff can insert transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("logged_by" = "auth"."uid"()));



CREATE POLICY "Staff can read attendance" ON "public"."attendance_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read customer entries" ON "public"."customer_entries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read dancers" ON "public"."dancers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read guest visits" ON "public"."guest_visits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read guests" ON "public"."guests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read room sessions" ON "public"."room_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read settings" ON "public"."club_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can read transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff can update attendance" ON "public"."attendance_log" FOR UPDATE TO "authenticated" USING (("shift_date" = CURRENT_DATE));



CREATE POLICY "Staff can update room sessions today" ON "public"."room_sessions" FOR UPDATE TO "authenticated" USING ((("shift_date" = CURRENT_DATE) AND ("public"."has_role"("auth"."uid"(), 'room_attendant'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'door_staff'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'manager'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role"))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_manage_dance_tiers" ON "public"."dance_tiers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admin_manage_distributors" ON "public"."distributors" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admin_manage_early_leave_codes" ON "public"."early_leave_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role", 'manager'::"public"."app_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role", 'manager'::"public"."app_role"]))))));



CREATE POLICY "admin_manage_entry_tiers" ON "public"."entry_tiers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admin_manage_promo_codes" ON "public"."promo_codes" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role")));



CREATE POLICY "admin_manage_vendors" ON "public"."vendors" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'owner'::"public"."app_role")));



ALTER TABLE "public"."attendance_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_delete_stage_rotation" ON "public"."stage_rotation" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth_insert_bottle_service" ON "public"."bottle_service" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_dance_sessions" ON "public"."dance_sessions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_redemptions" ON "public"."promo_redemptions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_stage_rotation" ON "public"."stage_rotation" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_select_bottle_service" ON "public"."bottle_service" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_dance_sessions" ON "public"."dance_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_dance_tiers" ON "public"."dance_tiers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_distributors" ON "public"."distributors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_entry_tiers" ON "public"."entry_tiers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_promo_codes" ON "public"."promo_codes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_redemptions" ON "public"."promo_redemptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_stage_rotation" ON "public"."stage_rotation" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_vendors" ON "public"."vendors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_update_dance_sessions" ON "public"."dance_sessions" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "auth_update_dancers" ON "public"."dancers" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "auth_update_stage_rotation" ON "public"."stage_rotation" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "authenticated_all" ON "public"."staff_attendance" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."behaviour_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bottle_service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."club_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dance_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dance_sessions_insert" ON "public"."dance_sessions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "dance_sessions_read" ON "public"."dance_sessions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."dance_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dancer_ban_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dancer_event_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dancer_stage_names" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dancers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."distributors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "door_staff_update_attendance_log" ON "public"."attendance_log" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role", 'manager'::"public"."app_role", 'door_staff'::"public"."app_role", 'house_mom'::"public"."app_role"]))))));



ALTER TABLE "public"."early_leave_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kiosk_admin_select" ON "public"."kiosk_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role", 'manager'::"public"."app_role"]))))));



CREATE POLICY "kiosk_admin_update" ON "public"."kiosk_sessions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "kiosk_self" ON "public"."kiosk_sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."kiosk_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all" ON "public"."staff_attendance" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."staff_attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_insert_dancers" ON "public"."dancers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "staff_manage_stage_fines" ON "public"."stage_fines" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "staff_read_early_leave_codes" ON "public"."early_leave_codes" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "staff_update_promo_codes" ON "public"."promo_codes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "staff_use_early_leave_codes" ON "public"."early_leave_codes" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."stage_fines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stage_rotation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stage_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."auto_set_employee_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_set_employee_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_set_employee_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_popularity_score"("dancer_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_popularity_score"("dancer_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_popularity_score"("dancer_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_dancer_cascade"("p_dancer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_dancer_cascade"("p_dancer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_dancer_cascade"("p_dancer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_attendance_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_attendance_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_attendance_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_guest_visit"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_guest_visit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_guest_visit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_room_session_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_room_session_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_room_session_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_dance_session"("p_dancer_id" "uuid", "p_tier_id" "uuid", "p_total_amount" numeric, "p_duration_min" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_dance_session"("p_dancer_id" "uuid", "p_tier_id" "uuid", "p_total_amount" numeric, "p_duration_min" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_dance_session"("p_dancer_id" "uuid", "p_tier_id" "uuid", "p_total_amount" numeric, "p_duration_min" numeric, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_guest"("p_dl_hash" "text", "p_display_id" "text", "p_door_fee" numeric, "p_logged_by" "uuid", "p_full_name" "text", "p_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_guest"("p_dl_hash" "text", "p_display_id" "text", "p_door_fee" numeric, "p_logged_by" "uuid", "p_full_name" "text", "p_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_guest"("p_dl_hash" "text", "p_display_id" "text", "p_door_fee" numeric, "p_logged_by" "uuid", "p_full_name" "text", "p_address" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."attendance_log" TO "anon";
GRANT ALL ON TABLE "public"."attendance_log" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_log" TO "service_role";



GRANT ALL ON TABLE "public"."behaviour_notes" TO "anon";
GRANT ALL ON TABLE "public"."behaviour_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."behaviour_notes" TO "service_role";



GRANT ALL ON TABLE "public"."bottle_service" TO "anon";
GRANT ALL ON TABLE "public"."bottle_service" TO "authenticated";
GRANT ALL ON TABLE "public"."bottle_service" TO "service_role";



GRANT ALL ON TABLE "public"."club_settings" TO "anon";
GRANT ALL ON TABLE "public"."club_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."club_settings" TO "service_role";



GRANT ALL ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT ALL ON TABLE "public"."customer_entries" TO "anon";
GRANT ALL ON TABLE "public"."customer_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_entries" TO "service_role";



GRANT ALL ON TABLE "public"."dance_sessions" TO "anon";
GRANT ALL ON TABLE "public"."dance_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."dance_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."dance_tiers" TO "anon";
GRANT ALL ON TABLE "public"."dance_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."dance_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."dancer_ban_log" TO "anon";
GRANT ALL ON TABLE "public"."dancer_ban_log" TO "authenticated";
GRANT ALL ON TABLE "public"."dancer_ban_log" TO "service_role";



GRANT ALL ON TABLE "public"."dancer_event_log" TO "anon";
GRANT ALL ON TABLE "public"."dancer_event_log" TO "authenticated";
GRANT ALL ON TABLE "public"."dancer_event_log" TO "service_role";



GRANT ALL ON TABLE "public"."dancer_stage_names" TO "anon";
GRANT ALL ON TABLE "public"."dancer_stage_names" TO "authenticated";
GRANT ALL ON TABLE "public"."dancer_stage_names" TO "service_role";



GRANT ALL ON TABLE "public"."dancers" TO "anon";
GRANT ALL ON TABLE "public"."dancers" TO "authenticated";
GRANT ALL ON TABLE "public"."dancers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dancers_dancer_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dancers_dancer_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dancers_dancer_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."distributors" TO "anon";
GRANT ALL ON TABLE "public"."distributors" TO "authenticated";
GRANT ALL ON TABLE "public"."distributors" TO "service_role";



GRANT ALL ON TABLE "public"."early_leave_codes" TO "anon";
GRANT ALL ON TABLE "public"."early_leave_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."early_leave_codes" TO "service_role";



GRANT ALL ON TABLE "public"."entry_tiers" TO "anon";
GRANT ALL ON TABLE "public"."entry_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."guest_visits" TO "anon";
GRANT ALL ON TABLE "public"."guest_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_visits" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."kiosk_sessions" TO "anon";
GRANT ALL ON TABLE "public"."kiosk_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."kiosk_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_history" TO "anon";
GRANT ALL ON TABLE "public"."payment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_history" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."promo_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."promo_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."room_sessions" TO "anon";
GRANT ALL ON TABLE "public"."room_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."room_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."staff_attendance" TO "anon";
GRANT ALL ON TABLE "public"."staff_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."stage_fines" TO "anon";
GRANT ALL ON TABLE "public"."stage_fines" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_fines" TO "service_role";



GRANT ALL ON TABLE "public"."stage_rotation" TO "anon";
GRANT ALL ON TABLE "public"."stage_rotation" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_rotation" TO "service_role";



GRANT ALL ON TABLE "public"."stage_sessions" TO "anon";
GRANT ALL ON TABLE "public"."stage_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_action_log" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_action_log" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_action_log" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































