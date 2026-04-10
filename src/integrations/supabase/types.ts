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
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_availability: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_available: boolean
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
          fixed_job_rate: number | null
          hired_at: string | null
          id: string
          name: string
          notes: string | null
          onboarding_checklist: Json | null
          pay_type: string
          phone: string | null
          photo_url: string | null
          status: string
          user_id: string
          worker_classification: string
        }
        Insert: {
          certifications?: Json | null
          created_at?: string | null
          email?: string | null
          fixed_job_rate?: number | null
          hired_at?: string | null
          id?: string
          name: string
          notes?: string | null
          onboarding_checklist?: Json | null
          pay_type?: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          user_id: string
          worker_classification?: string
        }
        Update: {
          certifications?: Json | null
          created_at?: string | null
          email?: string | null
          fixed_job_rate?: number | null
          hired_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          onboarding_checklist?: Json | null
          pay_type?: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          user_id?: string
          worker_classification?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          client_id: string
          converted_invoice_id: string | null
          created_at: string
          estimate_number: string
          id: string
          items: Json
          notes: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          valid_until: string | null
        }
        Insert: {
          client_id: string
          converted_invoice_id?: string | null
          created_at?: string
          estimate_number: string
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          converted_invoice_id?: string | null
          created_at?: string
          estimate_number?: string
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          employee_id: string
          id: string
          notes: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          employee_id: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_date: string | null
          estimate_id: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          items: Json
          job_id: string | null
          notes: string | null
          paid_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          items?: Json
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          items?: Json
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_attachments: {
        Row: {
          bucket: string
          category: string
          created_at: string
          file_path: string
          id: string
          job_id: string
          uploader_id: string
          uploader_role: string
        }
        Insert: {
          bucket: string
          category?: string
          created_at?: string
          file_path: string
          id?: string
          job_id: string
          uploader_id: string
          uploader_role?: string
        }
        Update: {
          bucket?: string
          category?: string
          created_at?: string
          file_path?: string
          id?: string
          job_id?: string
          uploader_id?: string
          uploader_role?: string
        }
        Relationships: []
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
      job_time_logs: {
        Row: {
          action_type: string
          distance_from_site: number | null
          employee_user_id: string
          id: string
          is_verified_location: boolean | null
          job_id: string
          latitude: number | null
          longitude: number | null
          recorded_at: string
        }
        Insert: {
          action_type: string
          distance_from_site?: number | null
          employee_user_id: string
          id?: string
          is_verified_location?: boolean | null
          job_id: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
        }
        Update: {
          action_type?: string
          distance_from_site?: number | null
          employee_user_id?: string
          id?: string
          is_verified_location?: boolean | null
          job_id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_time_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
          tip_amount: number | null
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
          tip_amount?: number | null
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
          tip_amount?: number | null
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
      leads: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          chat_transcript: Json | null
          converted_job_id: string | null
          created_at: string
          email: string | null
          frequency: string | null
          id: string
          location: string | null
          name: string | null
          notes: string | null
          phone: string | null
          score: number
          source: string
          status: string
          urgency: string | null
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          chat_transcript?: Json | null
          converted_job_id?: string | null
          created_at?: string
          email?: string | null
          frequency?: string | null
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string
          status?: string
          urgency?: string | null
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          chat_transcript?: Json | null
          converted_job_id?: string | null
          created_at?: string
          email?: string | null
          frequency?: string | null
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string
          status?: string
          urgency?: string | null
        }
        Relationships: []
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
      loyalty_milestones: {
        Row: {
          id: string
          job_id: string | null
          member_id: string
          milestone_type: string
          notes: string | null
          redeemed: boolean
          triggered_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          member_id: string
          milestone_type: string
          notes?: string | null
          redeemed?: boolean
          triggered_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          member_id?: string
          milestone_type?: string
          notes?: string | null
          redeemed?: boolean
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_milestones_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "perks_members"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          benefits: Json
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          benefits?: Json
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          benefits?: Json
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_records: {
        Row: {
          approved_expenses: number
          base_pay: number
          created_at: string
          employee_id: string
          hourly_rate: number
          hours_worked: number
          id: string
          paid_at: string | null
          paid_by: string
          pay_type: string
          tips: number
          total_payout: number
          week_end: string
          week_start: string
        }
        Insert: {
          approved_expenses?: number
          base_pay?: number
          created_at?: string
          employee_id: string
          hourly_rate?: number
          hours_worked?: number
          id?: string
          paid_at?: string | null
          paid_by: string
          pay_type?: string
          tips?: number
          total_payout?: number
          week_end: string
          week_start: string
        }
        Update: {
          approved_expenses?: number
          base_pay?: number
          created_at?: string
          employee_id?: string
          hourly_rate?: number
          hours_worked?: number
          id?: string
          paid_at?: string | null
          paid_by?: string
          pay_type?: string
          tips?: number
          total_payout?: number
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          additions: Json | null
          calculated_amount: number
          created_at: string
          custom_amount: number | null
          deductions: Json | null
          employee_id: string
          hourly_rate: number
          hours_worked: number
          id: string
          net_pay: number
          notes: string | null
          period_end: string
          period_start: string
          status: string
        }
        Insert: {
          additions?: Json | null
          calculated_amount?: number
          created_at?: string
          custom_amount?: number | null
          deductions?: Json | null
          employee_id: string
          hourly_rate?: number
          hours_worked?: number
          id?: string
          net_pay?: number
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
        }
        Update: {
          additions?: Json | null
          calculated_amount?: number
          created_at?: string
          custom_amount?: number | null
          deductions?: Json | null
          employee_id?: string
          hourly_rate?: number
          hours_worked?: number
          id?: string
          net_pay?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      perks_members: {
        Row: {
          cleanings_completed: number
          client_id: string
          discount_percent: number
          flexibility_zone: string | null
          free_cleanings_earned: number
          free_cleanings_used: number
          id: string
          joined_at: string
          notes: string | null
          program_type: string
          referral_code: string | null
          referred_by: string | null
          status: string
        }
        Insert: {
          cleanings_completed?: number
          client_id: string
          discount_percent?: number
          flexibility_zone?: string | null
          free_cleanings_earned?: number
          free_cleanings_used?: number
          id?: string
          joined_at?: string
          notes?: string | null
          program_type?: string
          referral_code?: string | null
          referred_by?: string | null
          status?: string
        }
        Update: {
          cleanings_completed?: number
          client_id?: string
          discount_percent?: number
          flexibility_zone?: string | null
          free_cleanings_earned?: number
          free_cleanings_used?: number
          id?: string
          joined_at?: string
          notes?: string | null
          program_type?: string
          referral_code?: string | null
          referred_by?: string | null
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
          {
            foreignKeyName: "perks_members_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "perks_members"
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          section: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          section: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          section?: string
        }
        Relationships: []
      }
      service_templates: {
        Row: {
          checklist_items: Json
          created_at: string
          default_duration_minutes: number | null
          default_price: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          show_on_portal: boolean
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          checklist_items?: Json
          created_at?: string
          default_duration_minutes?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          show_on_portal?: boolean
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          checklist_items?: Json
          created_at?: string
          default_duration_minutes?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          show_on_portal?: boolean
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      shift_trade_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          requester_job_id: string
          status: string
          target_id: string | null
          target_job_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          requester_job_id: string
          status?: string
          target_id?: string | null
          target_job_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          requester_job_id?: string
          status?: string
          target_id?: string | null
          target_job_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_trade_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_requester_job_id_fkey"
            columns: ["requester_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_job_id_fkey"
            columns: ["target_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      supply_requests: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          quantity: number
          status: string
          supply_item_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          quantity?: number
          status?: string
          supply_item_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          status?: string
          supply_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_supply_item_id_fkey"
            columns: ["supply_item_id"]
            isOneToOne: false
            referencedRelation: "supply_items"
            referencedColumns: ["id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          author_id: string
          created_at: string
          expires_at: string | null
          id: string
          message: string
        }
        Insert: {
          author_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
        }
        Update: {
          author_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      client_owns_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "client" | "finance"
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
      app_role: ["admin", "staff", "client", "finance"],
    },
  },
} as const
