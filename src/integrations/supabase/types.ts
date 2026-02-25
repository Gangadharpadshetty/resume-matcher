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
      jobs: {
        Row: {
          apply_url: string
          company: string
          description: string | null
          experience_level: string | null
          external_id: string | null
          id: string
          is_active: boolean
          location: string | null
          platform: string
          posted_at: string | null
          scraped_at: string
          skills: string[] | null
          title: string
        }
        Insert: {
          apply_url: string
          company: string
          description?: string | null
          experience_level?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          platform: string
          posted_at?: string | null
          scraped_at?: string
          skills?: string[] | null
          title: string
        }
        Update: {
          apply_url?: string
          company?: string
          description?: string | null
          experience_level?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          platform?: string
          posted_at?: string | null
          scraped_at?: string
          skills?: string[] | null
          title?: string
        }
        Relationships: []
      }
      prompt_strategies: {
        Row: {
          avg_reward: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          strategy_config: Json
          times_selected: number
          total_rewards: number
          ucb_score: number
          updated_at: string
        }
        Insert: {
          avg_reward?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          strategy_config?: Json
          times_selected?: number
          total_rewards?: number
          ucb_score?: number
          updated_at?: string
        }
        Update: {
          avg_reward?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          strategy_config?: Json
          times_selected?: number
          total_rewards?: number
          ucb_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      resume_feedback: {
        Row: {
          bullet_quality_score: number
          compilation_success: boolean
          created_at: string
          format_compliance_score: number
          generation_time_ms: number | null
          id: string
          keyword_coverage_score: number
          latex_line_count: number
          matched_keywords: number
          session_id: string
          strategy_id: string | null
          total_keywords: number
          total_reward: number
          user_rating: number | null
        }
        Insert: {
          bullet_quality_score?: number
          compilation_success?: boolean
          created_at?: string
          format_compliance_score?: number
          generation_time_ms?: number | null
          id?: string
          keyword_coverage_score?: number
          latex_line_count?: number
          matched_keywords?: number
          session_id: string
          strategy_id?: string | null
          total_keywords?: number
          total_reward?: number
          user_rating?: number | null
        }
        Update: {
          bullet_quality_score?: number
          compilation_success?: boolean
          created_at?: string
          format_compliance_score?: number
          generation_time_ms?: number | null
          id?: string
          keyword_coverage_score?: number
          latex_line_count?: number
          matched_keywords?: number
          session_id?: string
          strategy_id?: string | null
          total_keywords?: number
          total_reward?: number
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_feedback_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "prompt_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      rl_optimization_log: {
        Row: {
          avg_reward: number
          best_strategy_id: string | null
          epoch: number
          exploration_rate: number
          id: string
          logged_at: string
          total_generations: number
        }
        Insert: {
          avg_reward?: number
          best_strategy_id?: string | null
          epoch: number
          exploration_rate?: number
          id?: string
          logged_at?: string
          total_generations?: number
        }
        Update: {
          avg_reward?: number
          best_strategy_id?: string | null
          epoch?: number
          exploration_rate?: number
          id?: string
          logged_at?: string
          total_generations?: number
        }
        Relationships: [
          {
            foreignKeyName: "rl_optimization_log_best_strategy_id_fkey"
            columns: ["best_strategy_id"]
            isOneToOne: false
            referencedRelation: "prompt_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          id: string
          job_id: string
          saved_at: string
          session_id: string
        }
        Insert: {
          id?: string
          job_id: string
          saved_at?: string
          session_id: string
        }
        Update: {
          id?: string
          job_id?: string
          saved_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
