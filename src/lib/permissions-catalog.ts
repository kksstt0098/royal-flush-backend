export type AccessLevel = "none" | "view" | "manage";

export type PermissionItem = { key: string; label: string };
export type PermissionGroup = { key: string; label: string; items: PermissionItem[] };

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "overview",
    label: "Data Overview",
    items: [{ key: "dashboard", label: "Dashboard" }],
  },
  {
    key: "player",
    label: "Player",
    items: [
      { key: "player_query", label: "Player Query" },
      { key: "online_players", label: "Online Players" },
      { key: "game_records", label: "Game Records" },
      { key: "entry_exit_records", label: "Entry / Exit Records" },
      { key: "account_logs", label: "Account Logs" },
      { key: "player_login_log", label: "Player Login Log" },
    ],
  },
  {
    key: "cash",
    label: "Cash",
    items: [
      { key: "withdrawal_order", label: "Withdrawal Order" },
      { key: "review_withdrawal", label: "Review Withdrawal" },
      { key: "withdrawal_payment", label: "Withdrawal Payment" },
    ],
  },
  {
    key: "recharge",
    label: "Recharge",
    items: [
      { key: "online_recharge", label: "Online Recharge" },
      { key: "offline_recharge", label: "Offline Recharge" },
      { key: "quick_recharge", label: "Quick Recharge" },
    ],
  },
  {
    key: "ads",
    label: "Ads Banner",
    items: [
      { key: "lobby_banner", label: "Lobby Banner" },
      { key: "promo_banner", label: "Promo Banner" },
      { key: "ads_category", label: "Ads Category" },
      { key: "promotions", label: "Promotions" },
    ],
  },
  {
    key: "ingame_mail",
    label: "Ingame Mail",
    items: [
      { key: "mail_box", label: "Mail Box" },
      { key: "marquee", label: "Marquee" },
      { key: "cs_configure", label: "CS Configure" },
    ],
  },
  {
    key: "level",
    label: "Level Config",
    items: [
      { key: "vip_config", label: "VIP Config" },
      { key: "level_config", label: "Level Config" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { key: "admin_user", label: "Admin User" },
      { key: "role_mgmt", label: "Role" },
      { key: "permission_mgmt", label: "Permission" },
      { key: "admin_logs", label: "Admin Logs" },
      { key: "whitelist", label: "Whitelist" },
      { key: "login_log", label: "Login Log" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

export const ACCESS_ORDER: AccessLevel[] = ["none", "view", "manage"];

export function accessLabel(a: AccessLevel): string {
  return a === "manage" ? "Manage" : a === "view" ? "View only" : "Hidden";
}

export function accessColor(a: AccessLevel): string {
  return a === "manage"
    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
    : a === "view"
      ? "bg-sky-500/15 text-sky-500 border-sky-500/30"
      : "bg-muted text-muted-foreground border-panel-border";
}