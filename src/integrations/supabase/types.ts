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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comfort_ratings: {
        Row: {
          comment: string | null
          created_at: string
          dimension: Database["public"]["Enums"]["comfort_dimension"]
          facility_id: string
          id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dimension: Database["public"]["Enums"]["comfort_dimension"]
          facility_id: string
          id?: string
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          dimension?: Database["public"]["Enums"]["comfort_dimension"]
          facility_id?: string
          id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comfort_ratings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "cultural_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_facilities: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          district: string | null
          email: string | null
          external_id: string | null
          facility_type: Database["public"]["Enums"]["facility_type"]
          has_accessibility: boolean
          has_climate_control: boolean
          has_family_zone: boolean
          has_lockers: boolean
          id: string
          image_url: string | null
          is_quiet: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood: string | null
          phone: string | null
          schedule: string | null
          source: string | null
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          email?: string | null
          external_id?: string | null
          facility_type?: Database["public"]["Enums"]["facility_type"]
          has_accessibility?: boolean
          has_climate_control?: boolean
          has_family_zone?: boolean
          has_lockers?: boolean
          id?: string
          image_url?: string | null
          is_quiet?: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood?: string | null
          phone?: string | null
          schedule?: string | null
          source?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          email?: string | null
          external_id?: string | null
          facility_type?: Database["public"]["Enums"]["facility_type"]
          has_accessibility?: boolean
          has_climate_control?: boolean
          has_family_zone?: boolean
          has_lockers?: boolean
          id?: string
          image_url?: string | null
          is_quiet?: boolean
          latitude?: number
          longitude?: number
          name?: string
          neighborhood?: string | null
          phone?: string | null
          schedule?: string | null
          source?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          created_at: string
          district: string | null
          facility_id: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          search_query: string | null
          searched_type: Database["public"]["Enums"]["facility_type"] | null
          user_id: string
          user_lat: number | null
          user_lng: number | null
          user_profile_snapshot:
            | Database["public"]["Enums"]["cultural_profile"]
            | null
        }
        Insert: {
          created_at?: string
          district?: string | null
          facility_id?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          search_query?: string | null
          searched_type?: Database["public"]["Enums"]["facility_type"] | null
          user_id: string
          user_lat?: number | null
          user_lng?: number | null
          user_profile_snapshot?:
            | Database["public"]["Enums"]["cultural_profile"]
            | null
        }
        Update: {
          created_at?: string
          district?: string | null
          facility_id?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          search_query?: string | null
          searched_type?: Database["public"]["Enums"]["facility_type"] | null
          user_id?: string
          user_lat?: number | null
          user_lng?: number | null
          user_profile_snapshot?:
            | Database["public"]["Enums"]["cultural_profile"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "cultural_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          comfort_priorities: string[]
          created_at: string
          cultural_profile: Database["public"]["Enums"]["cultural_profile"]
          display_name: string | null
          id: string
          interests: string[]
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comfort_priorities?: string[]
          created_at?: string
          cultural_profile?: Database["public"]["Enums"]["cultural_profile"]
          display_name?: string | null
          id?: string
          interests?: string[]
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comfort_priorities?: string[]
          created_at?: string
          cultural_profile?: Database["public"]["Enums"]["cultural_profile"]
          display_name?: string | null
          id?: string
          interests?: string[]
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valencia_districts: {
        Row: {
          code: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          population: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          population?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          population?: number | null
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
      app_role: "citizen" | "admin"
      comfort_dimension:
        | "acoustic"
        | "accessibility"
        | "staff"
        | "climate"
        | "family_friendly"
        | "silence"
      cultural_profile:
        | "family"
        | "researcher"
        | "tourist"
        | "local_recurrent"
        | "undefined"
      facility_type:
        | "museum"
        | "library"
        | "theater"
        | "cultural_center"
        | "exhibition_hall"
        | "auditorium"
        | "archive"
        | "other"
      interaction_type:
        | "search"
        | "view"
        | "favorite"
        | "visited"
        | "unfavorite"
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
      app_role: ["citizen", "admin"],
      comfort_dimension: [
        "acoustic",
        "accessibility",
        "staff",
        "climate",
        "family_friendly",
        "silence",
      ],
      cultural_profile: [
        "family",
        "researcher",
        "tourist",
        "local_recurrent",
        "undefined",
      ],
      facility_type: [
        "museum",
        "library",
        "theater",
        "cultural_center",
        "exhibition_hall",
        "auditorium",
        "archive",
        "other",
      ],
      interaction_type: ["search", "view", "favorite", "visited", "unfavorite"],
    },
  },
} as const
