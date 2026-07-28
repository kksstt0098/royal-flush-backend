import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, RotateCcw, Download, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";

type BetRow = {
  id: string;
  player_id: string;
  game: string;
  stake: number;
  win_amount: number;
  created_at: string;
  nick?: string;
};

type Filters = {
  from: string;
  to: string;
  playerId: string;
  username: string;
  provider: string;
  game: string;
  status: string;
};

const PAGE_SIZE = 20;

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function providerOf(game: string): string {
  if (!game) return "—";
  if (game.includes("/")) return game.split("/")[0];
  if (game.includes(":")) return game.split(":")[0];
  return "House";
}

function statusOf(_row: BetRow): "Won" | "Lost" | "Push" {
  const net = _row.win_amount - _row.stake;
  if (net > 0) return "Won";
  if (net < 0) return "Lost";
  return "Push";
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function GameRecordsPage() {
  const [filters, setFilters] = useState<Filters>({
    from: todayIso(-6),
    to: todayIso(),
    playerId: "",
    username: "",
    provider: "all",
    game: "all",
    status: "all",
  });
  const [draft, setDraft] = useState<Filters>(filters);
  const [rows, setRows] = useState<BetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    totalBets: 0,
    totalBet: 0,
    totalWin: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const from = new Date(filters.from + "T00:00:00").toISOString();
      const to = new Date(filters.to + "T23:59:59").toISOString();

      // Resolve username -> player_ids
      let playerIds: string[] | null = null;
      if (filters.username.trim()) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id")
          .ilike("nick", `%${filters.username.trim()}%`)
          .limit(500);
        playerIds = (profs ?? []).map((p) => p.id);
        if (playerIds.length === 0) {
          setRows([]);
          setTotal(0);
          setSummary({ totalBets: 0, totalBet: 0, totalWin: 0 });
          setLoading(false);
          return;
        }
      }

      let q = supabase
        .from("bets")
        .select("*", { count: "exact" })
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });

      if (filters.playerId.trim()) q = q.eq("player_id", filters.playerId.trim());
      if (playerIds) q = q.in("player_id", playerIds);
      if (filters.game !== "all") q = q.eq("game", filters.game);

      const fromIdx = (page - 1) * PAGE_SIZE;
      const toIdx = fromIdx + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(fromIdx, toIdx);
      if (error) throw error;

      let list = (data ?? []) as BetRow[];

      // Provider filter (client-side derived)
      if (filters.provider !== "all") {
        list = list.filter((r) => providerOf(r.game) === filters.provider);
      }
      if (filters.status !== "all") {
        list = list.filter((r) => statusOf(r) === filters.status);
      }

      // Fetch nicks
      const ids = Array.from(new Set(list.map((r) => r.player_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nick")
          .in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p.nick as string]));
        list = list.map((r) => ({ ...r, nick: map.get(r.player_id) ?? "" }));
      }

      setRows(list);
      setTotal(count ?? list.length);

      // Summary across filter range (not just page)
      const { data: agg } = await supabase
        .from("bets")
        .select("stake, win_amount")
        .gte("created_at", from)
        .lte("created_at", to)
        .limit(50000);
      const a = (agg ?? []) as { stake: number; win_amount: number }[];
      setSummary({
        totalBets: a.length,
        totalBet: a.reduce((s, r) => s + Number(r.stake || 0), 0),
        totalWin: a.reduce((s, r) => s + Number(r.win_amount || 0), 0),
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load distinct games/providers once
    (async () => {
      const { data } = await supabase.from("bets").select("game").limit(1000);
      const gs = Array.from(new Set((data ?? []).map((r) => r.game).filter(Boolean)));
      setGames(gs);
      setProviders(Array.from(new Set(gs.map(providerOf))));
    })();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const search = () => {
    setPage(1);
    setFilters(draft);
  };
  const reset = () => {
    const d: Filters = {
      from: todayIso(-6),
      to: todayIso(),
      playerId: "",
      username: "",
      provider: "all",
      game: "all",
      status: "all",
    };
    setDraft(d);
    setFilters(d);
    setPage(1);
  };

  const exportXlsx = async () => {
    toast.info("Preparing export…");
    const from = new Date(filters.from + "T00:00:00").toISOString();
    const to = new Date(filters.to + "T23:59:59").toISOString();
    let q = supabase
      .from("bets")
      .select("*")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(50000);
    if (filters.playerId.trim()) q = q.eq("player_id", filters.playerId.trim());
    if (filters.game !== "all") q = q.eq("game", filters.game);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    let list = (data ?? []) as BetRow[];
    if (filters.provider !== "all") list = list.filter((r) => providerOf(r.game) === filters.provider);
    if (filters.status !== "all") list = list.filter((r) => statusOf(r) === filters.status);

    const ids = Array.from(new Set(list.map((r) => r.player_id)));
    const { data: profs } = await supabase.from("profiles").select("id, nick").in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.nick as string]));

    const exportRows = list.map((r) => ({
      "Bet Time": new Date(r.created_at).toLocaleString(),
      Player: map.get(r.player_id) ?? r.player_id,
      "Player ID": r.player_id,
      Provider: providerOf(r.game),
      Game: r.game,
      "Round ID": r.id,
      "Bet Amount": r.stake,
      "Valid Bet": r.stake,
      "Win Amount": r.win_amount,
      "Net Result": Number(r.win_amount) - Number(r.stake),
      Status: statusOf(r),
      Device: "-",
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Game Records");
    XLSX.writeFile(wb, `game_records_${filters.from}_${filters.to}.xlsx`);
    toast.success(`Exported ${exportRows.length} records`);
  };

  const ggr = summary.totalBet - summary.totalWin;
  const payoutPct = summary.totalBet > 0 ? (summary.totalWin / summary.totalBet) * 100 : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = useMemo(() => {
    const arr: (number | "…")[] = [];
    const push = (n: number | "…") => arr.push(n);
    const window = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) push(i);
      else if (arr[arr.length - 1] !== "…") push("…");
    }
    return arr;
  }, [page, totalPages]);

  const inputCls =
    "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:ring-2 focus:ring-ring";
  const btnCls =
    "h-9 inline-flex items-center gap-1.5 rounded-md px-3 text-[13px] font-medium border border-input bg-background hover:bg-accent";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-info/10 text-info grid place-items-center">
          <Gamepad2 className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Game Record</h1>
          <p className="text-xs text-muted-foreground">Search, review and export player bet history</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-panel border border-panel-border rounded-lg shadow-sm p-3 md:p-4">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
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
            <label className="text-[11px] text-muted-foreground font-medium">Provider</label>
            <select
              className={inputCls}
              value={draft.provider}
              onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
            >
              <option value="all">All providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium">Game</label>
            <select
              className={inputCls}
              value={draft.game}
              onChange={(e) => setDraft({ ...draft, game: e.target.value })}
            >
              <option value="all">All games</option>
              {games.map((g) => (
                <option key={g} value={g}>
                  {g}
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
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
              <option value="Push">Push</option>
            </select>
          </div>
          <div className="min-w-0 flex items-end gap-2 flex-wrap">
            <button onClick={search} className={btnCls + " bg-info text-info-foreground border-info hover:bg-info/90"}>
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
          <table className="w-full text-[12.5px] min-w-[1100px]">
            <thead className="bg-muted/60 text-muted-foreground sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Bet Time</th>
                <th className="px-3 py-2 font-medium">Player</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Game</th>
                <th className="px-3 py-2 font-medium">Round ID</th>
                <th className="px-3 py-2 font-medium text-right">Bet Amount</th>
                <th className="px-3 py-2 font-medium text-right">Valid Bet</th>
                <th className="px-3 py-2 font-medium text-right">Win Amount</th>
                <th className="px-3 py-2 font-medium text-right">Net Result</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-muted-foreground">
                    No records found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const net = Number(r.win_amount) - Number(r.stake);
                  const st = statusOf(r);
                  return (
                    <tr
                      key={r.id}
                      className={
                        "border-t border-panel-border hover:bg-accent/40 " +
                        (i % 2 === 1 ? "bg-muted/20" : "")
                      }
                    >
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-medium">{r.nick || "—"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {r.player_id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{providerOf(r.game)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.game}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-[11.5px]">
                        {r.id.slice(0, 12)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">{fmt(r.stake)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">{fmt(r.stake)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">{fmt(r.win_amount)}</td>
                      <td
                        className={
                          "px-3 py-2 whitespace-nowrap text-right tabular-nums font-medium " +
                          (net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-muted-foreground")
                        }
                      >
                        {net > 0 ? "+" : ""}
                        {fmt(net)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={
                            "inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium " +
                            (st === "Won"
                              ? "bg-success/10 text-success"
                              : st === "Lost"
                              ? "bg-danger/10 text-danger"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {st}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <button
                          className="text-info hover:underline text-[12px]"
                          onClick={() => toast.info(`Round: ${r.id}`)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-panel-border px-3 py-2.5 bg-muted/30">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span>
              Total Bets: <b className="text-foreground tabular-nums">{summary.totalBets.toLocaleString()}</b>
            </span>
            <span className="opacity-40">│</span>
            <span>
              Total Bet: <b className="text-foreground tabular-nums">{fmt(summary.totalBet)}</b>
            </span>
            <span className="opacity-40">│</span>
            <span>
              Total Win: <b className="text-foreground tabular-nums">{fmt(summary.totalWin)}</b>
            </span>
            <span className="opacity-40">│</span>
            <span>
              Payout: <b className="text-foreground tabular-nums">{payoutPct.toFixed(2)}%</b>
            </span>
            <span className="opacity-40">│</span>
            <span>
              GGR:{" "}
              <b className={"tabular-nums " + (ggr >= 0 ? "text-success" : "text-danger")}>{fmt(ggr)}</b>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">
              Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {(page - 1) * PAGE_SIZE + rows.length} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 grid place-items-center rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers.map((n, i) =>
                n === "…" ? (
                  <span key={i} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setPage(n)}
                    className={
                      "h-7 min-w-7 px-2 rounded-md text-[12px] border " +
                      (n === page
                        ? "bg-info text-info-foreground border-info"
                        : "bg-background border-input hover:bg-accent")
                    }
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 grid place-items-center rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}