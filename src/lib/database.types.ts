export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          bin_id: string | null
          collector_id: string | null
          created_at: string
          id: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          zone_id: string | null
        }
        Insert: {
          bin_id?: string | null
          collector_id?: string | null
          created_at?: string
          id?: string
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          zone_id?: string | null
        }
        Update: {
          bin_id?: string | null
          collector_id?: string | null
          created_at?: string
          id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      bins: {
        Row: {
          created_at: string
          current_fill_level: number
          id: string
          last_updated_at: string
          monitoring_mode: Database["public"]["Enums"]["monitoring_mode"]
          owner_id: string | null
          type: Database["public"]["Enums"]["bin_type"]
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          current_fill_level?: number
          id?: string
          last_updated_at?: string
          monitoring_mode?: Database["public"]["Enums"]["monitoring_mode"]
          owner_id?: string | null
          type: Database["public"]["Enums"]["bin_type"]
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          current_fill_level?: number
          id?: string
          last_updated_at?: string
          monitoring_mode?: Database["public"]["Enums"]["monitoring_mode"]
          owner_id?: string | null
          type?: Database["public"]["Enums"]["bin_type"]
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bins_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bins_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_requests: {
        Row: {
          amount: number | null
          bin_id: string | null
          collector_id: string | null
          created_at: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          request_type: Database["public"]["Enums"]["request_type"]
          requester_id: string | null
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          amount?: number | null
          bin_id?: string | null
          collector_id?: string | null
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          request_type: Database["public"]["Enums"]["request_type"]
          requester_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          amount?: number | null
          bin_id?: string | null
          collector_id?: string | null
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          request_type?: Database["public"]["Enums"]["request_type"]
          requester_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "collection_requests_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_requests_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          collector_id: string
          completed_at: string | null
          id: string
          notes: string | null
          proof_photo_url: string | null
          request_id: string
          status: Database["public"]["Enums"]["collection_status"]
        }
        Insert: {
          collector_id: string
          completed_at?: string | null
          id?: string
          notes?: string | null
          proof_photo_url?: string | null
          request_id: string
          status: Database["public"]["Enums"]["collection_status"]
        }
        Update: {
          collector_id?: string
          completed_at?: string | null
          id?: string
          notes?: string | null
          proof_photo_url?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["collection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "collections_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "collection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_clients: {
        Row: {
          assigned_at: string
          collector_id: string
          household_id: string
          id: string
          relationship_status: Database["public"]["Enums"]["relationship_status"]
        }
        Insert: {
          assigned_at?: string
          collector_id: string
          household_id: string
          id?: string
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
        }
        Update: {
          assigned_at?: string
          collector_id?: string
          household_id?: string
          id?: string
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
        }
        Relationships: [
          {
            foreignKeyName: "collector_clients_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_clients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collectors_profile: {
        Row: {
          active_status: boolean
          business_name: string | null
          id: string
          pricing_one_time: number | null
          pricing_subscription_monthly: number | null
          rating: number | null
          service_area: string | null
        }
        Insert: {
          active_status?: boolean
          business_name?: string | null
          id: string
          pricing_one_time?: number | null
          pricing_subscription_monthly?: number | null
          rating?: number | null
          service_area?: string | null
        }
        Update: {
          active_status?: boolean
          business_name?: string | null
          id?: string
          pricing_one_time?: number | null
          pricing_subscription_monthly?: number | null
          rating?: number | null
          service_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collectors_profile_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fill_reports: {
        Row: {
          bin_id: string
          fill_level: number
          id: string
          reported_at: string
          source: Database["public"]["Enums"]["fill_source"]
        }
        Insert: {
          bin_id: string
          fill_level: number
          id?: string
          reported_at?: string
          source: Database["public"]["Enums"]["fill_source"]
        }
        Update: {
          bin_id?: string
          fill_level?: number
          id?: string
          reported_at?: string
          source?: Database["public"]["Enums"]["fill_source"]
        }
        Relationships: [
          {
            foreignKeyName: "fill_reports_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          fill_threshold_pct: number
          id: number
          updated_at: string
        }
        Insert: {
          fill_threshold_pct?: number
          id?: number
          updated_at?: string
        }
        Update: {
          fill_threshold_pct?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          collector_id: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["txn_method"]
          payer_id: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["txn_status"]
        }
        Insert: {
          amount: number
          collector_id?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["txn_method"]
          payer_id?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
        }
        Update: {
          amount?: number
          collector_id?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["txn_method"]
          payer_id?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "collection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          centroid_lat: number
          centroid_lng: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          centroid_lat: number
          centroid_lng: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          centroid_lat?: number
          centroid_lng?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      severity_for_fill: {
        Args: { pct: number }
        Returns: Database["public"]["Enums"]["alert_severity"]
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high"
      bin_type: "household" | "market" | "public"
      collection_status: "completed" | "missed" | "rescheduled"
      fill_source: "manual_slider" | "photo" | "sensor"
      monitoring_mode: "sensor" | "manual"
      payment_status: "unpaid" | "pending" | "paid" | "refunded"
      payment_type: "one_time" | "subscription"
      relationship_status: "active" | "paused"
      request_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "missed"
      request_type: "manual_call" | "auto_threshold_alert"
      txn_method: "mobile_money" | "card" | "cash_on_pickup"
      txn_status: "pending" | "success" | "failed" | "refunded"
      user_role: "household" | "market_vendor" | "collector" | "admin"
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
      alert_severity: ["low", "medium", "high"],
      bin_type: ["household", "market", "public"],
      collection_status: ["completed", "missed", "rescheduled"],
      fill_source: ["manual_slider", "photo", "sensor"],
      monitoring_mode: ["sensor", "manual"],
      payment_status: ["unpaid", "pending", "paid", "refunded"],
      payment_type: ["one_time", "subscription"],
      relationship_status: ["active", "paused"],
      request_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "missed",
      ],
      request_type: ["manual_call", "auto_threshold_alert"],
      txn_method: ["mobile_money", "card", "cash_on_pickup"],
      txn_status: ["pending", "success", "failed", "refunded"],
      user_role: ["household", "market_vendor", "collector", "admin"],
    },
  },
} as const

