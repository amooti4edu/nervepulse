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
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          person_id: string
          read: boolean
          signal_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          person_id: string
          read?: boolean
          signal_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          person_id?: string
          read?: boolean
          signal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          person_id: string
          primary_space_id: string | null
          role: Database["public"]["Enums"]["org_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          person_id: string
          primary_space_id?: string | null
          role?: Database["public"]["Enums"]["org_role"]
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          person_id?: string
          primary_space_id?: string | null
          role?: Database["public"]["Enums"]["org_role"]
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_primary_space_id_fkey"
            columns: ["primary_space_id"]
            isOneToOne: false
            referencedRelation: "space_health"
            referencedColumns: ["space_id"]
          },
          {
            foreignKeyName: "org_memberships_primary_space_id_fkey"
            columns: ["primary_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      role_expectations: {
        Row: {
          active: boolean
          cadence: string
          created_at: string
          day_of_week: number | null
          id: string
          label: string
          org_membership_id: string
          signal_type: string | null
          time_of_day: string | null
        }
        Insert: {
          active?: boolean
          cadence: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          label: string
          org_membership_id: string
          signal_type?: string | null
          time_of_day?: string | null
        }
        Update: {
          active?: boolean
          cadence?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          label?: string
          org_membership_id?: string
          signal_type?: string | null
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_expectations_org_membership_id_fkey"
            columns: ["org_membership_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          signal_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          signal_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          signal_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_attachments_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          signal_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          signal_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_comments_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_forwards: {
        Row: {
          created_at: string
          forwarded_by: string
          forwarded_to_person: string | null
          forwarded_to_space: string | null
          id: string
          note: string | null
          signal_id: string
        }
        Insert: {
          created_at?: string
          forwarded_by: string
          forwarded_to_person?: string | null
          forwarded_to_space?: string | null
          id?: string
          note?: string | null
          signal_id: string
        }
        Update: {
          created_at?: string
          forwarded_by?: string
          forwarded_to_person?: string | null
          forwarded_to_space?: string | null
          id?: string
          note?: string | null
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_forwards_forwarded_by_fkey"
            columns: ["forwarded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_forwards_forwarded_to_person_fkey"
            columns: ["forwarded_to_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_forwards_forwarded_to_space_fkey"
            columns: ["forwarded_to_space"]
            isOneToOne: false
            referencedRelation: "space_health"
            referencedColumns: ["space_id"]
          },
          {
            foreignKeyName: "signal_forwards_forwarded_to_space_fkey"
            columns: ["forwarded_to_space"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_forwards_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_participants: {
        Row: {
          added_at: string
          id: string
          person_id: string | null
          role: string
          signal_id: string
          space_id: string | null
        }
        Insert: {
          added_at?: string
          id?: string
          person_id?: string | null
          role?: string
          signal_id: string
          space_id?: string | null
        }
        Update: {
          added_at?: string
          id?: string
          person_id?: string | null
          role?: string
          signal_id?: string
          space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_participants_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_participants_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "space_health"
            referencedColumns: ["space_id"]
          },
          {
            foreignKeyName: "signal_participants_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_relationships: {
        Row: {
          created_at: string
          from_signal_id: string
          id: string
          kind: Database["public"]["Enums"]["relationship_kind"]
          to_signal_id: string
        }
        Insert: {
          created_at?: string
          from_signal_id: string
          id?: string
          kind: Database["public"]["Enums"]["relationship_kind"]
          to_signal_id: string
        }
        Update: {
          created_at?: string
          from_signal_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["relationship_kind"]
          to_signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_relationships_from_signal_id_fkey"
            columns: ["from_signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_relationships_to_signal_id_fkey"
            columns: ["to_signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          ai_confirmed: boolean
          ai_suggested: Json | null
          body: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          owner_id: string | null
          owner_space_id: string | null
          priority: Database["public"]["Enums"]["signal_priority"]
          resolved_at: string | null
          space_id: string
          status: Database["public"]["Enums"]["signal_status"]
          title: string
          type: Database["public"]["Enums"]["signal_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["signal_visibility"]
        }
        Insert: {
          ai_confirmed?: boolean
          ai_suggested?: Json | null
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          owner_id?: string | null
          owner_space_id?: string | null
          priority?: Database["public"]["Enums"]["signal_priority"]
          resolved_at?: string | null
          space_id: string
          status?: Database["public"]["Enums"]["signal_status"]
          title: string
          type: Database["public"]["Enums"]["signal_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["signal_visibility"]
        }
        Update: {
          ai_confirmed?: boolean
          ai_suggested?: Json | null
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          owner_id?: string | null
          owner_space_id?: string | null
          priority?: Database["public"]["Enums"]["signal_priority"]
          resolved_at?: string | null
          space_id?: string
          status?: Database["public"]["Enums"]["signal_status"]
          title?: string
          type?: Database["public"]["Enums"]["signal_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["signal_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "signals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_owner_space_id_fkey"
            columns: ["owner_space_id"]
            isOneToOne: false
            referencedRelation: "space_health"
            referencedColumns: ["space_id"]
          },
          {
            foreignKeyName: "signals_owner_space_id_fkey"
            columns: ["owner_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "space_health"
            referencedColumns: ["space_id"]
          },
          {
            foreignKeyName: "signals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["space_kind"]
          name: string
          organization_id: string
          parent_space_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["space_kind"]
          name: string
          organization_id: string
          parent_space_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["space_kind"]
          name?: string
          organization_id?: string
          parent_space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_parent_space_id_fkey"
            columns: ["parent_space_id"]
            isOneToOne: false
            referencedRelation: "space_health"
            referencedColumns: ["space_id"]
          },
          {
            foreignKeyName: "spaces_parent_space_id_fkey"
            columns: ["parent_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mentionable_entities: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          label: string | null
          organization_id: string | null
          space_kind: Database["public"]["Enums"]["space_kind"] | null
        }
        Relationships: []
      }
      org_pulse_counts: {
        Row: {
          critical_open: number | null
          organization_id: string | null
          pending_requests: number | null
          recent_updates: number | null
          recently_completed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      space_health: {
        Row: {
          attention_count: number | null
          kind: Database["public"]["Enums"]["space_kind"] | null
          name: string | null
          open_count: number | null
          organization_id: string | null
          space_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_organization: { Args: { org_name: string }; Returns: string }
      has_elevated_role: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      signal_org: { Args: { _signal_id: string }; Returns: string }
    }
    Enums: {
      org_role: "owner" | "admin" | "manager" | "employee"
      relationship_kind:
        | "caused_by"
        | "responds_to"
        | "assigned_from"
        | "resolves"
        | "follows"
        | "related_to"
      signal_priority: "low" | "medium" | "high" | "critical"
      signal_status:
        | "open"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "closed"
      signal_type:
        | "issue"
        | "update"
        | "request"
        | "task"
        | "announcement"
        | "decision"
        | "question"
        | "event"
      signal_visibility:
        | "space"
        | "department_and_up"
        | "org_wide"
        | "restricted"
      space_kind: "company" | "division" | "department" | "branch" | "office"
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
    Enums: {
      org_role: ["owner", "admin", "manager", "employee"],
      relationship_kind: [
        "caused_by",
        "responds_to",
        "assigned_from",
        "resolves",
        "follows",
        "related_to",
      ],
      signal_priority: ["low", "medium", "high", "critical"],
      signal_status: [
        "open",
        "acknowledged",
        "in_progress",
        "resolved",
        "closed",
      ],
      signal_type: [
        "issue",
        "update",
        "request",
        "task",
        "announcement",
        "decision",
        "question",
        "event",
      ],
      signal_visibility: [
        "space",
        "department_and_up",
        "org_wide",
        "restricted",
      ],
      space_kind: ["company", "division", "department", "branch", "office"],
    },
  },
} as const
