import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Wallet,
  X,
  ArrowUpDown,
} from "lucide-react";

type TxType =
  | "Deposit"
  | "Withdrawal"
  | "Enter Game"
  | "Exit Game"
  | "Game Bet"
  | "Game Win"
  | "Jackpot Win"
  | "Promotion Bonus"
  | "Cashback"
  | "Rebate"
  | "Referral Bonus"
  | "VIP Bonus"
  | "Manual Add Balance"
  | "Manual Deduct Balance"
  | "Refund"
  | "Rollback"
  | "Freeze Balance"
  | "Unfreeze Balance"
  | "System Adjustment";

type TxStatus = "Success" | "Pending" | "Approved" | "Failed" | "Cancelled";

type LogRow = {
  id: string;
  time: string;
  playerId: string;
  nick?: string;
  type: TxType;
  before: number | null;
  change: number;
  after: number | null;
  refId: string;
  operator: string;
  status: TxStatus;
  remark: string;
  source: "deposit" | "withdrawal" | "bet";
  raw: Record<string, unknown>;
};

type Filters = {
  from: string;
  to: string;
  playerId: string;
  username: string;
  type: string;
  status: string;
};

const PAGE_SIZE = 20;

const TYPE_OPTIONS: TxType[] = [
  "Deposit",
  "Withdrawal",
  "Enter Game",
  "Exit Game",
  "Game Bet",
  "Game Win",
  "Jackpot Win",
  "Promotion Bonus",
  "Cashback",
  "Rebate",
  "Referral Bonus",
  "VIP Bonus",
  "Manual Add Balance",
  "Manual Deduct Balance",
  "Refund",
  "Rollback",
  "Freeze Balance",
  "Unfreeze Balance",
  "System Adjustment",
];

const STATUS_OPTIONS: TxStatus[] = ["Success", "Pending", "Approved", "Failed", "Cancelled"];

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function typeBadge(t: TxType): string {
  const inflow: TxType[] = [
    "Deposit",
    "Exit Game",
    "Game Win",
    "Jackpot Win",
    "Promotion Bonus",
    "Cashback",
    "Rebate",
    "Referral Bonus",
    "VIP Bonus",
    "Manual Add Balance",
    "Refund",
    "Unfreeze Balance",
  ];
  const outflow: TxType[] = [
    "Withdrawal",
    "Enter Game",
    "Game Bet",
    "Manual Deduct Balance",
    "Freeze Balance",
  ];
  if (t === "Deposit") return "bg-success/10 text-success";
  if (t === "Withdrawal") return "bg-warning/10 text-warning";
  if (t === "Enter Game" || t === "Game Bet") return "bg-danger/10 text-danger";
  if (t === "Exit Game") return "bg-info/10 text-info";
  if (t === "Promotion Bonus" || t === "VIP Bonus" || t === "Referral Bonus")
    return "bg-primary/10 text-primary";
  if (inflow.includes(t)) return "bg-success/10 text-success";
  if (outflow.includes(t)) return "bg-danger/10 text-danger";
  return "bg-muted text-muted-foreground";
}

function statusBadge(s: TxStatus): string {
  if (s === "Success" || s === "Approved") return "bg-success/10 text-success";
  if (s === "Pending") return "bg-warning/10 text-warning";
  if (s === "Failed") return "bg-danger/10 text-danger";
  if (s === "Cancelled") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

function depositType(channel: string | null, creditType: string | null): TxType {
  if (creditType === "Bonus") return "Promotion Bonus";
  if (creditType === "Debit" || (channel ?? "").toLowerCase().includes("debit"))
    return "Manual Deduct Balance";
  if (creditType === "Manual") return "Manual Add Balance";
  return "Deposit";
}

function normStatus(s: string): TxStatus {
  const v = (s || "").toLowerCase();
  if (v === "successful" || v === "success" || v === "paid") return "Success";
  if (v === "audited" || v === "approved") return "Approved";
  if (v === "pending" || v === "paying out" || v === "freeze") return "Pending";
  if (v === "reject" || v === "failed") return "Failed";
  if (v === "cancelled" || v === "canceled") return "Cancelled";
  return "Success";
}

export function AccountLogsPage() {
  const [filters, setFilters] = useState<Filters>({
    from: todayIso(-6),
    to: todayIso(),
    playerId: "",
    username: "",
    type: "all",
    status: "all",
  });
  const [draft, setDraft] = useState<Filters>(filters);
  const [allRows, setAllRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [detail, setDetail] = useState<LogRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const from = new Date(filters.from + "T00:00:00").toISOString();
      const to = new Date(filters.to + "T23:59:59").toISOString();

      // Resolve username → playerIds
      let playerIdFilter: string[] | null = null;
      if (filters.username.trim()) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id")
          .ilike("nick", `%${filters.username.trim()}%`)
          .limit(500);
        playerIdFilter = (profs ?? []).map((p) => p.id);
        if (playerIdFilter.length === 0) {
          setAllRows([]);
          setLoading(false);
          return;
        }
      }

      const dq = supabase
        .from("deposits")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })
        .limit(5000);
      const wq = supabase
        .from("withdrawals")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })
        .limit(5000);
      const bq = supabase
        .from("bets")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })
        .limit(5000);

      const [{ data: deps }, { data: wds }, { data: bets }] = await Promise.all([dq, wq, bq]);

      const events: LogRow[] = [];
      (deps ?? []).forEach((d: any) => {
        const st = normStatus(d.status);
        const type = depositType(d.channel, d.credit_type);
        const amount = Number(d.amount ?? 0);
        const change = type === "Manual Deduct Balance" ? -Math.abs(amount) : Math.abs(amount);
        events.push({
          id: `dep-${d.id}`,
          time: d.created_at,
          playerId: d.player_id,
          type,
          before: null,
          after: null,
          change: st === "Success" ? change : 0,
          refId: d.order_no ?? d.id,
          operator: d.created_by_name || (d.channel ?? "system"),
          status: st,
          remark: d.remark || `${d.channel ?? "Deposit"}`,
          source: "deposit",
          raw: d,
        });
      });
      (wds ?? []).forEach((w: any) => {
        const st = normStatus(w.status);
        const amt = Number(w.actual_amount ?? w.apply_amount ?? 0);
        const change = st === "Success" ? -Math.abs(amt) : 0;
        events.push({
          id: `wd-${w.id}`,
          time: w.created_at,
          playerId: w.player_id,
          type: "Withdrawal",
          before: null,
          after: null,
          change,
          refId: w.order_no ?? w.id,
          operator: w.transferor_name || w.auditor_name || "system",
          status: st,
          remark: w.remark || `${w.payout_mode ?? "Bank"} Withdrawal`,
          source: "withdrawal",
          raw: w,
        });
      });
      (bets ?? []).forEach((b: any) => {
        const stake = Number(b.stake ?? 0);
        const win = Number(b.win_amount ?? 0);
        if (stake > 0) {
          events.push({
            id: `bet-${b.id}-s`,
            time: b.created_at,
            playerId: b.player_id,
            type: "Game Bet",
            before: null,
            after: null,
            change: -stake,
            refId: b.id,
            operator: "system",
            status: "Success",
            remark: `${b.game ?? "Game"} bet`,
            source: "bet",
            raw: b,
          });
        }
        if (win > 0) {
          events.push({
            id: `bet-${b.id}-w`,
            time: b.created_at,
            playerId: b.player_id,
            type: "Game Win",
            before: null,
            after: null,
            change: win,
            refId: b.id,
            operator: "system",
            status: "Success",
            remark: `${b.game ?? "Game"} win`,
            source: "bet",
            raw: b,
          });
        }
      });

      // Player scoping
      let scoped = events;
      if (filters.playerId.trim()) {
        scoped = scoped.filter((e) => e.playerId === filters.playerId.trim());
      }
      if (playerIdFilter) {
        const set = new Set(playerIdFilter);
        scoped = scoped.filter((e) => set.has(e.playerId));
      }

      // Attach nicks + current wallet balances for backward running-balance
      const playerIds = Array.from(new Set(scoped.map((e) => e.playerId)));
      const [{ data: profs }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id, nick").in("id", playerIds),
        supabase.from("wallets").select("user_id, coins").in("user_id", playerIds),
      ]);
      const nickMap = new Map((profs ?? []).map((p: any) => [p.id, p.nick as string]));
      const balMap = new Map((wallets ?? []).map((w: any) => [w.user_id, Number(w.coins)]));

      // Compute before/after per player, iterating newest → oldest.
      const byPlayer = new Map<string, LogRow[]>();
      scoped.forEach((e) => {
        e.nick = nickMap.get(e.playerId);
        const arr = byPlayer.get(e.playerId) ?? [];
        arr.push(e);
        byPlayer.set(e.playerId, arr);
      });
      byPlayer.forEach((arr, pid) => {
        arr.sort((a, b) => (a.time < b.time ? 1 : -1));
        let running = balMap.get(pid) ?? 0;
        arr.forEach((e) => {
          e.after = running;
          e.before = running - e.change;
          running = e.before;
        });
      });

      setAllRows(scoped);
      setPage(1);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filtered = useMemo(() => {
    let list = allRows;
    if (filters.type !== "all") list = list.filter((r) => r.type === filters.type);
    if (filters.status !== "all") list = list.filter((r) => r.status === filters.status);
    list = [...list].sort((a, b) => {
      const t = a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
      return sortAsc ? t : -t;
    });
    return list;
  }, [allRows, filters.type, filters.status, sortAsc]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => {
    let credit = 0;
    let debit = 0;
    filtered.forEach((r) => {
      if (r.change > 0) credit += r.change;
      else debit += r.change;
    });
    return { count: filtered.length, credit, debit, net: credit + debit };
  }, [filtered]);

  const pageNumbers = useMemo(() => {
    const arr: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) arr.push(i);
      else if (arr[arr.length - 1] !== "…") arr.push("…");
    }
    return arr;
  }, [page, totalPages]);

  const search = () => setFilters(draft);
  const reset = () => {
    const d: Filters = {
      from: todayIso(-6),
      to: todayIso(),
      playerId: "",
      username: "",
      type: "all",
      status: "all",
    };
    setDraft(d);
    setFilters(d);
  };

  const exportXlsx = () => {
    const rows = filtered.map((r) => ({
      Time: new Date(r.time).toLocaleString(),
      Player: r.nick || r.playerId,
      "Player ID": r.playerId,
      Type: r.type,
      "Balance Before": r.before ?? "",
      "Balance Change": r.change,
      "Balance After": r.after ?? "",
      "Reference ID": r.refId,
      Operator: r.operator,
      Status: r.status,
      Remark: r.remark,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Account Logs");
    XLSX.writeFile(wb, `account_logs_${filters.from}_${filters.to}.xlsx`);
    toast.success(`Exported ${rows.length} records`);
  };

  const inputCls =
    "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:ring-2 focus:ring-ring";
  const btnCls =
    "h-9 inline-flex items-center gap-1.5 rounded-md px-3 text-[13px] font-medium border border-input bg-background hover:bg-accent";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Wallet className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Account Balance Log</h1>
          <p className="text-xs text-muted-foreground">
            Wallet transaction audit trail across deposits, withdrawals and game rounds
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-panel border border-panel-border rounded-lg shadow-sm p-3 md:p-4">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
        >
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Date From</label>
            <input
              type="date"
              className={inputCls}
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Date To</label>
            <input
              type="date"
              className={inputCls}
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Player ID</label>
            <input
              className={inputCls}
              placeholder="UUID"
              value={draft.playerId}
              onChange={(e) => setDraft({ ...draft, playerId: e.target.value })}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Username</label>
            <input
              className={inputCls}
              placeholder="Nickname"
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Transaction Type</label>
            <select
              className={inputCls}
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              <option value="all">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Status</label>
            <select
              className={inputCls}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex items-end gap-2 flex-wrap">
            <button
              onClick={search}
              className={btnCls + " bg-info text-info-foreground border-info hover:bg-info/90"}
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button onClick={reset} className={btnCls}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={exportXlsx} className={btnCls}>
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[1200px]">
            <thead className="bg-muted/60 text-muted-foreground sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">
                  <button
                    onClick={() => setSortAsc((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Time <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">Player</th>
                <th className="px-3 py-2 font-medium">Transaction Type</th>
                <th className="px-3 py-2 font-medium text-right">Balance Before</th>
                <th className="px-3 py-2 font-medium text-right">Balance Change</th>
                <th className="px-3 py-2 font-medium text-right">Balance After</th>
                <th className="px-3 py-2 font-medium">Reference ID</th>
                <th className="px-3 py-2 font-medium">Operator</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Remark</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-muted-foreground">
                    No transactions match the current filters.
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => (
                  <tr
                    key={r.id}
                    className={
                      "border-t border-panel-border hover:bg-accent/40 " +
                      (i % 2 === 1 ? "bg-muted/20" : "")
                    }
                  >
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {new Date(r.time).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-medium">{r.nick || "—"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {r.playerId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={
                          "inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium " +
                          typeBadge(r.type)
                        }
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {fmt(r.before)}
                    </td>
                    <td
                      className={
                        "px-3 py-2 whitespace-nowrap text-right tabular-nums font-semibold " +
                        (r.change > 0
                          ? "text-success"
                          : r.change < 0
                          ? "text-danger"
                          : "text-muted-foreground")
                      }
                    >
                      {r.change > 0 ? "+" : ""}
                      {fmt(r.change)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">
                      {fmt(r.after)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11.5px]">
                      {String(r.refId).slice(0, 16)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.operator || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={
                          "inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium " +
                          statusBadge(r.status)
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2 max-w-[220px] truncate"
                      title={r.remark}
                    >
                      {r.remark || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        className="text-info hover:underline text-[12px]"
                        onClick={() => setDetail(r)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 md:px-4 py-3 border-t border-panel-border bg-muted/30 text-[12px]">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Total: <span className="font-semibold text-foreground">{summary.count}</span>
            </span>
            <span>
              Credit:{" "}
              <span className="font-semibold text-success">+{fmt(summary.credit)}</span>
            </span>
            <span>
              Debit:{" "}
              <span className="font-semibold text-danger">{fmt(summary.debit)}</span>
            </span>
            <span>
              Net:{" "}
              <span
                className={
                  "font-semibold " +
                  (summary.net > 0
                    ? "text-success"
                    : summary.net < 0
                    ? "text-danger"
                    : "text-foreground")
                }
              >
                {summary.net > 0 ? "+" : ""}
                {fmt(summary.net)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">
              Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <button
              className={btnCls + " px-2"}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {pageNumbers.map((n, idx) =>
              n === "…" ? (
                <span key={idx} className="px-2 text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={idx}
                  onClick={() => setPage(n)}
                  className={
                    "h-8 min-w-8 px-2 rounded-md text-[12px] " +
                    (n === page
                      ? "bg-primary text-primary-foreground"
                      : "border border-input bg-background hover:bg-accent")
                  }
                >
                  {n}
                </button>
              ),
            )}
            <button
              className={btnCls + " px-2"}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {detail && <DetailModal row={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailModal({ row, onClose }: { row: LogRow; onClose: () => void }) {
  const raw = row.raw as any;
  const sections: { title: string; items: [string, React.ReactNode][] }[] = [
    {
      title: "Transaction Information",
      items: [
        ["Transaction ID", <span className="font-mono text-[11.5px]">{row.id}</span>],
        ["Reference ID", <span className="font-mono text-[11.5px]">{row.refId}</span>],
        ["Transaction Type", row.type],
        ["Wallet Type", "Main Wallet"],
        ["Currency", "MMK"],
        ["Amount", fmt(Math.abs(row.change))],
        ["Status", row.status],
      ],
    },
    {
      title: "Balance Information",
      items: [
        ["Balance Before", fmt(row.before)],
        ["Balance Change", `${row.change > 0 ? "+" : ""}${fmt(row.change)}`],
        ["Balance After", fmt(row.after)],
      ],
    },
    {
      title: "Player Information",
      items: [
        ["Player ID", <span className="font-mono text-[11.5px]">{row.playerId}</span>],
        ["Username", row.nick || "—"],
        ["VIP Level", "—"],
        ["Agent", "—"],
      ],
    },
    {
      title: "Source Information",
      items: [
        ["Provider", row.source === "bet" ? raw?.game?.split?.("/")?.[0] ?? "House" : "—"],
        ["Game Name", row.source === "bet" ? raw?.game ?? "—" : "—"],
        ["Round ID", row.source === "bet" ? raw?.id ?? "—" : "—"],
        ["Bet ID", row.source === "bet" ? raw?.id ?? "—" : "—"],
      ],
    },
    {
      title: "Technical Information",
      items: [
        ["Create Time", new Date(row.time).toLocaleString()],
        [
          "Complete Time",
          raw?.payment_time || raw?.notify_time
            ? new Date(raw.payment_time || raw.notify_time).toLocaleString()
            : "—",
        ],
        ["Login IP", raw?.login_ip || "—"],
        ["Device", raw?.device_type || "—"],
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-panel border border-panel-border rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <div>
            <div className="text-sm font-semibold">Transaction Detail</div>
            <div className="text-[11px] text-muted-foreground">{row.type} · {row.status}</div>
          </div>
          <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-5">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                {s.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                {s.items.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-panel-border/60 py-1.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-right font-medium min-w-0 truncate">{v as any}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}