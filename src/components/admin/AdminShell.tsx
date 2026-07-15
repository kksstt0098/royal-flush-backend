import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT, type Lang, dict } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import {
  useMyanmarClock,
  usePendingCounts,
  useOnlineStaff,
  useRecentPending,
  reauthenticate,
  fetchExportBundle,
  rowsToCsv,
  downloadFile,
} from "@/hooks/use-admin-topbar";
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
  Megaphone,
  Mail,
  LogOut,
  Download,
  Loader2,
  ShieldCheck,
  Layers,
} from "lucide-react";

export type PageKey =
  | "playerQuery"
  | "withdrawalOrder"
  | "reviewWithdrawal"
  | "withdrawalPayment"
  | "onlineRecharge"
  | "offlineRecharge"
  | "quickRecharge"
  | "lobbyBanner"
  | "promoBanner"
  | "adsCategory"
  | "promotions"
  | "mailBox"
  | "marquee"
  | "csConfigure"
  | "vipConfig"
  | "levelConfig";

type NavItem = { key: keyof typeof dict; page?: PageKey };
type NavGroup = {
  key: string;
  label: keyof typeof dict;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  page?: PageKey;
};

const groups: NavGroup[] = [
  { key: "overview", label: "dataOverview", icon: LayoutDashboard },
  {
    key: "player",
    label: "player",
    icon: Users,
    children: [
      { key: "playerQuery", page: "playerQuery" },
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
      { key: "withdrawalOrder", page: "withdrawalOrder" },
      { key: "reviewWithdrawal", page: "reviewWithdrawal" },
      { key: "withdrawalPayment", page: "withdrawalPayment" },
      { key: "withdrawalReissue" },
      { key: "tmsConfig" },
    ],
  },
  {
    key: "recharge",
    label: "recharge",
    icon: RechargeIcon,
    children: [
      { key: "onlineRecharge", page: "onlineRecharge" },
      { key: "offlineRecharge", page: "offlineRecharge" },
      { key: "quickRecharge", page: "quickRecharge" },
    ],
  },
  {
    key: "adsBanner",
    label: "adsBanner",
    icon: Megaphone,
    children: [
      { key: "lobbyBanner", page: "lobbyBanner" },
      { key: "promoBanner", page: "promoBanner" },
      { key: "adsCategory", page: "adsCategory" },
      { key: "promotions", page: "promotions" },
    ],
  },
  {
    key: "ingameMail",
    label: "ingameMail",
    icon: Mail,
    children: [
      { key: "mailBox", page: "mailBox" },
      { key: "marquee", page: "marquee" },
      { key: "csConfigure", page: "csConfigure" },
    ],
  },
  {
    key: "levelConfig",
    label: "levelConfigGroup",
    icon: Layers,
    children: [
      { key: "vipConfig", page: "vipConfig" },
      { key: "levelConfig", page: "levelConfig" },
    ],
  },
];

export function AdminShell({
  children,
  activePage,
  onNavigate,
  openTabs,
  onCloseTab,
}: {
  children: ReactNode;
  activePage: PageKey;
  onNavigate: (p: PageKey) => void;
  openTabs: PageKey[];
  onCloseTab: (p: PageKey) => void;
}) {
  const { t, lang, setLang } = useT();
  const [open, setOpen] = useState<Record<string, boolean>>({ player: true, cash: true, levelConfig: true });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const navigate = useNavigate();
  const { user } = useSession();
  const [nick, setNick] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase.from("profiles").select("nick").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.nick) setNick(data.nick);
    });
  }, [user?.id]);

  const clock = useMyanmarClock();
  const counts = usePendingCounts(
    (order) => {
      toast.warning(`New withdrawal request`, {
        description: order,
        action: { label: "Review", onClick: () => onNavigate("reviewWithdrawal") },
      });
    },
    (order) => {
      toast.info(`New deposit`, {
        description: order,
        action: { label: "Review", onClick: () => onNavigate("onlineRecharge") },
      });
    },
  );
  const onlineCount = useOnlineStaff(user?.id, nick || email);
  const recent = useRecentPending();

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const displayName = nick || (email ? email.split("@")[0] : "Admin");
  const totalPending = counts.withdrawals + counts.deposits;

  const activeGroup = groups.find(
    (g) => g.page === activePage || g.children?.some((c) => c.page === activePage),
  );
  const activeChild = activeGroup?.children?.find((c) => c.page === activePage);
  const crumb = activeChild ? t(activeChild.key) : activeGroup?.page === activePage ? t(activeGroup.label) : "";
  const groupLabel = activeGroup ? t(activeGroup.label) : "";

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
            const isLeafActive = g.page && g.page === activePage;
            return (
              <div key={g.key}>
                <button
                  onClick={() => {
                    if (hasChildren) toggle(g.key);
                    else if (g.page) onNavigate(g.page);
                  }}
                  className={
                    "w-full flex items-center gap-2 px-4 h-9 hover:bg-white/5 " +
                    (isLeafActive
                      ? "bg-[oklch(0.6_0.18_250)]/15 text-[oklch(0.75_0.18_250)]"
                      : "text-white/80")
                  }
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
                       g.children!.map((c) => {
                         const isActive = c.page && c.page === activePage;
                         return (
                           <div
                             key={c.key}
                             onClick={() => c.page && onNavigate(c.page)}
                             className={
                               "pl-11 pr-4 h-8 flex items-center cursor-pointer text-[12.5px] " +
                               (isActive
                                 ? "bg-[oklch(0.6_0.18_250)]/15 text-[oklch(0.75_0.18_250)]"
                                 : "text-white/70 hover:bg-white/5")
                             }
                           >
                             {t(c.key)}
                           </div>
                         );
                       })
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
            <span className="text-foreground/80">{groupLabel}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-info">{crumb}</span>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-foreground/80">
          <span className="text-muted-foreground tabular-nums">Myanmar: {clock}</span>
          <button
            onClick={() => setLang((lang === "en" ? "my" : "en") as Lang)}
            className="flex items-center gap-1 hover:text-info"
            title="Toggle language"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === "en" ? "English" : "မြန်မာ"}</span>
          </button>

          {/* Bell — notifications */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen((v) => !v)}
              className="relative flex items-center hover:text-info"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {totalPending > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-danger text-danger-foreground text-[10px] rounded-full px-1 min-w-[16px] text-center leading-4">
                  {totalPending > 99 ? "99+" : totalPending}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-8 w-80 max-h-96 overflow-auto bg-panel border border-panel-border rounded-md shadow-lg z-50">
                <div className="px-3 py-2 border-b border-panel-border text-xs font-semibold flex items-center justify-between">
                  <span>Pending orders ({totalPending})</span>
                  <button onClick={() => setBellOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {recent.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground text-center">No pending orders</div>
                ) : (
                  recent.map((r) => (
                    <button
                      key={r.kind + r.orderNo}
                      onClick={() => {
                        onNavigate(r.kind === "withdrawal" ? "reviewWithdrawal" : "onlineRecharge");
                        setBellOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent border-b border-panel-border/50 flex justify-between items-start gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.kind}</div>
                        <div className="text-xs font-mono truncate">{r.orderNo}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold">{r.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* File — export */}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1 hover:text-info"
            title="Export data (approval required)"
          >
            <FileText className="w-4 h-4" /> {t("file")}
          </button>

          <span title="Online staff (live)">online {onlineCount}</span>

          <button
            onClick={() => onNavigate("onlineRecharge")}
            className="flex items-center gap-1 hover:text-info relative"
            title="Pending deposits"
          >
            <CreditCard className="w-4 h-4" /> {t("pay")}
            {counts.deposits > 0 && (
              <span className="absolute -top-1.5 -right-3 bg-warning text-warning-foreground text-[10px] rounded-full px-1 min-w-[16px] text-center leading-4">
                {counts.deposits}
              </span>
            )}
          </button>
          <button
            onClick={() => onNavigate("reviewWithdrawal")}
            className="flex items-center gap-1 hover:text-info relative"
            title="Pending withdrawals"
          >
            <Wallet className="w-4 h-4" /> {t("withdraw")}
            {counts.withdrawals > 0 && (
              <span className="absolute -top-1.5 -right-3 bg-danger text-danger-foreground text-[10px] rounded-full px-1 min-w-[16px] text-center leading-4">
                {counts.withdrawals}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-1 pl-3 hover:text-info"
            >
              <User className="w-4 h-4 p-0.5 rounded-full bg-muted" />
              {displayName}
              <ChevronDown className="w-3 h-3" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-8 w-56 bg-panel border border-panel-border rounded-md shadow-lg z-50">
                <div className="px-3 py-2 border-b border-panel-border">
                  <div className="text-xs font-semibold">{displayName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{email}</div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-danger"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-panel-border bg-panel px-4 h-9">
        {openTabs.map((tab) => {
          const active = tab === activePage;
          return (
            <div
              key={tab}
              onClick={() => onNavigate(tab)}
              className={
                "group flex items-center gap-2 px-3 h-7 text-[12px] rounded-sm border cursor-pointer " +
                (active
                  ? "bg-panel border-info-foreground text-success"
                  : "bg-panel border-transparent hover:border-panel-border text-foreground/80")
              }
            >
              {active && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              <span>{t(tab)}</span>
              <X
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab);
                }}
                className="w-3 h-3 text-muted-foreground/70 hover:text-danger"
              />
            </div>
          );
        })}
      </div>

      <main className="p-3">{children}</main>
      </div>
      {exportOpen && (
        <ExportDialog email={email} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}

function ExportDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [scope, setScope] = useState<"withdrawals" | "deposits" | "both">("both");
  const [step, setStep] = useState<"approve" | "ready">("approve");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) { setError("Password required"); return; }
    setBusy(true);
    const ok = await reauthenticate(email, password);
    setBusy(false);
    if (ok) {
      setStep("ready");
      toast.success("Export approved");
    } else {
      setError("Incorrect password");
    }
  };

  const doDownload = async () => {
    setBusy(true);
    const bundle = await fetchExportBundle();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (scope === "withdrawals" || scope === "both") {
      downloadFile(`withdrawals_${stamp}.csv`, rowsToCsv(bundle.withdrawals));
    }
    if (scope === "deposits" || scope === "both") {
      downloadFile(`deposits_${stamp}.csv`, rowsToCsv(bundle.deposits));
    }
    setBusy(false);
    toast.success("Export downloaded");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Download className="w-4 h-4" /> Export data
          </h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">What to export</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
          >
            <option value="both">Withdrawals + Deposits</option>
            <option value="withdrawals">Withdrawals only</option>
            <option value="deposits">Deposits only</option>
          </select>
        </div>

        {step === "approve" ? (
          <form onSubmit={approve} className="space-y-3">
            <div className="text-xs text-muted-foreground flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-sm p-2">
              <ShieldCheck className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <span>Download requires admin approval. Re-enter your password to authorize this export.</span>
            </div>
            <label className="block text-xs">Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="h-9 px-3 rounded-sm border border-input text-sm hover:bg-accent">Cancel</button>
              <button disabled={busy} type="submit" className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm disabled:opacity-50 flex items-center gap-2">
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Approve
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-success flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Approved — ready to download.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-9 px-3 rounded-sm border border-input text-sm hover:bg-accent">Cancel</button>
              <button disabled={busy} onClick={doDownload} className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm disabled:opacity-50 flex items-center gap-2">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}