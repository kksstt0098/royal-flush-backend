import { useState, type ReactNode } from "react";
import { useT, type Lang, dict } from "@/lib/i18n";
import {
  Bell,
  FileText,
  CreditCard,
  Wallet,
  Globe,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  User,
  LayoutDashboard,
  Users,
  BarChart3,
  Banknote,
  CreditCard as RechargeIcon,
} from "lucide-react";

const tabs = ["home", "withdrawalOrder", "withdrawalPayment", "playerQuery", "reviewWithdrawal"] as const;

type NavItem = { key: keyof typeof dict; active?: boolean };
type NavGroup = {
  key: string;
  label: keyof typeof dict;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

const groups: NavGroup[] = [
  { key: "overview", label: "dataOverview", icon: LayoutDashboard },
  {
    key: "player",
    label: "player",
    icon: Users,
    children: [
      { key: "playerQuery", active: true },
      { key: "onlinePlayers" },
      { key: "gameRecords" },
      { key: "entryExitRecords" },
      { key: "accountLogs" },
      { key: "activeUserSearch" },
      { key: "playerGameStats" },
      { key: "playerLoginLog" },
    ],
  },
  { key: "stats", label: "dataStatistics", icon: BarChart3, children: [] },
  {
    key: "cash",
    label: "cash",
    icon: Banknote,
    children: [
      { key: "withdrawalOrder" },
      { key: "reviewWithdrawal" },
      { key: "withdrawalPayment" },
      { key: "withdrawalReissue" },
      { key: "tmsConfig" },
    ],
  },
  { key: "recharge", label: "recharge", icon: RechargeIcon, children: [] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useT();
  const [open, setOpen] = useState<Record<string, boolean>>({ player: true });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="min-h-screen flex bg-background text-foreground text-sm">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[oklch(0.25_0.03_260)] text-white/90 flex flex-col">
        <div className="h-11 flex items-center px-4 text-[13px] font-medium border-b border-white/10">
          Casino Admin
        </div>
        <nav className="flex-1 overflow-y-auto py-2 text-[13px]">
          {groups.map((g) => {
            const Icon = g.icon;
            const hasChildren = !!g.children;
            const isOpen = open[g.key];
            return (
              <div key={g.key}>
                <button
                  onClick={() => hasChildren && toggle(g.key)}
                  className="w-full flex items-center gap-2 px-4 h-9 hover:bg-white/5 text-white/80"
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{t(g.label)}</span>
                  {hasChildren && (
                    <ChevronRight
                      className={
                        "w-3.5 h-3.5 transition-transform " + (isOpen ? "rotate-90" : "")
                      }
                    />
                  )}
                </button>
                {hasChildren && isOpen && (
                  <div className="pb-1">
                    {g.children!.length === 0 ? (
                      <div className="pl-11 py-1 text-[12px] text-white/40">—</div>
                    ) : (
                      g.children!.map((c) => (
                        <div
                          key={c.key}
                          className={
                            "pl-11 pr-4 h-8 flex items-center cursor-pointer text-[12.5px] " +
                            (c.active
                              ? "bg-[oklch(0.6_0.18_250)]/15 text-[oklch(0.75_0.18_250)]"
                              : "text-white/70 hover:bg-white/5")
                          }
                        >
                          {t(c.key)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-panel-border bg-panel px-4 h-11">
        <div className="flex items-center gap-4">
          <Menu className="w-4 h-4 text-muted-foreground" />
          <nav className="flex items-center gap-1 text-[13px]">
            <span className="text-foreground/80">{t("home")}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground/80">{t("player")}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-info">{t("playerQuery")}</span>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-foreground/80">
          <span className="text-muted-foreground">Myanmar: 2025-12-28 09:20:06</span>
          <button
            onClick={() => setLang((lang === "en" ? "my" : "en") as Lang)}
            className="flex items-center gap-1 hover:text-info"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === "en" ? "English" : "မြန်မာ"}</span>
          </button>
          <Bell className="w-4 h-4" />
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" /> {t("file")}
          </span>
          <span>online 38</span>
          <span className="flex items-center gap-1">
            <CreditCard className="w-4 h-4" /> {t("pay")}
          </span>
          <span className="flex items-center gap-1 relative">
            <Wallet className="w-4 h-4" /> {t("withdraw")}
            <span className="absolute -top-1.5 -right-3 bg-danger text-danger-foreground text-[10px] rounded-full px-1 min-w-[16px] text-center leading-4">
              19
            </span>
          </span>
          <span className="flex items-center gap-1 pl-3">
            <User className="w-4 h-4 p-0.5 rounded-full bg-muted" />
            Vyy
            <ChevronDown className="w-3 h-3" />
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-panel-border bg-panel px-4 h-9">
        {tabs.map((tab) => {
          const active = tab === "playerQuery";
          return (
            <div
              key={tab}
              className={
                "group flex items-center gap-2 px-3 h-7 text-[12px] rounded-sm border cursor-pointer " +
                (active
                  ? "bg-panel border-info-foreground text-success"
                  : "bg-panel border-transparent hover:border-panel-border text-foreground/80")
              }
            >
              {active && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              <span>{t(tab)}</span>
              <X className="w-3 h-3 text-muted-foreground/70 hover:text-danger" />
            </div>
          );
        })}
      </div>

      <main className="p-3">{children}</main>
      </div>
    </div>
  );
}