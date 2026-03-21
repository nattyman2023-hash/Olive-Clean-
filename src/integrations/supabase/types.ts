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
      applicants: {
        Row: {
          applied_at: string
          available_days: Json | null
          cover_note: string | null
          created_at: string
          email: string
          has_transportation: boolean | null
          id: string
          job_posting_id: string | null
          name: string
          notes: string | null
          phone: string | null
          resume_url: string | null
          screening_score: number | null
          status: string
          years_experience: number | null
        }
        Insert: {
          applied_at?: string
          available_days?: Json | null
          cover_note?: string | null
          created_at?: string
          email: string
          has_transportation?: boolean | null
          id?: string
          job_posting_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          screening_score?: number | null
          status?: string
          years_experience?: number | null
        }
        Update: {
          applied_at?: string
          available_days?: Json | null
          cover_note?: string | null
          created_at?: string
          email?: string
          has_transportation?: boolean | null
          id?: string
          job_posting_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          screening_score?: number | null
          status?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          address: string | null
          bathrooms: number
          bedrooms: number
          created_at: string
          email: string
          frequency: string
          home_type: string
          id: string
          name: string
          notes: string | null
          phone: string
          service: string
          status: string
        }
        Insert: {
          address?: string | null
          bathrooms: number
          bedrooms: number
          created_at?: string
          email: string
          frequency: string
          home_type: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          service: string
          status?: string
        }
        Update: {
          address?: string | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          email?: string
          frequency?: string
          home_type?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          service?: string
          status?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          client_user_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          preferences: Json | null
        }
        Insert: {
          address?: string | null
          client_user_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
        }
        Update: {
          address?: string | null
          client_user_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
        }
        Relationships: []
      }
      employee_performance: {
        Row: {
          attendance_score: number | null
          avg_efficiency_pct: number | null
          avg_rating: number | null
          created_at: string | null
          employee_id: string
          id: string
          jobs_completed: number | null
          month: string
          recleans: number | null
        }
        Insert: {
          attendance_score?: number | null
          avg_efficiency_pct?: number | null
          avg_rating?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          jobs_completed?: number | null
          month: string
          recleans?: number | null
        }
        Update: {
          attendance_score?: number | null
          avg_efficiency_pct?: number | null
          avg_rating?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          jobs_completed?: number | null
          month?: string
          recleans?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          certifications: Json | null
          created_at: string | null
          email: string | null
          hired_at: string | null
          id: string
          name: string
          notes: string | null
          onboarding_checklist: Json | null
          phone: string | null
          photo_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          certifications?: Json | null
          created_at?: string | null
          email?: string | null
          hired_at?: string | null
          id?: string
          name: string
          notes?: string | null
          onboarding_checklist?: Json | null
          phone?: string | null
          photo_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          certifications?: Json | null
          created_at?: string | null
          email?: string | null
          hired_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          onboarding_checklist?: Json | null
          phone?: string | null
          photo_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          client_id: string
          comments: string | null
          created_at: string
          id: string
          job_id: string
          rating: number
        }
        Insert: {
          client_id: string
          comments?: string | null
          created_at?: string
          id?: string
          job_id: string
          rating: number
        }
        Update: {
          client_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          job_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          created_at: string
          description: string
          id: string
          location: string
          requirements: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          location?: string
          requirements?: string | null
          status?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          location?: string
          requirements?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          actual_duration_minutes: number | null
          assigned_to: string | null
          checklist_state: Json | null
          client_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          estimated_drive_minutes: number | null
          id: string
          notes: string | null
          price: number | null
          scheduled_at: string
          service: string
          status: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          assigned_to?: string | null
          checklist_state?: Json | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          estimated_drive_minutes?: number | null
          id?: string
          notes?: string | null
          price?: number | null
          scheduled_at: string
          service: string
          status?: string
        }
        Update: {
          actual_duration_minutes?: number | null
          assigned_to?: string | null
          checklist_state?: Json | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          estimated_drive_minutes?: number | null
          id?: string
          notes?: string | null
          price?: number | null
          scheduled_at?: string
          service?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_events: {
        Row: {
          channel: string
          client_id: string
          event_type: string
          id: string
          job_id: string | null
          sent_at: string
        }
        Insert: {
          channel?: string
          client_id: string
          event_type: string
          id?: string
          job_id?: string | null
          sent_at?: string
        }
        Update: {
          channel?: string
          client_id?: string
          event_type?: string
          id?: string
          job_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      perks_members: {
        Row: {
          client_id: string
          discount_percent: number
          flexibility_zone: string | null
          id: string
          joined_at: string
          notes: string | null
          status: string
        }
        Insert: {
          client_id: string
          discount_percent?: number
          flexibility_zone?: string | null
          id?: string
          joined_at?: string
          notes?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          discount_percent?: number
          flexibility_zone?: string | null
          id?: string
          joined_at?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "perks_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      perks_offers: {
        Row: {
          cancelled_job_id: string
          id: string
          new_job_id: string | null
          offered_at: string
          perks_member_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          cancelled_job_id: string
          id?: string
          new_job_id?: string | null
          offered_at?: string
          perks_member_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          cancelled_job_id?: string
          id?: string
          new_job_id?: string | null
          offered_at?: string
          perks_member_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "perks_offers_cancelled_job_id_fkey"
            columns: ["cancelled_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perks_offers_new_job_id_fkey"
            columns: ["new_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perks_offers_perks_member_id_fkey"
            columns: ["perks_member_id"]
            isOneToOne: false
            referencedRelation: "perks_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      supply_items: {
        Row: {
          category: string
          created_at: string
          current_stock: number
          id: string
          last_restocked_at: string | null
          name: string
          notes: string | null
          reorder_threshold: number
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked_at?: string | null
          name: string
          notes?: string | null
          reorder_threshold?: number
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked_at?: string | null
          name?: string
          notes?: string | null
          reorder_threshold?: number
          unit?: string
        }
        Relationships: []
      }
      supply_usage_logs: {
        Row: {
          employee_id: string | null
          id: string
          job_id: string | null
          logged_at: string
          quantity_used: number
          supply_item_id: string
        }
        Insert: {
          employee_id?: string | null
          id?: string
          job_id?: string | null
          logged_at?: string
          quantity_used?: number
          supply_item_id: string
        }
        Update: {
          employee_id?: string | null
          id?: string
          job_id?: string | null
          logged_at?: string
          quantity_used?: number
          supply_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_usage_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_usage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_usage_logs_supply_item_id_fkey"
            columns: ["supply_item_id"]
            isOneToOne: false
            referencedRelation: "supply_items"
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
      app_role: "admin" | "staff" | "client"
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
      app_role: ["admin", "staff", "client"],
    },
  },
} as const
