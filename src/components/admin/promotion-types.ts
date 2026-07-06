export type PromoType = "deposit_bonus" | "cashback" | "vip_reward";
export type PromoStatus = "draft" | "active" | "paused" | "archived";
export type LinkAction = "open_promotion_page" | "apply_bonus_direct" | "redirect_url";

export type BonusConfig = {
  trigger?: "first_deposit" | "second_deposit" | "nth_deposit" | "deposit_amount_based";
  n?: number;
  min_deposit?: number;
  bonus_type?: "percent" | "fixed" | "tiered" | "hybrid";
  percent?: number;
  max_bonus?: number;
  fixed?: number;
  tiers?: Array<{ min: number; max?: number; percent?: number; fixed?: number }>;
};

export type WageringConfig = {
  multiplier?: number;
  base?: "deposit_only" | "bonus_only" | "deposit_plus_bonus";
};

export type GameContribution = {
  allowed_providers?: string[];
  allowed_categories?: string[];
  blocked_games?: string[];
  rates?: Record<string, number>; // e.g. { slots: 100, live: 10, table: 20 }
};

export type Targeting = {
  vip_levels?: number[];
  countries?: string[];
  min_deposit?: number;
  user_scope?: "all" | "new" | "existing";
  login_streak?: number;
};

export type Promotion = {
  id: string;
  name: string;
  promo_type: PromoType;
  status: PromoStatus;
  start_date: string | null;
  end_date: string | null;
  bonus_config: BonusConfig;
  wagering_config: WageringConfig;
  game_contribution: GameContribution;
  targeting: Targeting;
  link_action: LinkAction;
  redirect_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionDraft = Omit<Promotion, "id" | "created_at" | "updated_at">;

export const emptyPromotionDraft: PromotionDraft = {
  name: "",
  promo_type: "deposit_bonus",
  status: "draft",
  start_date: null,
  end_date: null,
  bonus_config: {
    trigger: "first_deposit",
    bonus_type: "percent",
    percent: 100,
    max_bonus: 5000,
  },
  wagering_config: { multiplier: 10, base: "deposit_plus_bonus" },
  game_contribution: {
    allowed_categories: ["slots", "live", "table"],
    allowed_providers: [],
    blocked_games: [],
    rates: { slots: 100, live: 10, table: 20 },
  },
  targeting: { user_scope: "all", min_deposit: 0, vip_levels: [], countries: [], login_streak: 0 },
  link_action: "open_promotion_page",
  redirect_url: null,
};