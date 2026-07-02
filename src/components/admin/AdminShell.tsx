import type { ReactNode } from "react";
import { useT, type Lang } from "@/lib/i18n";
import {
  Bell,
  FileText,
  CreditCard,
  Wallet,
  Globe,
  ChevronDown,
  Menu,
  X,
  User,
} from "lucide-react";

const tabs = ["home", "withdrawalOrder", "withdrawalPayment", "playerQuery", "reviewWithdrawal"] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useT();

  return (
    <div className="min-h-screen bg-background text-foreground text-sm">
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
  );
}