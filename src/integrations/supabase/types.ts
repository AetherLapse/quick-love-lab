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
      dancers: {
        Row: {
          created_at: string
          employee_id: string
          entrance_fee: number
          id: string
          is_active: boolean
          payout_percentage: number
          pin_code: string
          stage_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          entrance_fee?: number
          id?: string
          is_active?: boolean
          payout_percentage?: number
          pin_code: string
          stage_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          entrance_fee?: number
          id?: string
          is_active?: boolean
          payout_percentage?: number
          pin_code?: string
          stage_name?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "door_staff" | "room_attendant"
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
    },
  },
} as const
