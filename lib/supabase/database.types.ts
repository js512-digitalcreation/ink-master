// Generated from the "ink masters" Supabase project. Regenerate after changing tables.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      artist_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          books_open: boolean
          city: string | null
          created_at: string
          deposit_cents: number
          display_name: string
          header_image_url: string | null
          hourly_rate_cents: number | null
          id: string
          instagram_handle: string | null
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          rating_avg: number
          rating_count: number
          shop_name: string | null
          slug: string
          starting_price_cents: number | null
          styles: string[]
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          books_open?: boolean
          city?: string | null
          created_at?: string
          deposit_cents?: number
          display_name: string
          header_image_url?: string | null
          hourly_rate_cents?: number | null
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          rating_avg?: number
          rating_count?: number
          shop_name?: string | null
          slug: string
          starting_price_cents?: number | null
          styles?: string[]
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          books_open?: boolean
          city?: string | null
          created_at?: string
          deposit_cents?: number
          display_name?: string
          header_image_url?: string | null
          hourly_rate_cents?: number | null
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          rating_avg?: number
          rating_count?: number
          shop_name?: string | null
          slug?: string
          starting_price_cents?: number | null
          styles?: string[]
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          artist_id: string
          artist_note: string | null
          client_id: string
          created_at: string
          deposit_paid: boolean
          flash_id: string | null
          id: string
          idea_description: string
          placement: string
          quoted_price_cents: number | null
          reference_image_paths: string[]
          requested_start: string
          size_inches: number
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          artist_note?: string | null
          client_id: string
          created_at?: string
          deposit_paid?: boolean
          flash_id?: string | null
          id?: string
          idea_description: string
          placement: string
          quoted_price_cents?: number | null
          reference_image_paths?: string[]
          requested_start: string
          size_inches: number
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artist_note?: string | null
          client_id?: string
          created_at?: string
          deposit_paid?: boolean
          flash_id?: string | null
          id?: string
          idea_description?: string
          placement?: string
          quoted_price_cents?: number | null
          reference_image_paths?: string[]
          requested_start?: string
          size_inches?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_flash_id_fkey"
            columns: ["flash_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          artist_id: string
          created_at: string
          estimated_minutes: number | null
          id: string
          image_path: string
          is_claimed: boolean
          is_healed: boolean
          is_repeatable: boolean
          kind: string
          placement: string | null
          price_cents: number | null
          session_hours: number | null
          size_inches: number | null
          sort_order: number
          style: string | null
          title: string | null
          tryon_image_path: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          image_path: string
          is_claimed?: boolean
          is_healed?: boolean
          is_repeatable?: boolean
          kind?: string
          placement?: string | null
          price_cents?: number | null
          session_hours?: number | null
          size_inches?: number | null
          sort_order?: number
          style?: string | null
          title?: string | null
          tryon_image_path?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          image_path?: string
          is_claimed?: boolean
          is_healed?: boolean
          is_repeatable?: boolean
          kind?: string
          placement?: string | null
          price_cents?: number | null
          session_hours?: number | null
          size_inches?: number | null
          sort_order?: number
          style?: string | null
          title?: string | null
          tryon_image_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      artist_busy_slots: {
        Args: { p_artist_id: string; p_from: string; p_to: string }
        Returns: {
          starts_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
