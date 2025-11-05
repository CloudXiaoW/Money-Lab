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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          asset: string | null
          audio_duration_ms: number | null
          audio_url: string | null
          bookmark_note: string | null
          bookmark_tags: string[] | null
          content: string
          conversation_id: string
          deleted_at: string | null
          id: string
          is_bookmarked: boolean | null
          message_type: string
          role: string
          sources: Json | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          asset?: string | null
          audio_duration_ms?: number | null
          audio_url?: string | null
          bookmark_note?: string | null
          bookmark_tags?: string[] | null
          content: string
          conversation_id: string
          deleted_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          message_type?: string
          role: string
          sources?: Json | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          asset?: string | null
          audio_duration_ms?: number | null
          audio_url?: string | null
          bookmark_note?: string | null
          bookmark_tags?: string[] | null
          content?: string
          conversation_id?: string
          deleted_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          message_type?: string
          role?: string
          sources?: Json | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_quiz_completions: {
        Row: {
          bonus_points_awarded: number
          completed_at: string
          id: string
          questions_data: Json
          quiz_date: string
          score: number
          user_id: string
        }
        Insert: {
          bonus_points_awarded?: number
          completed_at?: string
          id?: string
          questions_data: Json
          quiz_date?: string
          score: number
          user_id: string
        }
        Update: {
          bonus_points_awarded?: number
          completed_at?: string
          id?: string
          questions_data?: Json
          quiz_date?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      expert_consultations: {
        Row: {
          answer: string
          created_at: string
          expert_role: string
          id: string
          question: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          expert_role: string
          id?: string
          question: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          expert_role?: string
          id?: string
          question?: string
          sources?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      learning_content: {
        Row: {
          asset: string | null
          content_type: string
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          thumbnail_url: string | null
          title: string
          url: string
        }
        Insert: {
          asset?: string | null
          content_type: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          url: string
        }
        Update: {
          asset?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      market_alerts: {
        Row: {
          asset: string
          created_at: string
          dismissed: boolean
          headline: string
          id: string
          severity: string
          snippet: string
          url: string
          user_id: string
        }
        Insert: {
          asset: string
          created_at?: string
          dismissed?: boolean
          headline: string
          id?: string
          severity: string
          snippet: string
          url: string
          user_id: string
        }
        Update: {
          asset?: string
          created_at?: string
          dismissed?: boolean
          headline?: string
          id?: string
          severity?: string
          snippet?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_analyses: {
        Row: {
          assets: Json
          created_at: string
          diversity_score: number
          id: string
          recommendations: string
          risk_level: string
          strengths: string
          user_id: string
          weaknesses: string
        }
        Insert: {
          assets: Json
          created_at?: string
          diversity_score: number
          id?: string
          recommendations: string
          risk_level: string
          strengths: string
          user_id: string
          weaknesses: string
        }
        Update: {
          assets?: Json
          created_at?: string
          diversity_score?: number
          id?: string
          recommendations?: string
          risk_level?: string
          strengths?: string
          user_id?: string
          weaknesses?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          asset: string
          closing_price: number | null
          created_at: string
          id: string
          points_earned: number | null
          prediction: string
          prediction_date: string
          result: string | null
          user_id: string
        }
        Insert: {
          asset: string
          closing_price?: number | null
          created_at?: string
          id?: string
          points_earned?: number | null
          prediction: string
          prediction_date?: string
          result?: string | null
          user_id: string
        }
        Update: {
          asset?: string
          closing_price?: number | null
          created_at?: string
          id?: string
          points_earned?: number | null
          prediction?: string
          prediction_date?: string
          result?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          assets: string[] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          currency_preference: string | null
          display_name: string
          email_notifications: boolean | null
          experience_level: string | null
          id: string
          investment_goals: string[] | null
          language: string | null
          public_profile: boolean | null
          risk_profile: string | null
          show_real_name: boolean | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          assets?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          currency_preference?: string | null
          display_name?: string
          email_notifications?: boolean | null
          experience_level?: string | null
          id?: string
          investment_goals?: string[] | null
          language?: string | null
          public_profile?: boolean | null
          risk_profile?: string | null
          show_real_name?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          assets?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          currency_preference?: string | null
          display_name?: string
          email_notifications?: boolean | null
          experience_level?: string | null
          id?: string
          investment_goals?: string[] | null
          language?: string | null
          public_profile?: boolean | null
          risk_profile?: string | null
          show_real_name?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_responses: {
        Row: {
          answer: string
          asset: string | null
          created_at: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          asset?: string | null
          created_at?: string
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          asset?: string | null
          created_at?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      social_predictions: {
        Row: {
          asset: string
          avg_target: number
          bearish_percent: number
          bullish_percent: number
          fetched_at: string
          id: string
          is_mock: boolean | null
          sample_size: number
          sources: Json | null
        }
        Insert: {
          asset: string
          avg_target: number
          bearish_percent: number
          bullish_percent: number
          fetched_at?: string
          id?: string
          is_mock?: boolean | null
          sample_size?: number
          sources?: Json | null
        }
        Update: {
          asset?: string
          avg_target?: number
          bearish_percent?: number
          bullish_percent?: number
          fetched_at?: string
          id?: string
          is_mock?: boolean | null
          sample_size?: number
          sources?: Json | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          service_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          service_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          service_name?: string
          updated_at?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_stats: {
        Row: {
          badges: string[] | null
          created_at: string
          current_streak: number
          id: string
          last_prediction_date: string | null
          last_quiz_date: string | null
          longest_streak: number
          points: number
          quiz_streak: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[] | null
          created_at?: string
          current_streak?: number
          id?: string
          last_prediction_date?: string | null
          last_quiz_date?: string | null
          longest_streak?: number
          points?: number
          quiz_streak?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[] | null
          created_at?: string
          current_streak?: number
          id?: string
          last_prediction_date?: string | null
          last_quiz_date?: string | null
          longest_streak?: number
          points?: number
          quiz_streak?: number | null
          updated_at?: string
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
