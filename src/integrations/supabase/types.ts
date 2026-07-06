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
      ads_categories: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          icon_url: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          icon_url?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      banner_clicks: {
        Row: {
          banner_id: string
          id: string
          occurred_at: string
          promotion_id: string | null
          user_id: string | null
        }
        Insert: {
          banner_id: string
          id?: string
          occurred_at?: string
          promotion_id?: string | null
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          id?: string
          occurred_at?: string
          promotion_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_clicks_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "promo_banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_clicks_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      banner_impressions: {
        Row: {
          banner_id: string
          id: string
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          banner_id: string
          id?: string
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          id?: string
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_impressions_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "promo_banners"
            referencedColumns: ["id"]
          },
        ]
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
      lobby_banners: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          duration_seconds: number
          id: string
          image_url: string
          link_url: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          image_url: string
          link_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          image_url?: string
          link_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      mail_audit_logs: {
        Row: {
          action: string
          actor: string
          actor_name: string | null
          created_at: string
          id: number
          meta: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor: string
          actor_name?: string | null
          created_at?: string
          id?: number
          meta?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string
          actor_name?: string | null
          created_at?: string
          id?: number
          meta?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      mail_campaigns: {
        Row: {
          body_html: string
          created_at: string
          created_by: string
          created_by_name: string | null
          deleted_at: string | null
          delivered_count: number
          end_time: string | null
          event_kind: Database["public"]["Enums"]["mail_event_kind"] | null
          event_ref: string | null
          failed_count: number
          id: string
          read_count: number
          recipient_filter: Json
          recipient_ids: string[]
          recipient_type: Database["public"]["Enums"]["mail_recipient_type"]
          send_time: string
          status: Database["public"]["Enums"]["mail_campaign_status"]
          subject: string
          template_data: Json
          template_id: string | null
          total_recipients: number
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by: string
          created_by_name?: string | null
          deleted_at?: string | null
          delivered_count?: number
          end_time?: string | null
          event_kind?: Database["public"]["Enums"]["mail_event_kind"] | null
          event_ref?: string | null
          failed_count?: number
          id?: string
          read_count?: number
          recipient_filter?: Json
          recipient_ids?: string[]
          recipient_type: Database["public"]["Enums"]["mail_recipient_type"]
          send_time?: string
          status?: Database["public"]["Enums"]["mail_campaign_status"]
          subject: string
          template_data?: Json
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          deleted_at?: string | null
          delivered_count?: number
          end_time?: string | null
          event_kind?: Database["public"]["Enums"]["mail_event_kind"] | null
          event_ref?: string | null
          failed_count?: number
          id?: string
          read_count?: number
          recipient_filter?: Json
          recipient_ids?: string[]
          recipient_type?: Database["public"]["Enums"]["mail_recipient_type"]
          send_time?: string
          status?: Database["public"]["Enums"]["mail_campaign_status"]
          subject?: string
          template_data?: Json
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_event_rules: {
        Row: {
          active: boolean
          conditions: Json
          created_at: string
          event_kind: Database["public"]["Enums"]["mail_event_kind"]
          id: string
          priority: number
          template_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          conditions?: Json
          created_at?: string
          event_kind: Database["public"]["Enums"]["mail_event_kind"]
          id?: string
          priority?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          conditions?: Json
          created_at?: string
          event_kind?: Database["public"]["Enums"]["mail_event_kind"]
          id?: string
          priority?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_event_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_recipients: {
        Row: {
          body_html: string
          campaign_id: string
          created_at: string
          deleted_at: string | null
          end_time: string | null
          id: string
          read_at: string | null
          status: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          campaign_id: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          campaign_id?: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mail_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_recipients_2026_07: {
        Row: {
          body_html: string
          campaign_id: string
          created_at: string
          deleted_at: string | null
          end_time: string | null
          id: string
          read_at: string | null
          status: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          campaign_id: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          campaign_id?: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_recipients_2026_08: {
        Row: {
          body_html: string
          campaign_id: string
          created_at: string
          deleted_at: string | null
          end_time: string | null
          id: string
          read_at: string | null
          status: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          campaign_id: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          campaign_id?: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_recipients_2026_09: {
        Row: {
          body_html: string
          campaign_id: string
          created_at: string
          deleted_at: string | null
          end_time: string | null
          id: string
          read_at: string | null
          status: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          campaign_id: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          campaign_id?: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["mail_delivery_status"]
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_templates: {
        Row: {
          active: boolean
          body_html: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          body_html: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          body_html?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json
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
      promo_banners: {
        Row: {
          active: boolean
          category_id: string | null
          content_html: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          link_action: string | null
          name: string
          promotion_id: string | null
          redirect_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          content_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          link_action?: string | null
          name: string
          promotion_id?: string | null
          redirect_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          content_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          link_action?: string | null
          name?: string
          promotion_id?: string | null
          redirect_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ads_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_banners_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_conversions: {
        Row: {
          deposit_amount: number
          id: string
          occurred_at: string
          promotion_id: string
          user_id: string
        }
        Insert: {
          deposit_amount?: number
          id?: string
          occurred_at?: string
          promotion_id: string
          user_id: string
        }
        Update: {
          deposit_amount?: number
          id?: string
          occurred_at?: string
          promotion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_conversions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          bonus_config: Json
          created_at: string
          created_by: string | null
          end_date: string | null
          game_contribution: Json
          id: string
          link_action: string
          name: string
          promo_type: string
          redirect_url: string | null
          start_date: string | null
          status: string
          targeting: Json
          updated_at: string
          wagering_config: Json
        }
        Insert: {
          bonus_config?: Json
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          game_contribution?: Json
          id?: string
          link_action?: string
          name: string
          promo_type: string
          redirect_url?: string | null
          start_date?: string | null
          status?: string
          targeting?: Json
          updated_at?: string
          wagering_config?: Json
        }
        Update: {
          bonus_config?: Json
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          game_contribution?: Json
          id?: string
          link_action?: string
          name?: string
          promo_type?: string
          redirect_url?: string | null
          start_date?: string | null
          status?: string
          targeting?: Json
          updated_at?: string
          wagering_config?: Json
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
      mail_create_campaign: {
        Args: {
          _body_html: string
          _end_time: string
          _recipient_ids: string[]
          _recipient_type: Database["public"]["Enums"]["mail_recipient_type"]
          _send_time: string
          _subject: string
          _template_data: Json
          _template_id: string
        }
        Returns: string
      }
      mail_enqueue_event: {
        Args: {
          _kind: Database["public"]["Enums"]["mail_event_kind"]
          _ref: string
          _user_id: string
          _vars: Json
        }
        Returns: undefined
      }
      mail_ensure_partition: { Args: { _month: string }; Returns: undefined }
      mail_expire_due: { Args: never; Returns: number }
      mail_mark_read: { Args: { _recipient_id: string }; Returns: undefined }
      mail_soft_delete_campaign: { Args: { _id: string }; Returns: undefined }
      mail_worker_delete: { Args: { _msg_id: number }; Returns: boolean }
      mail_worker_dispatch: { Args: { _campaign_id: string }; Returns: number }
      mail_worker_read_batch: {
        Args: { _qty: number; _vt: number }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "message_record"
          isOneToOne: false
          isSetofReturn: true
        }
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
      mail_campaign_status:
        | "draft"
        | "scheduled"
        | "dispatching"
        | "sent"
        | "expired"
        | "cancelled"
        | "failed"
      mail_delivery_status:
        | "pending"
        | "delivered"
        | "failed"
        | "expired"
        | "deleted"
      mail_event_kind:
        | "user_registered"
        | "deposit_approved"
        | "withdrawal_approved"
        | "withdrawal_rejected"
      mail_recipient_type: "all_users" | "single_user" | "bulk_users" | "event"
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
      mail_campaign_status: [
        "draft",
        "scheduled",
        "dispatching",
        "sent",
        "expired",
        "cancelled",
        "failed",
      ],
      mail_delivery_status: [
        "pending",
        "delivered",
        "failed",
        "expired",
        "deleted",
      ],
      mail_event_kind: [
        "user_registered",
        "deposit_approved",
        "withdrawal_approved",
        "withdrawal_rejected",
      ],
      mail_recipient_type: ["all_users", "single_user", "bulk_users", "event"],
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
