// ─────────────────────────────────────────────────────────────────────────────
// Homenz.ia — Tipos TypeScript do banco de dados Supabase
// Gerado a partir do schema em supabase/migrations/
// ─────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "user" | "owner" | "franchisee" | "seller" | "admin";
export type ClinicPlan = "free" | "pro" | "enterprise";
export type FunnelStep =
  | "landing" | "form_started" | "form_done"
  | "chat_started" | "chat_done"
  | "photos_started" | "photos_done"
  | "ai_processing" | "ai_done"
  | "schedule_started" | "scheduled"
  | "confirmed" | "completed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          role: UserRole;
          active: boolean;
          login_method: string | null;
          created_at: string;
          updated_at: string;
          last_signed_in: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at" | "last_signed_in">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      clinics: {
        Row: {
          id: number;
          slug: string;
          name: string;
          owner_user_id: string;
          owner_name: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          city: string | null;
          state: string | null;
          address: string | null;
          zip_code: string | null;
          cnpj: string | null;
          bio: string | null;
          logo_url: string | null;
          cover_url: string | null;
          services: Json;
          working_hours: Json;
          notify_whatsapp: string | null;
          notify_email: string | null;
          google_calendar_id: string | null;
          cal_com_api_key: string | null;
          cal_com_event_type_id: string | null;
          trial_ends_at: string | null;
          plan: ClinicPlan;
          active: boolean;
          current_month_leads: number;
          current_month_ai_analyses: number;
          counters_reset_at: string;
          franchise_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clinics"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clinics"]["Insert"]>;
      };
      clinic_users: {
        Row: {
          id: number;
          clinic_id: number;
          user_id: string;
          role: "owner" | "manager" | "attendant";
          active: boolean;
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["clinic_users"]["Row"], "id" | "invited_at">;
        Update: Partial<Database["public"]["Tables"]["clinic_users"]["Insert"]>;
      };
      leads: {
        Row: {
          id: number;
          clinic_id: number;
          name: string;
          phone: string;
          email: string | null;
          region: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          referrer: string | null;
          gender: "male" | "female" | "other" | null;
          age: number | null;
          hair_problem: string | null;
          hair_loss_type: "frontal" | "vertex" | "total" | "diffuse" | "temporal" | "other" | null;
          hair_loss_time: string | null;
          previous_treatments: string | null;
          expectations: string | null;
          how_did_you_hear: string | null;
          chat_answers: Json | null;
          funnel_step: FunnelStep;
          abandoned_at: string | null;
          last_activity_at: string;
          lead_score: number | null;
          lead_score_breakdown: Json | null;
          priority: "low" | "medium" | "high" | "urgent" | null;
          session_token: string | null;
          last_alert_sent_at: string | null;
          last_alert_temperature: "hot" | "warm" | "cold" | "lost" | null;
          assigned_seller_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      lead_photos: {
        Row: {
          id: number;
          lead_id: number;
          clinic_id: number;
          photo_type: "front" | "top" | "left" | "right" | "back" | "custom";
          photo_url: string;
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lead_photos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["lead_photos"]["Insert"]>;
      };
      ai_results: {
        Row: {
          id: number;
          lead_id: number;
          clinic_id: number;
          diagnosis: string | null;
          severity: "mild" | "moderate" | "severe" | "very_severe" | null;
          norwood_scale: number | null;
          recommended_treatment: string | null;
          estimated_sessions: number | null;
          urgency: "low" | "medium" | "high" | "critical" | null;
          result_image_url: string | null;
          before_after_url: string | null;
          raw_analysis: Json | null;
          ai_model: string | null;
          processing_time_ms: number | null;
          status: "pending" | "processing" | "done" | "failed";
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_results"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ai_results"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: number;
          clinic_id: number;
          lead_id: number;
          scheduled_at: string;
          duration_minutes: number;
          status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
          notes: string | null;
          location: string | null;
          google_event_id: string | null;
          cal_com_booking_id: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          cancelled_by: "clinic" | "lead" | "system" | null;
          confirmed_at: string | null;
          confirmed_by_user_id: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: number;
          clinic_id: number;
          target_type: "clinic" | "lead";
          lead_id: number | null;
          title: string;
          content: string;
          type: string;
          channel: "platform" | "whatsapp" | "email" | "sms";
          template_id: string | null;
          read: boolean;
          delivered: boolean;
          delivered_at: string | null;
          delivery_error: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      clinic_availability: {
        Row: {
          id: number;
          clinic_id: number;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes: number;
          break_between_minutes: number;
          max_concurrent_appointments: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clinic_availability"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clinic_availability"]["Insert"]>;
      };
      lead_events: {
        Row: {
          id: number;
          clinic_id: number;
          lead_id: number;
          event_type: string;
          description: string | null;
          metadata: Json | null;
          triggered_by: "system" | "lead" | "clinic";
          triggered_by_user_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lead_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["lead_events"]["Insert"]>;
      };
      nps_responses: {
        Row: {
          id: number;
          clinic_id: number;
          lead_id: number;
          appointment_id: number | null;
          score: number;
          category: "detractor" | "passive" | "promoter";
          comment: string | null;
          allow_testimonial: boolean;
          sent_at: string;
          responded_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["nps_responses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["nps_responses"]["Insert"]>;
      };
      seller_metrics: {
        Row: {
          id: number;
          clinic_id: number;
          seller_user_id: string;
          metric_date: string;
          leads_received: number;
          leads_contacted: number;
          appointments_set: number;
          appointments_done: number;
          contact_rate: number;
          scheduling_rate: number;
          conversion_rate: number;
          performance_score: number;
          rank_position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["seller_metrics"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["seller_metrics"]["Insert"]>;
      };
      lead_assignments: {
        Row: {
          id: number;
          clinic_id: number;
          lead_id: number;
          seller_user_id: string;
          assigned_by_user_id: string | null;
          status: "active" | "completed" | "transferred";
          first_contact_at: string | null;
          response_time_minutes: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lead_assignments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["lead_assignments"]["Insert"]>;
      };
      access_invites: {
        Row: {
          id: number;
          created_by_user_id: string;
          role: "admin" | "franchisee" | "seller";
          label: string | null;
          token: string;
          max_uses: number;
          use_count: number;
          expires_at: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["access_invites"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["access_invites"]["Insert"]>;
      };
      plan_limits: {
        Row: {
          id: number;
          plan: ClinicPlan;
          leads_per_month: number;
          ai_analyses_per_month: number;
          team_members: number;
          whatsapp_notifications: boolean;
          google_calendar: boolean;
          cal_com_integration: boolean;
          custom_branding: boolean;
          nps_enabled: boolean;
          treatment_history: boolean;
          export_data: boolean;
          api_access: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["plan_limits"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["plan_limits"]["Insert"]>;
      };
    };
    Functions: {
      is_network_admin: { Args: Record<string, never>; Returns: boolean };
      my_clinic_id: { Args: Record<string, never>; Returns: number | null };
    };
  };
}
