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
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          actor_name: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_name?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_name?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bets: {
        Row: {
          created_at: string
          game: string
          id: string
          player_id: string
          stake: number
          win_amount: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          player_id: string
          stake: number
          win_amount?: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          player_id?: string
          stake?: number
          win_amount?: number
        }
        Relationships: []
      }
      deposits: {
        Row: {
          account_no: string | null
          actual_amount: number | null
          amount: number
          bank_type: string | null
          bonus_amount: number
          channel: string | null
          channel_code: string | null
          coins: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          credit_type: string | null
          id: string
          notify_time: string | null
          order_no: string
          player_id: string
          remark: string | null
          source_user_id: string | null
          status: string
        }
        Insert: {
          account_no?: string | null
          actual_amount?: number | null
          amount: number
          bank_type?: string | null
          bonus_amount?: number
          channel?: string | null
          channel_code?: string | null
          coins: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          credit_type?: string | null
          id?: string
          notify_time?: string | null
          order_no: string
          player_id: string
          remark?: string | null
          source_user_id?: string | null
          status?: string
        }
        Update: {
          account_no?: string | null
          actual_amount?: number | null
          amount?: number
          bank_type?: string | null
          bonus_amount?: number
          channel?: string | null
          channel_code?: string | null
          coins?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          credit_type?: string | null
          id?: string
          notify_time?: string | null
          order_no?: string
          player_id?: string
          remark?: string | null
          source_user_id?: string | null
          status?: string
        }
        Relationships: []
      }
      mails: {
        Row: {
          body: string
          created_at: string
          id: string
          player_id: string
          read: boolean
          sent_by: string | null
          sent_by_name: string | null
          subject: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          player_id: string
          read?: boolean
          sent_by?: string | null
          sent_by_name?: string | null
          subject?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          player_id?: string
          read?: boolean
          sent_by?: string | null
          sent_by_name?: string | null
          subject?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          addr: string | null
          channel_code: string | null
          created_at: string
          device_type: string | null
          email: string | null
          id: string
          last_login: string | null
          level: string
          login_country: string | null
          login_ip: string | null
          nick: string
          phone: string | null
          register_country: string | null
          register_ip: string | null
          register_mac: string | null
          remark: string | null
          source_channel: string | null
          status: Database["public"]["Enums"]["player_status"]
          superior_id: number | null
          updated_at: string
          vip: number
        }
        Insert: {
          addr?: string | null
          channel_code?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          id: string
          last_login?: string | null
          level?: string
          login_country?: string | null
          login_ip?: string | null
          nick?: string
          phone?: string | null
          register_country?: string | null
          register_ip?: string | null
          register_mac?: string | null
          remark?: string | null
          source_channel?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          superior_id?: number | null
          updated_at?: string
          vip?: number
        }
        Update: {
          addr?: string | null
          channel_code?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          level?: string
          login_country?: string | null
          login_ip?: string | null
          nick?: string
          phone?: string | null
          register_country?: string | null
          register_ip?: string | null
          register_mac?: string | null
          remark?: string | null
          source_channel?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          superior_id?: number | null
          updated_at?: string
          vip?: number
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
      wallets: {
        Row: {
          coins: number
          frozen: number
          gold_in_transfer: number
          last_payed_at: string | null
          remain_bets: number
          safe_coins: number
          today_win: number
          total_bets: number
          total_payed: number
          total_payed_times: number
          total_payout: number
          total_win: number
          total_withdraw_times: number
          total_withdrawal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          frozen?: number
          gold_in_transfer?: number
          last_payed_at?: string | null
          remain_bets?: number
          safe_coins?: number
          today_win?: number
          total_bets?: number
          total_payed?: number
          total_payed_times?: number
          total_payout?: number
          total_win?: number
          total_withdraw_times?: number
          total_withdrawal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          frozen?: number
          gold_in_transfer?: number
          last_payed_at?: string | null
          remain_bets?: number
          safe_coins?: number
          today_win?: number
          total_bets?: number
          total_payed?: number
          total_payed_times?: number
          total_payout?: number
          total_win?: number
          total_withdraw_times?: number
          total_withdrawal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_status_history: {
        Row: {
          actor: string | null
          actor_name: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["withdrawal_status"] | null
          id: string
          remark: string | null
          to_status: Database["public"]["Enums"]["withdrawal_status"]
          withdrawal_id: string
        }
        Insert: {
          actor?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["withdrawal_status"] | null
          id?: string
          remark?: string | null
          to_status: Database["public"]["Enums"]["withdrawal_status"]
          withdrawal_id: string
        }
        Update: {
          actor?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["withdrawal_status"] | null
          id?: string
          remark?: string | null
          to_status?: Database["public"]["Enums"]["withdrawal_status"]
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_status_history_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          account_no: string
          actual_amount: number
          apply_amount: number
          auditor: string | null
          auditor_name: string | null
          channel: string | null
          channel_code: string | null
          created_at: string
          fee: number
          first_withdrawal: boolean
          id: string
          level: string
          lock_flag: Database["public"]["Enums"]["lock_flag"]
          lock_user: string | null
          lock_user_name: string | null
          notify_time: string | null
          order_no: string
          out_trade_no: string | null
          payment_time: string | null
          payout_mode: string
          player_id: string
          remark: string | null
          source_user_id: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transferor: string | null
          transferor_name: string | null
          updated_at: string
        }
        Insert: {
          account_no: string
          actual_amount: number
          apply_amount: number
          auditor?: string | null
          auditor_name?: string | null
          channel?: string | null
          channel_code?: string | null
          created_at?: string
          fee?: number
          first_withdrawal?: boolean
          id?: string
          level?: string
          lock_flag?: Database["public"]["Enums"]["lock_flag"]
          lock_user?: string | null
          lock_user_name?: string | null
          notify_time?: string | null
          order_no: string
          out_trade_no?: string | null
          payment_time?: string | null
          payout_mode: string
          player_id: string
          remark?: string | null
          source_user_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transferor?: string | null
          transferor_name?: string | null
          updated_at?: string
        }
        Update: {
          account_no?: string
          actual_amount?: number
          apply_amount?: number
          auditor?: string | null
          auditor_name?: string | null
          channel?: string | null
          channel_code?: string | null
          created_at?: string
          fee?: number
          first_withdrawal?: boolean
          id?: string
          level?: string
          lock_flag?: Database["public"]["Enums"]["lock_flag"]
          lock_user?: string | null
          lock_user_name?: string | null
          notify_time?: string | null
          order_no?: string
          out_trade_no?: string | null
          payment_time?: string | null
          payout_mode?: string
          player_id?: string
          remark?: string | null
          source_user_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transferor?: string | null
          transferor_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_player: {
        Args: { _amount: number; _player_id: string; _remark: string }
        Returns: string
      }
      admin_credit_player: {
        Args: {
          _amount: number
          _credit_type: string
          _player_id: string
          _remark: string
        }
        Returns: string
      }
      approve_withdrawal: {
        Args: { _id: string; _remark: string }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: boolean }
      create_withdrawal: {
        Args: { _account_no: string; _amount: number; _payout_mode: string }
        Returns: string
      }
      grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      lock_withdrawal: {
        Args: { _id: string; _lock: boolean }
        Returns: undefined
      }
      mark_withdrawal_paid: {
        Args: { _channel: string; _id: string; _out_trade_no: string }
        Returns: undefined
      }
      mock_deposit: { Args: { _amount: number }; Returns: string }
      reject_withdrawal: {
        Args: { _id: string; _remark: string }
        Returns: undefined
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      risk_control_withdrawal: {
        Args: { _id: string; _remark: string }
        Returns: undefined
      }
      send_mail: {
        Args: { _body: string; _player_id: string; _subject: string }
        Returns: string
      }
      staff_display_name: { Args: { _uid: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "auditor" | "payer" | "player"
      lock_flag: "locked" | "unlocked"
      player_status: "active" | "disabled"
      withdrawal_status:
        | "Pending"
        | "Audited"
        | "Reject"
        | "Freeze"
        | "Paying Out"
        | "Failed"
        | "Successful"
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
      app_role: ["admin", "auditor", "payer", "player"],
      lock_flag: ["locked", "unlocked"],
      player_status: ["active", "disabled"],
      withdrawal_status: [
        "Pending",
        "Audited",
        "Reject",
        "Freeze",
        "Paying Out",
        "Failed",
        "Successful",
      ],
    },
  },
} as const
