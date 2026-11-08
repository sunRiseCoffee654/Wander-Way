export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          amount_minor_units: number;
          booking_date: string | null;
          booking_type: string;
          confirmation_code: string | null;
          created_at: string;
          currency: string;
          id: string;
          metadata: Json | null;
          provider_name: string;
          status: string;
          trip_id: string;
        };
        Insert: {
          amount_minor_units?: number;
          booking_date?: string | null;
          booking_type: string;
          confirmation_code?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json | null;
          provider_name: string;
          status?: string;
          trip_id: string;
        };
        Update: {
          amount_minor_units?: number;
          booking_date?: string | null;
          booking_type?: string;
          confirmation_code?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json | null;
          provider_name?: string;
          status?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_line_items: {
        Row: {
          activity_id: string | null;
          amount_minor_units: number;
          category: string;
          checked_at: string | null;
          created_at: string;
          currency: string;
          evidence_type: string;
          fx_rate_to_trip_currency: number | null;
          fx_timestamp: string | null;
          id: string;
          is_paid: boolean;
          paid_by_user_id: string | null;
          source_name: string | null;
          source_url: string | null;
          title: string;
          trip_id: string;
        };
        Insert: {
          activity_id?: string | null;
          amount_minor_units?: number;
          category: string;
          checked_at?: string | null;
          created_at?: string;
          currency?: string;
          evidence_type?: string;
          fx_rate_to_trip_currency?: number | null;
          fx_timestamp?: string | null;
          id?: string;
          is_paid?: boolean;
          paid_by_user_id?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          title: string;
          trip_id: string;
        };
        Update: {
          activity_id?: string | null;
          amount_minor_units?: number;
          category?: string;
          checked_at?: string | null;
          created_at?: string;
          currency?: string;
          evidence_type?: string;
          fx_rate_to_trip_currency?: number | null;
          fx_timestamp?: string | null;
          id?: string;
          is_paid?: boolean;
          paid_by_user_id?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_line_items_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "itinerary_activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_line_items_paid_by_user_id_fkey";
            columns: ["paid_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_line_items_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          category: string;
          created_at: string;
          file_size_bytes: number;
          id: string;
          mime_type: string;
          storage_path: string;
          title: string;
          trip_id: string;
          uploaded_by: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          file_size_bytes?: number;
          id?: string;
          mime_type: string;
          storage_path: string;
          title: string;
          trip_id: string;
          uploaded_by: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          file_size_bytes?: number;
          id?: string;
          mime_type?: string;
          storage_path?: string;
          title?: string;
          trip_id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_activities: {
        Row: {
          booking_requirement: string | null;
          created_at: string;
          day_id: string;
          description: string | null;
          duration_minutes: number;
          geoapify_place_id: string | null;
          geom: unknown;
          id: string;
          is_must_see: boolean;
          is_user_edited: boolean;
          latitude: number | null;
          longitude: number | null;
          place_category: string | null;
          place_name: string | null;
          planned_time: string | null;
          sort_order: number;
          title: string;
          transit_distance_meters: number | null;
          transit_duration_seconds: number | null;
          travel_mode_to_next: string | null;
          trip_id: string;
          updated_at: string;
          proposal_id: string | null;
          source: string;
        };
        Insert: {
          booking_requirement?: string | null;
          created_at?: string;
          day_id: string;
          description?: string | null;
          duration_minutes?: number;
          geoapify_place_id?: string | null;
          geom?: unknown;
          id?: string;
          is_must_see?: boolean;
          is_user_edited?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          place_category?: string | null;
          place_name?: string | null;
          planned_time?: string | null;
          sort_order?: number;
          title: string;
          transit_distance_meters?: number | null;
          transit_duration_seconds?: number | null;
          travel_mode_to_next?: string | null;
          trip_id: string;
          updated_at?: string;
          proposal_id?: string | null;
          source?: string;
        };
        Update: {
          booking_requirement?: string | null;
          created_at?: string;
          day_id?: string;
          description?: string | null;
          duration_minutes?: number;
          geoapify_place_id?: string | null;
          geom?: unknown;
          id?: string;
          is_must_see?: boolean;
          is_user_edited?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          place_category?: string | null;
          place_name?: string | null;
          planned_time?: string | null;
          sort_order?: number;
          title?: string;
          transit_distance_meters?: number | null;
          transit_duration_seconds?: number | null;
          travel_mode_to_next?: string | null;
          trip_id?: string;
          updated_at?: string;
          proposal_id?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_activities_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "itinerary_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "itinerary_activities_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_days: {
        Row: {
          calendar_date: string;
          created_at: string;
          day_number: number;
          id: string;
          notes: string | null;
          title: string | null;
          trip_id: string;
        };
        Insert: {
          calendar_date: string;
          created_at?: string;
          day_number: number;
          id?: string;
          notes?: string | null;
          title?: string | null;
          trip_id: string;
        };
        Update: {
          calendar_date?: string;
          created_at?: string;
          day_number?: number;
          id?: string;
          notes?: string | null;
          title?: string | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      packing_items: {
        Row: {
          assigned_to_user_id: string | null;
          category: string;
          created_at: string;
          id: string;
          is_packed: boolean;
          is_suggested: boolean;
          item_name: string;
          trip_id: string;
        };
        Insert: {
          assigned_to_user_id?: string | null;
          category: string;
          created_at?: string;
          id?: string;
          is_packed?: boolean;
          is_suggested?: boolean;
          item_name: string;
          trip_id: string;
        };
        Update: {
          assigned_to_user_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_packed?: boolean;
          is_supported?: boolean;
          item_name?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packing_items_assigned_to_user_id_fkey";
            columns: ["assigned_to_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "packing_items_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          home_location: string | null;
          id: string;
          preferred_currency: string;
          travel_preferences: Json | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          home_location?: string | null;
          id: string;
          preferred_currency?: string;
          travel_preferences?: Json | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          home_location?: string | null;
          id?: string;
          preferred_currency?: string;
          travel_preferences?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_members: {
        Row: {
          id: string;
          joined_at: string;
          role: string;
          trip_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          role?: string;
          trip_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          role?: string;
          trip_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          adult_count: number;
          budget_basis: string;
          budget_currency: string;
          budget_minor_units: number;
          child_count: number;
          created_at: string;
          destination: string;
          end_date: string;
          id: string;
          origin_location: string | null;
          owner_id: string;
          preferences: Json | null;
          room_count: number;
          start_date: string;
          title: string;
          travel_pace: string;
          travel_style: string | null;
          traveler_count: number;
          trip_state: string;
          updated_at: string;
        };
        Insert: {
          adult_count?: number;
          budget_basis?: string;
          budget_currency?: string;
          budget_minor_units?: number;
          child_count?: number;
          created_at?: string;
          destination: string;
          end_date: string;
          id?: string;
          origin_location?: string | null;
          owner_id: string;
          preferences?: Json | null;
          room_count?: number;
          start_date: string;
          title: string;
          travel_pace?: string;
          travel_style?: string | null;
          traveler_count?: number;
          trip_state?: string;
          updated_at?: string;
        };
        Update: {
          adult_count?: number;
          budget_basis?: string;
          budget_currency?: string;
          budget_minor_units?: number;
          child_count?: number;
          created_at?: string;
          destination?: string;
          end_date?: string;
          id?: string;
          origin_location?: string | null;
          owner_id?: string;
          preferences?: Json | null;
          room_count?: number;
          start_date?: string;
          title?: string;
          travel_pace?: string;
          travel_style?: string | null;
          traveler_count?: number;
          trip_state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_proposals: {
        Row: {
          id: string;
          trip_id: string;
          created_by: string;
          status: string;
          stage: string;
          error_code: string | null;
          summary: string | null;
          model: string | null;
          prompt_version: string | null;
          generation_ms: number | null;
          input_snapshot: Json;
          proposal_data: Json;
          grounding_stats: Json;
          created_at: string;
          updated_at: string;
          applied_at: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          created_by: string;
          status?: string;
          stage?: string;
          error_code?: string | null;
          summary?: string | null;
          model?: string | null;
          prompt_version?: string | null;
          generation_ms?: number | null;
          input_snapshot?: Json;
          proposal_data?: Json;
          grounding_stats?: Json;
          created_at?: string;
          updated_at?: string;
          applied_at?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          created_by?: string;
          status?: string;
          stage?: string;
          error_code?: string | null;
          summary?: string | null;
          model?: string | null;
          prompt_version?: string | null;
          generation_ms?: number | null;
          input_snapshot?: Json;
          proposal_data?: Json;
          grounding_stats?: Json;
          created_at?: string;
          updated_at?: string;
          applied_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trip_proposals_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_proposals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_trip_member: {
        Args: { lookup_trip_id: string; min_role?: string };
        Returns: boolean;
      };
      create_trip_proposal: {
        Args: {
          p_trip_id: string;
          p_created_by: string;
          p_input_snapshot?: Json;
          p_model?: string | null;
          p_prompt_version?: string | null;
        };
        Returns: Database["public"]["Tables"]["trip_proposals"]["Row"];
      };
      apply_trip_proposal: {
        Args: {
          p_proposal_id: string;
          p_selected_activity_ids: string[];
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends
    DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
      ? keyof (
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
            DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
        )
      : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends
    DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
      ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends
    DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
      ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends
    DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
      ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
      : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends
    PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
      ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
      : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
