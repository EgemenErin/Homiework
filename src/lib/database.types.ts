export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_color: "ink" | "red" | "green" | "plum" | "ochre" | "teal";
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          topics: string[];
          study_pace: string | null;
          availability: string | null;
          background: string;
          referral_source: string | null;
          survey_completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_color?: "ink" | "red" | "green" | "plum" | "ochre" | "teal";
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          topics?: string[];
          study_pace?: string | null;
          availability?: string | null;
          background?: string;
          referral_source?: string | null;
          survey_completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_color?: "ink" | "red" | "green" | "plum" | "ochre" | "teal";
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          topics?: string[];
          study_pace?: string | null;
          availability?: string | null;
          background?: string;
          referral_source?: string | null;
          survey_completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_name: string;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_name?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_name?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_contacts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_otp_codes: {
        Row: {
          target: string;
          channel: "sms" | "email";
          code: string;
          message: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          target: string;
          channel: "sms" | "email";
          code: string;
          message: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          target?: string;
          channel?: "sms" | "email";
          code?: string;
          message?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          meet_weekday: number;
          meet_time: string;
          timezone: string;
          created_by: string | null;
          created_at: string;
          plan_tier: "free" | "club_pass";
          paper_theme: "classic" | "blueprint" | "manila" | "exam_blue";
          stamp_style:
            | "classic_due"
            | "library_dater"
            | "wax_seal"
            | "classified"
            | "dept_approved";
          stamp_motto: string;
          active_pack_id: string | null;
          active_pack_week: number;
          unlocked_packs: string[];
          discord_webhook_url: string | null;
          pot_enabled: boolean;
          pot_stake_text: string;
          university_name: string | null;
          is_campus_public: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          meet_weekday?: number;
          meet_time?: string;
          timezone?: string;
          created_by?: string | null;
          created_at?: string;
          plan_tier?: "free" | "club_pass";
          paper_theme?: "classic" | "blueprint" | "manila" | "exam_blue";
          stamp_style?:
            | "classic_due"
            | "library_dater"
            | "wax_seal"
            | "classified"
            | "dept_approved";
          stamp_motto?: string;
          active_pack_id?: string | null;
          active_pack_week?: number;
          unlocked_packs?: string[];
          discord_webhook_url?: string | null;
          pot_enabled?: boolean;
          pot_stake_text?: string;
          university_name?: string | null;
          is_campus_public?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          meet_weekday?: number;
          meet_time?: string;
          timezone?: string;
          created_by?: string | null;
          created_at?: string;
          plan_tier?: "free" | "club_pass";
          paper_theme?: "classic" | "blueprint" | "manila" | "exam_blue";
          stamp_style?:
            | "classic_due"
            | "library_dater"
            | "wax_seal"
            | "classified"
            | "dept_approved";
          stamp_motto?: string;
          active_pack_id?: string | null;
          active_pack_week?: number;
          unlocked_packs?: string[];
          discord_webhook_url?: string | null;
          pot_enabled?: boolean;
          pot_stake_text?: string;
          university_name?: string | null;
          is_campus_public?: boolean;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: "owner" | "member";
          rotation_position: number;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: "owner" | "member";
          rotation_position: number;
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          rotation_position?: number;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rounds: {
        Row: {
          id: string;
          group_id: string;
          number: number;
          host_id: string | null;
          status: "awaiting_topic" | "assigned" | "closed";
          topic_title: string | null;
          why: string | null;
          meetup_at: string | null;
          meetup_place: string | null;
          published_at: string | null;
          closed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          number: number;
          host_id?: string | null;
          status?: "awaiting_topic" | "assigned" | "closed";
          topic_title?: string | null;
          why?: string | null;
          meetup_at?: string | null;
          meetup_place?: string | null;
          published_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          number?: number;
          host_id?: string | null;
          status?: "awaiting_topic" | "assigned" | "closed";
          topic_title?: string | null;
          why?: string | null;
          meetup_at?: string | null;
          meetup_place?: string | null;
          published_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rounds_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rounds_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          round_id: string;
          url: string;
          label: string;
          kind: "read" | "watch" | "listen" | "other";
          minutes: number | null;
          sort: number;
        };
        Insert: {
          id?: string;
          round_id: string;
          url: string;
          label: string;
          kind?: "read" | "watch" | "listen" | "other";
          minutes?: number | null;
          sort?: number;
        };
        Update: {
          id?: string;
          round_id?: string;
          url?: string;
          label?: string;
          kind?: "read" | "watch" | "listen" | "other";
          minutes?: number | null;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "resources_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      rsvps: {
        Row: {
          round_id: string;
          user_id: string;
          status: "going" | "maybe" | "out";
          updated_at: string;
        };
        Insert: {
          round_id: string;
          user_id: string;
          status: "going" | "maybe" | "out";
          updated_at?: string;
        };
        Update: {
          round_id?: string;
          user_id?: string;
          status?: "going" | "maybe" | "out";
          updated_at?: string;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          round_id: string;
          user_id: string;
          done_at: string;
        };
        Insert: {
          round_id: string;
          user_id: string;
          done_at?: string;
        };
        Update: {
          round_id?: string;
          user_id?: string;
          done_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          round_id: string;
          user_id: string;
          attended: boolean;
        };
        Insert: {
          round_id: string;
          user_id: string;
          attended: boolean;
        };
        Update: {
          round_id?: string;
          user_id?: string;
          attended?: boolean;
        };
        Relationships: [];
      };
      suggestions: {
        Row: {
          id: string;
          group_id: string;
          author_id: string | null;
          title: string;
          pitch: string | null;
          used_in_round: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          author_id?: string | null;
          title: string;
          pitch?: string | null;
          used_in_round?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          author_id?: string | null;
          title?: string;
          pitch?: string | null;
          used_in_round?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suggestions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      suggestion_votes: {
        Row: {
          suggestion_id: string;
          user_id: string;
        };
        Insert: {
          suggestion_id: string;
          user_id: string;
        };
        Update: {
          suggestion_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suggestion_votes_suggestion_id_fkey";
            columns: ["suggestion_id"];
            isOneToOne: false;
            referencedRelation: "suggestions";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications_sent: {
        Row: {
          round_id: string;
          kind: string;
          user_id: string;
          sent_at: string;
        };
        Insert: {
          round_id: string;
          kind: string;
          user_id: string;
          sent_at?: string;
        };
        Update: {
          round_id?: string;
          kind?: string;
          user_id?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      round_notes: {
        Row: {
          round_id: string;
          user_id: string;
          pre_study_note: string;
          post_meetup_note: string;
          updated_at: string;
        };
        Insert: {
          round_id: string;
          user_id: string;
          pre_study_note?: string;
          post_meetup_note?: string;
          updated_at?: string;
        };
        Update: {
          round_id?: string;
          user_id?: string;
          pre_study_note?: string;
          post_meetup_note?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      round_questions: {
        Row: {
          id: string;
          round_id: string;
          prompt: string;
          options: string[];
          correct_index: number;
          sort: number;
        };
        Insert: {
          id?: string;
          round_id: string;
          prompt: string;
          options: string[];
          correct_index: number;
          sort?: number;
        };
        Update: {
          id?: string;
          round_id?: string;
          prompt?: string;
          options?: string[];
          correct_index?: number;
          sort?: number;
        };
        Relationships: [];
      };
      round_exam_submissions: {
        Row: {
          round_id: string;
          user_id: string;
          answers: number[];
          score: number;
          total: number;
          submitted_at: string;
        };
        Insert: {
          round_id: string;
          user_id: string;
          answers: number[];
          score: number;
          total: number;
          submitted_at?: string;
        };
        Update: {
          round_id?: string;
          user_id?: string;
          answers?: number[];
          score?: number;
          total?: number;
          submitted_at?: string;
        };
        Relationships: [];
      };
      pot_entries: {
        Row: {
          id: string;
          group_id: string;
          round_id: string | null;
          user_id: string;
          reason: string;
          settled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          round_id?: string | null;
          user_id: string;
          reason?: string;
          settled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          round_id?: string | null;
          user_id?: string;
          reason?: string;
          settled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_member: { Args: { p_group: string }; Returns: boolean };
      is_owner: { Args: { p_group: string }; Returns: boolean };
      round_group: { Args: { p_round: string }; Returns: string };
      round_is_open: { Args: { p_round: string }; Returns: boolean };
      shares_group: { Args: { p_user: string }; Returns: boolean };
      create_group: {
        Args: {
          p_name: string;
          p_weekday: number;
          p_time: string;
          p_timezone: string;
        };
        Returns: string;
      };
      invite_preview: {
        Args: { p_code: string };
        Returns: {
          group_id: string;
          name: string;
          member_count: number;
          already_member: boolean;
        }[];
      };
      join_group: { Args: { p_code: string }; Returns: string };
      publish_topic: {
        Args: {
          p_round: string;
          p_title: string;
          p_why?: string;
          p_meetup_at: string;
          p_place?: string;
          p_resources?: Json;
          p_suggestion?: string;
        };
        Returns: undefined;
      };
      pass_turn: { Args: { p_round: string }; Returns: string };
      close_round: {
        Args: { p_round: string; p_attended: string[] };
        Returns: string;
      };
      auto_close_stale_rounds: { Args: Record<string, never>; Returns: number };
      reorder_rotation: {
        Args: { p_group: string; p_order: string[] };
        Returns: undefined;
      };
      regenerate_invite: { Args: { p_group: string }; Returns: string };
      leave_group: { Args: { p_group: string }; Returns: undefined };
      find_groups_by_contacts: {
        Args: { p_emails?: string[]; p_phones?: string[] };
        Returns: {
          group_id: string;
          group_name: string;
          invite_code: string;
          meet_weekday: number;
          meet_time: string;
          timezone: string;
          member_count: number;
          matched_friends: string[];
          already_member: boolean;
        }[];
      };
      find_campus_groups: {
        Args: { p_query?: string };
        Returns: {
          group_id: string;
          group_name: string;
          university_name: string;
          invite_code: string;
          meet_weekday: number;
          meet_time: string;
          timezone: string;
          member_count: number;
          already_member: boolean;
        }[];
      };
      member_stats: {
        Args: { p_group: string };
        Returns: {
          user_id: string;
          streak: number;
          attended: number;
          held: number;
          checkins: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
