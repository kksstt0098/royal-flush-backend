import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, UserPlus, Share2, Wallet, Crown,
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, Banknote, PiggyBank,
  Dice5, Trophy, Coins, Target, Percent,
  Gift, Sparkles, RotateCcw, Handshake, Star,
  ShieldAlert, UserX, Fingerprint, Users2, AlertTriangle,
  Clock3, CreditCard, ServerCog, RefreshCw, Bell,
  type LucideIcon,
} from "lucide-react";
import { getDashboardStats, type DashboardRange, type DashboardStats } from "@/lib/dashboard.functions";

type Range = DashboardRange;

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

function fmtNum(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}
function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits) + "%";
}
function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
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
      disabled={!k.onClick}
      className="group text-left bg-panel border border-panel-border rounded-lg p-4 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 h-full w-[3px] ${t.bar} opacity-60 group-hover:opacity-100`} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{k.title}</div>
          <div className="mt-2 text-[22px] leading-tight font-semibold tabular-nums truncate">{k.value}</div>
          {k.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{k.hint}</div>}
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${t.bg} ${t.text} ring-1 ${t.ring}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {k.delta && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px]">
          <span className={`inline-flex items-center gap-0.5 px-1.5 h-4 rounded ${k.delta.up ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
            {k.delta.up ? "▲" : "▼"} {Math.abs(k.delta.pct).toFixed(1)}%
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
  const fetchStats = useServerFn(getDashboardStats);
  const q = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", range],
    queryFn: () => fetchStats({ data: { range } }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const s = q.data;
  const lastUpdated = q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null;
  const go = (p: string) => onNavigate?.(p);

  const delta = (v: number | null | undefined): KPI["delta"] => {
    if (v === null || v === undefined || Number.isNaN(v)) return undefined;
    return { pct: v, up: v >= 0 };
  };

  const players: KPI[] = useMemo(() => [
    { title: "Total Players", value: fmtNum(s?.players.total ?? 0), icon: Users, tone: "indigo", onClick: () => go("playerQuery") },
    { title: "New Register", value: fmtNum(s?.players.newRegister ?? 0), icon: UserPlus, tone: "emerald", delta: delta(s?.deltas.newRegister), onClick: () => go("playerQuery") },
    { title: "Referral Register", value: fmtNum(s?.players.referralRegister ?? 0), icon: Share2, tone: "sky", onClick: () => go("playerQuery") },
    { title: "First Deposit Players", value: fmtNum(s?.players.firstDeposit ?? 0), icon: Wallet, tone: "amber", onClick: () => go("onlineRecharge") },
    { title: "VIP Players", value: fmtNum(s?.players.vip ?? 0), icon: Crown, tone: "violet", onClick: () => go("vipConfig") },
  ], [s]);

  const financial: KPI[] = useMemo(() => [
    { title: "Total Deposit", value: fmtMoney(s?.financial.totalDeposit ?? 0), icon: ArrowDownToLine, tone: "emerald", delta: delta(s?.deltas.totalDeposit), onClick: () => go("onlineRecharge") },
    { title: "Total Withdrawal", value: fmtMoney(s?.financial.totalWithdrawal ?? 0), icon: ArrowUpFromLine, tone: "rose", delta: delta(s?.deltas.totalWithdrawal), onClick: () => go("withdrawalOrder") },
    { title: "Net Deposit", value: fmtMoney(s?.financial.netDeposit ?? 0), icon: TrendingUp, tone: "indigo", onClick: () => go("onlineRecharge") },
    { title: "Company Profit", value: fmtMoney(s?.gaming.ggr ?? 0), icon: Banknote, tone: "amber", hint: "GGR = Bet − Payout" },
    { title: "Player Wallet Total", value: fmtMoney(s?.financial.walletTotal ?? 0), icon: PiggyBank, tone: "sky", hint: "Sum of active wallets" },
  ], [s]);

  const gaming: KPI[] = useMemo(() => [
    { title: "Total Betting", value: fmtMoney(s?.gaming.totalBet ?? 0), icon: Dice5, tone: "indigo", delta: delta(s?.deltas.totalBet) },
    { title: "Total Payout", value: fmtMoney(s?.gaming.totalPayout ?? 0), icon: Coins, tone: "sky" },
    { title: "Total Player Win", value: fmtMoney(s?.gaming.playerWin ?? 0), icon: Trophy, tone: "emerald" },
    { title: "House Win", value: fmtMoney(s?.gaming.houseWin ?? 0), icon: Target, tone: "amber" },
    { title: "GGR", value: fmtMoney(s?.gaming.ggr ?? 0), icon: Banknote, tone: "violet" },
    { title: "RTP", value: fmtPct(s?.gaming.rtp), icon: Percent, tone: "slate", hint: "Payout ÷ Bet" },
  ], [s]);

  const bonus: KPI[] = useMemo(() => [
    { title: "Total Bonus Given", value: fmtMoney(s?.bonus.totalBonus ?? 0), icon: Gift, tone: "violet" },
    { title: "First Deposit Bonus", value: fmtMoney(0), icon: Sparkles, tone: "emerald", hint: "—" },
    { title: "Cashback Bonus", value: fmtMoney(0), icon: RotateCcw, tone: "sky", hint: "—" },
    { title: "Referral Bonus", value: fmtMoney(0), icon: Handshake, tone: "amber", hint: "—" },
    { title: "VIP Bonus", value: fmtMoney(0), icon: Star, tone: "rose", hint: "—", onClick: () => go("vipConfig") },
  ], [s]);

  const security: KPI[] = useMemo(() => [
    { title: "Risk Alert", value: fmtNum(0), icon: ShieldAlert, tone: "rose", hint: "—" },
    { title: "Fraud Players", value: fmtNum(0), icon: UserX, tone: "rose", hint: "—" },
    { title: "Duplicate IP Detection", value: fmtNum(0), icon: Fingerprint, tone: "amber", hint: "—" },
    { title: "Multi Account Detection", value: fmtNum(0), icon: Users2, tone: "amber", hint: "—" },
    { title: "Suspicious Transaction", value: fmtNum(0), icon: AlertTriangle, tone: "amber", hint: "—" },
  ], []);

  const topWinners = s?.topWinners ?? [];
  const topWallets = s?.topWallets ?? [];

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
              <div className="text-[12px] font-mono tabular-nums">
                {lastUpdated ? lastUpdated.toISOString().slice(0, 19).replace("T", " ") : "—"}
              </div>
            </div>
            <button
              onClick={() => q.refetch()}
              className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm inline-flex items-center gap-2"
            >
              <RefreshCw className={"w-3.5 h-3.5 " + (q.isFetching ? "animate-spin" : "")} />
              Refresh
            </button>
            <button className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent inline-flex items-center justify-center relative" title="Alerts">
              <Bell className="w-4 h-4" />
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
            <div className="text-xl font-semibold tabular-nums">{fmtNum(s?.quick.pendingWithdrawal ?? 0)}</div>
          </div>
        </button>
        <button onClick={() => go("onlineRecharge")} className="bg-panel border border-panel-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 text-left">
          <div className="w-10 h-10 rounded-md bg-amber-500/10 text-amber-500 grid place-items-center ring-1 ring-amber-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending Deposit</div>
            <div className="text-xl font-semibold tabular-nums">{fmtNum(s?.quick.pendingDeposit ?? 0)}</div>
          </div>
        </button>
        <div className="bg-panel border border-panel-border rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-emerald-500/10 text-emerald-500 grid place-items-center ring-1 ring-emerald-500/20">
            <ServerCog className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Server Status</div>
            <div className="text-xl font-semibold flex items-center gap-2">
              {q.isError ? "Degraded" : "Healthy"}
              <span className={`inline-block w-2 h-2 rounded-full ${q.isError ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`} />
            </div>
          </div>
        </div>
      </div>

      {q.isError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-[12px] text-rose-500">
          Failed to load dashboard data. Try refreshing.
        </div>
      )}

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
                  <th className="text-right font-medium px-3 py-2">Win</th>
                  <th className="text-right font-medium px-3 py-2">Last</th>
                </tr>
              </thead>
              <tbody>
                {topWinners.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
                )}
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
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
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
                {topWallets.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
                )}
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
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtMoney(r.balance)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmtTime(r.last)}</td>
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