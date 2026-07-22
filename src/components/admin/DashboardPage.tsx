import { useMemo, useState, type ReactNode } from "react";
import {
  Users, UserPlus, Share2, Wallet, Crown,
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, Banknote, PiggyBank,
  Dice5, Trophy, Coins, Target, Percent,
  Gift, Sparkles, RotateCcw, Handshake, Star,
  ShieldAlert, UserX, Fingerprint, Users2, AlertTriangle,
  Clock3, CreditCard, ServerCog, RefreshCw, Bell,
  type LucideIcon,
} from "lucide-react";

type Range = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "last7" | "last30" | "last90" | "custom";

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "last90", label: "Last 90 Days" },
  { key: "custom", label: "Custom Range" },
];

type Tone = "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";

const TONE: Record<Tone, { bg: string; text: string; ring: string; bar: string }> = {
  indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-500",  ring: "ring-indigo-500/20",  bar: "bg-indigo-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/20", bar: "bg-emerald-500" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-500",   ring: "ring-amber-500/20",   bar: "bg-amber-500" },
  rose:    { bg: "bg-rose-500/10",    text: "text-rose-500",    ring: "ring-rose-500/20",    bar: "bg-rose-500" },
  sky:     { bg: "bg-sky-500/10",     text: "text-sky-500",     ring: "ring-sky-500/20",     bar: "bg-sky-500" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-500",  ring: "ring-violet-500/20",  bar: "bg-violet-500" },
  slate:   { bg: "bg-slate-500/10",   text: "text-slate-500",   ring: "ring-slate-500/20",   bar: "bg-slate-500" },
};

function fmtNum(n: number) {
  return n.toLocaleString("en-US");
}
function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type KPI = {
  title: string;
  value: string;
  delta?: { pct: number; up: boolean };
  icon: LucideIcon;
  tone: Tone;
  onClick?: () => void;
  hint?: string;
};

function KpiCard({ k }: { k: KPI }) {
  const t = TONE[k.tone];
  const Icon = k.icon;
  return (
    <button
      onClick={k.onClick}
      className="group text-left bg-panel border border-panel-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 h-full w-1 ${t.bar} opacity-70 group-hover:opacity-100`} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k.title}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums truncate">{k.value}</div>
          {k.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{k.hint}</div>}
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-md grid place-items-center ${t.bg} ${t.text} ring-1 ${t.ring}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {k.delta && (
        <div className="mt-3 flex items-center gap-1 text-[11px]">
          <span className={k.delta.up ? "text-emerald-500" : "text-rose-500"}>
            {k.delta.up ? "▲" : "▼"} {k.delta.pct.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs previous</span>
        </div>
      )}
    </button>
  );
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[13px] font-semibold tracking-wide uppercase text-foreground/90">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function TableCard({ title, subtitle, children, onOpen }: { title: string; subtitle?: string; children: ReactNode; onOpen?: () => void }) {
  return (
    <div className="bg-panel border border-panel-border rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-panel-border">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide">{title}</div>
          {subtitle && <div className="text-[10.5px] text-muted-foreground">{subtitle}</div>}
        </div>
        {onOpen && (
          <button onClick={onOpen} className="text-[11px] text-primary hover:underline">
            View all →
          </button>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate?: (p: string) => void } = {}) {
  const [range, setRange] = useState<Range>("today");
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toISOString().slice(0, 19).replace("T", " "));
  const [refreshing, setRefreshing] = useState(false);
  const [notifCount] = useState<number>(3);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date().toISOString().slice(0, 19).replace("T", " "));
      setRefreshing(false);
    }, 500);
  };

  const go = (p: string) => onNavigate?.(p);

  const players: KPI[] = useMemo(() => [
    { title: "Total Players", value: fmtNum(152320), icon: Users, tone: "indigo", delta: { pct: 2.4, up: true }, onClick: () => go("playerQuery") },
    { title: "New Register", value: fmtNum(286), icon: UserPlus, tone: "emerald", delta: { pct: 8.1, up: true }, onClick: () => go("playerQuery") },
    { title: "Referral Register", value: fmtNum(61), icon: Share2, tone: "sky", delta: { pct: 1.2, up: false }, onClick: () => go("playerQuery") },
    { title: "First Deposit Players", value: fmtNum(142), icon: Wallet, tone: "amber", delta: { pct: 4.7, up: true }, onClick: () => go("onlineRecharge") },
    { title: "VIP Players", value: fmtNum(925), icon: Crown, tone: "violet", delta: { pct: 0.6, up: true }, onClick: () => go("vipConfig") },
  ], []);

  const financial: KPI[] = useMemo(() => [
    { title: "Total Deposit", value: fmtMoney(286500), icon: ArrowDownToLine, tone: "emerald", delta: { pct: 5.9, up: true }, onClick: () => go("onlineRecharge") },
    { title: "Total Withdrawal", value: fmtMoney(221300), icon: ArrowUpFromLine, tone: "rose", delta: { pct: 3.2, up: true }, onClick: () => go("withdrawalOrder") },
    { title: "Net Deposit", value: fmtMoney(65200), icon: TrendingUp, tone: "indigo", delta: { pct: 12.4, up: true }, onClick: () => go("onlineRecharge") },
    { title: "Company Profit", value: fmtMoney(720000), icon: Banknote, tone: "amber", delta: { pct: 7.3, up: true } },
    { title: "Player Wallet Total", value: fmtMoney(5826300), icon: PiggyBank, tone: "sky", hint: "Sum of active wallets" },
  ], []);

  const gaming: KPI[] = useMemo(() => [
    { title: "Total Betting", value: fmtMoney(9500000), icon: Dice5, tone: "indigo", delta: { pct: 6.1, up: true } },
    { title: "Total Payout", value: fmtMoney(8780000), icon: Coins, tone: "sky", delta: { pct: 5.4, up: true } },
    { title: "Total Player Win", value: fmtMoney(8780000), icon: Trophy, tone: "emerald" },
    { title: "House Win", value: fmtMoney(720000), icon: Target, tone: "amber", delta: { pct: 2.9, up: true } },
    { title: "GGR", value: fmtMoney(720000), icon: Banknote, tone: "violet", delta: { pct: 3.1, up: true } },
    { title: "RTP", value: "96.18%", icon: Percent, tone: "slate", hint: "Rolling 24h" },
  ], []);

  const bonus: KPI[] = useMemo(() => [
    { title: "Total Bonus Given", value: fmtMoney(13280), icon: Gift, tone: "violet" },
    { title: "First Deposit Bonus", value: fmtMoney(5500), icon: Sparkles, tone: "emerald" },
    { title: "Cashback Bonus", value: fmtMoney(3200), icon: RotateCcw, tone: "sky" },
    { title: "Referral Bonus", value: fmtMoney(1500), icon: Handshake, tone: "amber" },
    { title: "VIP Bonus", value: fmtMoney(2100), icon: Star, tone: "rose", onClick: () => go("vipConfig") },
  ], []);

  const security: KPI[] = useMemo(() => [
    { title: "Risk Alert", value: fmtNum(25), icon: ShieldAlert, tone: "rose" },
    { title: "Fraud Players", value: fmtNum(8), icon: UserX, tone: "rose" },
    { title: "Duplicate IP Detection", value: fmtNum(15), icon: Fingerprint, tone: "amber" },
    { title: "Multi Account Detection", value: fmtNum(12), icon: Users2, tone: "amber" },
    { title: "Suspicious Transaction", value: fmtNum(6), icon: AlertTriangle, tone: "amber" },
  ], []);

  const topWinners = [
    { id: "1075612", user: "MgMg", game: "Baccarat", provider: "Evolution", win: 25800, time: "10:24" },
    { id: "1075890", user: "AyeAye", game: "Roulette", provider: "Pragmatic", win: 18420, time: "10:12" },
    { id: "1076001", user: "KoZaw", game: "Sweet Bonanza", provider: "Pragmatic", win: 12300, time: "09:58" },
    { id: "1075559", user: "ThuThu", game: "Dragon Tiger", provider: "Evolution", win: 9800, time: "09:41" },
    { id: "1077221", user: "NyiNyi", game: "Lightning Dice", provider: "Evolution", win: 7620, time: "09:20" },
  ];

  const topAgents = [
    { name: "Agent001", players: 2580, turnover: 850000, commission: 35200 },
    { name: "Agent007", players: 1980, turnover: 612000, commission: 24800 },
    { name: "Agent042", players: 1420, turnover: 488000, commission: 19100 },
    { name: "Agent108", players: 1105, turnover: 371000, commission: 14300 },
    { name: "Agent231", players: 860, turnover: 258000, commission: 9800 },
  ];

  const topWallets = [
    { user: "player777", vip: 10, bal: 125800, last: "Today" },
    { user: "highroller", vip: 9, bal: 98200, last: "Today" },
    { user: "goldking", vip: 8, bal: 76400, last: "Yesterday" },
    { user: "aungaung", vip: 7, bal: 62150, last: "Today" },
    { user: "mgmg88", vip: 7, bal: 54900, last: "2d ago" },
  ];

  return (
    <div className="p-4 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-panel border border-panel-border rounded-lg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">ONLINE CASINO ADMIN DASHBOARD</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Business overview at a glance — click any card to drill down.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Last update</div>
              <div className="text-[12px] font-mono tabular-nums">{lastUpdated}</div>
            </div>
            <button
              onClick={refresh}
              className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm inline-flex items-center gap-2"
            >
              <RefreshCw className={"w-3.5 h-3.5 " + (refreshing ? "animate-spin" : "")} />
              Refresh
            </button>
            <button className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent inline-flex items-center justify-center relative" title="Alerts">
              <Bell className="w-4 h-4" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 grid place-items-center">
                  {notifCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={
                "h-7 px-3 rounded-full text-[11.5px] border transition-colors " +
                (range === r.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-panel-border bg-background hover:bg-accent text-foreground/80")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => go("reviewWithdrawal")} className="bg-panel border border-panel-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 text-left">
          <div className="w-10 h-10 rounded-md bg-rose-500/10 text-rose-500 grid place-items-center ring-1 ring-rose-500/20">
            <Clock3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending Withdrawal</div>
            <div className="text-xl font-semibold tabular-nums">12</div>
          </div>
        </button>
        <button onClick={() => go("onlineRecharge")} className="bg-panel border border-panel-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 text-left">
          <div className="w-10 h-10 rounded-md bg-amber-500/10 text-amber-500 grid place-items-center ring-1 ring-amber-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending Deposit</div>
            <div className="text-xl font-semibold tabular-nums">6</div>
          </div>
        </button>
        <div className="bg-panel border border-panel-border rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-emerald-500/10 text-emerald-500 grid place-items-center ring-1 ring-emerald-500/20">
            <ServerCog className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Server Status</div>
            <div className="text-xl font-semibold flex items-center gap-2">
              Healthy
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <Section title="Player Overview" subtitle="Registrations, activation and VIP membership">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {players.map((k) => <KpiCard key={k.title} k={k} />)}
        </div>
      </Section>

      <Section title="Financial Overview" subtitle="Deposits, withdrawals and profit">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {financial.map((k) => <KpiCard key={k.title} k={k} />)}
        </div>
      </Section>

      <Section title="Gaming Performance" subtitle="Bet flow, GGR and RTP">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {gaming.map((k) => <KpiCard key={k.title} k={k} />)}
        </div>
      </Section>

      <Section title="Bonus Overview" subtitle="Promotional spend breakdown">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {bonus.map((k) => <KpiCard key={k.title} k={k} />)}
        </div>
      </Section>

      <Section title="Top Reports" subtitle="Highest performers for the selected period">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <TableCard title="Top Winning Players" onOpen={() => go("playerQuery")}>
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Player</th>
                  <th className="text-left font-medium px-3 py-2">Game</th>
                  <th className="text-left font-medium px-3 py-2">Provider</th>
                  <th className="text-right font-medium px-3 py-2">Win</th>
                  <th className="text-right font-medium px-3 py-2">Last</th>
                </tr>
              </thead>
              <tbody>
                {topWinners.map((r, i) => (
                  <tr key={r.id} className="border-t border-panel-border hover:bg-accent/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={"w-5 h-5 grid place-items-center rounded-full text-[10px] font-semibold " + (i < 3 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground")}>{i + 1}</span>
                        <div>
                          <div className="font-medium">{r.user}</div>
                          <div className="text-[10.5px] text-muted-foreground font-mono">{r.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.game}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.provider}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-500 tabular-nums">+{fmtMoney(r.win)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Top Commission Agents">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Agent</th>
                  <th className="text-right font-medium px-3 py-2">Players</th>
                  <th className="text-right font-medium px-3 py-2">Turnover</th>
                  <th className="text-right font-medium px-3 py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {topAgents.map((r, i) => (
                  <tr key={r.name} className="border-t border-panel-border hover:bg-accent/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={"w-5 h-5 grid place-items-center rounded-full text-[10px] font-semibold " + (i < 3 ? "bg-violet-500/15 text-violet-600" : "bg-muted text-muted-foreground")}>{i + 1}</span>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.players)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.turnover)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-500 tabular-nums">{fmtMoney(r.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Highest Wallet Balance" onOpen={() => go("playerQuery")}>
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Username</th>
                  <th className="text-left font-medium px-3 py-2">VIP</th>
                  <th className="text-right font-medium px-3 py-2">Wallet</th>
                  <th className="text-right font-medium px-3 py-2">Activity</th>
                </tr>
              </thead>
              <tbody>
                {topWallets.map((r, i) => (
                  <tr key={r.user} className="border-t border-panel-border hover:bg-accent/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={"w-5 h-5 grid place-items-center rounded-full text-[10px] font-semibold " + (i < 3 ? "bg-sky-500/15 text-sky-600" : "bg-muted text-muted-foreground")}>{i + 1}</span>
                        <span className="font-medium">{r.user}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-violet-500/10 text-violet-600 text-[10.5px]">
                        <Crown className="w-3 h-3" /> VIP {r.vip}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtMoney(r.bal)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{r.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      </Section>

      <Section title="Security & Risk Overview" subtitle="Automated risk signals for review">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {security.map((k) => <KpiCard key={k.title} k={k} />)}
        </div>
      </Section>
    </div>
  );
}