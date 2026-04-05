export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_log: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          dancer_id: string
          entrance_fee_amount: number
          id: string
          shift_date: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          dancer_id: string
          entrance_fee_amount?: number
          id?: string
          shift_date?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          dancer_id?: string
          entrance_fee_amount?: number
          id?: string
          shift_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_log_dancer_id_fkey"
            columns: ["dancer_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      behaviour_notes: {
        Row: {
          author_id: string
          created_at: string
          dancer_id: string
          id: string
          note_text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          dancer_id: string
          id?: string
          note_text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          dancer_id?: string
          id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviour_notes_dancer_id_fkey"
            columns: ["dancer_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      club_settings: {
        Row: {
          default_dancer_entrance_fee: number
          default_dancer_payout_pct: number
          default_door_fee: number
          id: string
          song_price: number
          updated_at: string
        }
        Insert: {
          default_dancer_entrance_fee?: number
          default_dancer_payout_pct?: number
          default_door_fee?: number
          id?: string
          song_price?: number
          updated_at?: string
        }
        Update: {
          default_dancer_entrance_fee?: number
          default_dancer_payout_pct?: number
          default_door_fee?: number
          id?: string
          song_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_email: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_email?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_email?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_entries: {
        Row: {
          door_fee: number
          entry_time: string
          id: string
          logged_by: string | null
          shift_date: string
        }
        Insert: {
          door_fee?: number
          entry_time?: string
          id?: string
          logged_by?: string | null
          shift_date?: string
        }
        Update: {
          door_fee?: number
          entry_time?: string
          id?: string
          logged_by?: string | null
          shift_date?: string
        }
        Relationships: []
      }
      dancer_event_log: {
        Row: {
          author_id: string | null
          created_at: string
          dancer_id: string
          event_type: Database["public"]["Enums"]["dancer_event_type"]
          id: string
          payload: Json
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          dancer_id: string
          event_type: Database["public"]["Enums"]["dancer_event_type"]
          id?: string
          payload?: Json
        }
        Update: {
          author_id?: string | null
          created_at?: string
          dancer_id?: string
          event_type?: Database["public"]["Enums"]["dancer_event_type"]
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dancer_event_log_dancer_id_fkey"
            columns: ["dancer_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      dancers: {
        Row: {
          created_at: string
          email: string | null
          employee_id: string
          entrance_fee: number
          facial_hash: string | null
          full_name: string | null
          govt_id_token: string | null
          id: string
          is_active: boolean
          live_status: Database["public"]["Enums"]["dancer_live_status"]
          onboarding_complete: boolean
          payout_percentage: number
          phone: string | null
          pin_code: string
          popularity_score: number
          profile_photo_url: string | null
          ssn_token: string | null
          stage_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          employee_id: string
          entrance_fee?: number
          facial_hash?: string | null
          full_name?: string | null
          govt_id_token?: string | null
          id?: string
          is_active?: boolean
          live_status?: Database["public"]["Enums"]["dancer_live_status"]
          onboarding_complete?: boolean
          payout_percentage?: number
          phone?: string | null
          pin_code: string
          popularity_score?: number
          profile_photo_url?: string | null
          ssn_token?: string | null
          stage_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          employee_id?: string
          entrance_fee?: number
          facial_hash?: string | null
          full_name?: string | null
          govt_id_token?: string | null
          id?: string
          is_active?: boolean
          live_status?: Database["public"]["Enums"]["dancer_live_status"]
          onboarding_complete?: boolean
          payout_percentage?: number
          phone?: string | null
          pin_code?: string
          popularity_score?: number
          profile_photo_url?: string | null
          ssn_token?: string | null
          stage_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_visits: {
        Row: {
          created_at: string
          door_fee: number
          entry_time: string
          guest_id: string
          id: string
          logged_by: string | null
          shift_date: string
        }
        Insert: {
          created_at?: string
          door_fee?: number
          entry_time?: string
          guest_id: string
          id?: string
          logged_by?: string | null
          shift_date?: string
        }
        Update: {
          created_at?: string
          door_fee?: number
          entry_time?: string
          guest_id?: string
          id?: string
          logged_by?: string | null
          shift_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_visits_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          dl_hash: string
          first_visit_date: string
          guest_display_id: string
          id: string
          is_returning: boolean
          last_visit_date: string
          visit_count: number
        }
        Insert: {
          created_at?: string
          dl_hash: string
          first_visit_date?: string
          guest_display_id: string
          id?: string
          is_returning?: boolean
          last_visit_date?: string
          visit_count?: number
        }
        Update: {
          created_at?: string
          dl_hash?: string
          first_visit_date?: string
          guest_display_id?: string
          id?: string
          is_returning?: boolean
          last_visit_date?: string
          visit_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean
          pin_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          pin_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          pin_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_sessions: {
        Row: {
          created_at: string
          dancer_cut: number
          dancer_id: string
          entry_time: string
          exit_time: string | null
          gross_amount: number
          house_cut: number
          id: string
          logged_by: string | null
          num_songs: number
          package_name: string
          room_name: string | null
          shift_date: string
        }
        Insert: {
          created_at?: string
          dancer_cut: number
          dancer_id: string
          entry_time?: string
          exit_time?: string | null
          gross_amount: number
          house_cut: number
          id?: string
          logged_by?: string | null
          num_songs?: number
          package_name: string
          room_name?: string | null
          shift_date?: string
        }
        Update: {
          created_at?: string
          dancer_cut?: number
          dancer_id?: string
          entry_time?: string
          exit_time?: string | null
          gross_amount?: number
          house_cut?: number
          id?: string
          logged_by?: string | null
          num_songs?: number
          package_name?: string
          room_name?: string | null
          shift_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_sessions_dancer_id_fkey"
            columns: ["dancer_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          dancer_cut: number
          dancer_id: string
          gross_amount: number
          house_cut: number
          id: string
          logged_by: string | null
          num_songs: number
          shift_date: string
          transaction_time: string
        }
        Insert: {
          created_at?: string
          dancer_cut: number
          dancer_id: string
          gross_amount: number
          house_cut: number
          id?: string
          logged_by?: string | null
          num_songs?: number
          shift_date?: string
          transaction_time?: string
        }
        Update: {
          created_at?: string
          dancer_cut?: number
          dancer_id?: string
          gross_amount?: number
          house_cut?: number
          id?: string
          logged_by?: string | null
          num_songs?: number
          shift_date?: string
          transaction_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_dancer_id_fkey"
            columns: ["dancer_id"]
            isOneToOne: false
            referencedRelation: "dancers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_popularity_score: {
        Args: { dancer_uuid: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      upsert_guest: {
        Args: {
          p_display_id: string
          p_dl_hash: string
          p_door_fee: number
          p_logged_by: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "door_staff" | "room_attendant" | "house_mom"
      dancer_event_type:
        | "check_in"
        | "room_session"
        | "payout"
        | "behaviour_note"
        | "profile_edit"
        | "shift_end"
      dancer_live_status: "inactive" | "on_floor" | "active_in_room"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "door_staff", "room_attendant"],
      dancer_event_type: [
        "check_in",
        "room_session",
        "payout",
        "behaviour_note",
        "profile_edit",
        "shift_end",
      ],
      dancer_live_status: ["inactive", "on_floor", "active_in_room"],
    },
  },
} as const
