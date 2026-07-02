import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import {
  Search,
  RotateCcw,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const inputCls =
  "w-full h-8 px-2 text-[12px] rounded-sm border border-panel-border bg-panel focus:outline-none focus:border-info placeholder:text-muted-foreground/60";

type HistoryRow = {
  id: string;
  order_no: string;
  player_id: string;
  amount: number;
  coins: number;
  channel: string;
  status: string;
  credit_type: string | null;
  remark: string | null;
  created_by_name: string | null;
  created_at: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="text-[12px] text-foreground/70 shrink-0 whitespace-nowrap">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Calendar className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="datetime-local"
        className={inputCls + " pl-7"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

type Filters = {
  createFrom: string;
  createTo: string;
  orderNo: string;
  playerID: string;
  creditType: string;
  startAmount: string;
  endAmount: string;
  remark: string;
};

const emptyFilters: Filters = {
  createFrom: "",
  createTo: "",
  orderNo: "",
  playerID: "",
  creditType: "",
  startAmount: "",
  endAmount: "",
  remark: "",
};

const tabDefs = [
  { key: "all", label: "total credits", match: (_r: HistoryRow) => true },
  { key: "Bonus", label: "Bonus", match: (r: HistoryRow) => r.credit_type === "Bonus" },
  { key: "Manual", label: "Manual Deposit", match: (r: HistoryRow) => r.credit_type === "Manual" },
];

type Mode = "single" | "bulk";
type CreditType = "Bonus" | "Manual";
type RowResult = {
  playerId: string;
  status: "success" | "error";
  message: string;
};

export function QuickRechargePage() {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>("single");
  const [creditType, setCreditType] = useState<CreditType>("Bonus");
  const [singleId, setSingleId] = useState("");
  const [bulkIds, setBulkIds] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);

  // History state
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("deposits")
        .select(
          "id,order_no,player_id,amount,coins,channel,status,credit_type,remark,created_by_name,created_at",
        )
        .in("credit_type", ["Bonus", "Manual"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) setHistory((data ?? []) as HistoryRow[]);
    };
    load();
    const ch = supabase
      .channel("deposits-quick-recharge")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  const updateF = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const f = applied;
    const from = f.createFrom ? new Date(f.createFrom).getTime() : 0;
    const to = f.createTo ? new Date(f.createTo).getTime() : Infinity;
    const min = f.startAmount ? Number(f.startAmount) : -Infinity;
    const max = f.endAmount ? Number(f.endAmount) : Infinity;
    return history.filter((d) => {
      const ct = new Date(d.created_at).getTime();
      if (ct < from || ct > to) return false;
      if (f.orderNo && !d.order_no.toLowerCase().includes(f.orderNo.toLowerCase())) return false;
      if (f.playerID && !d.player_id.includes(f.playerID)) return false;
      if (f.creditType && d.credit_type !== f.creditType) return false;
      if (f.remark && !(d.remark ?? "").toLowerCase().includes(f.remark.toLowerCase())) return false;
      if (Number(d.amount) < min || Number(d.amount) > max) return false;
      return true;
    });
  }, [history, applied]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tab of tabDefs) map[tab.key] = filtered.filter(tab.match).length;
    return map;
  }, [filtered]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, d) => s + Number(d.amount), 0),
    [filtered],
  );

  const currentTab = tabDefs.find((tab) => tab.key === activeTab)!;
  const visible = filtered.filter(currentTab.match);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);

  const doSearch = () => {
    setApplied(filters);
    setPage(1);
  };
  const doReset = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };
  const doExport = () => {
    const headers = [
      "OrderNo",
      "playerID",
      "CreditType",
      "Amount",
      "Coins",
      "Remark",
      "CreatedBy",
      "CreateTime",
    ];
    const lines = [headers.join(",")];
    for (const d of visible) {
      lines.push(
        [
          d.order_no,
          d.player_id,
          d.credit_type ?? "",
          d.amount,
          d.coins,
          d.remark ?? "",
          d.created_by_name ?? "",
          d.created_at,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quick_recharge_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsedIds = useMemo(() => {
    if (mode === "single") {
      const id = singleId.trim();
      return id ? [id] : [];
    }
    return Array.from(
      new Set(
        bulkIds
          .split(/[\s,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
  }, [mode, singleId, bulkIds]);

  const amountNum = Number(amount);
  const canSubmit =
    !submitting &&
    parsedIds.length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  const submit = async () => {
    if (!canSubmit) return;
    if (
      !confirm(
        `Credit ${amountNum} (${creditType}) to ${parsedIds.length} player(s)?`,
      )
    )
      return;
    setSubmitting(true);
    setResults([]);
    const out: RowResult[] = [];
    for (const pid of parsedIds) {
      const { error } = await supabase.rpc("admin_credit_player", {
        _player_id: pid,
        _amount: amountNum,
        _credit_type: creditType,
        _remark: remark || "",
      });
      out.push({
        playerId: pid,
        status: error ? "error" : "success",
        message: error ? error.message : "OK",
      });
      setResults([...out]);
    }
    setSubmitting(false);
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.length - successCount;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-panel border border-panel-border rounded-md p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t("quickRecharge")}</h2>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["single", "bulk"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`h-8 px-3 rounded-sm text-xs border ${
                mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent"
              }`}
            >
              {m === "single" ? "Single Player" : "Bulk Players"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player IDs */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {mode === "single" ? "Player ID (UUID)" : "Player IDs (one per line, or comma/space separated)"}
            </label>
            {mode === "single" ? (
              <input
                value={singleId}
                onChange={(e) => setSingleId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
              />
            ) : (
              <textarea
                value={bulkIds}
                onChange={(e) => setBulkIds(e.target.value)}
                rows={6}
                placeholder={"uuid-1\nuuid-2\nuuid-3"}
                className="w-full px-2 py-2 rounded-sm border border-input bg-background text-sm font-mono"
              />
            )}
            <div className="text-xs text-muted-foreground">
              {parsedIds.length} player(s) parsed
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Credit Type</label>
              <div className="flex gap-2 mt-1">
                {(["Bonus", "Manual"] as CreditType[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCreditType(c)}
                    className={`h-8 px-3 rounded-sm text-xs border ${
                      creditType === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {c === "Bonus" ? "Bonus" : "Manual Deposit"}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {creditType === "Bonus"
                  ? "Adds coins only; does not affect total paid stats."
                  : "Adds coins and counts toward total paid amount."}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
              />
              {parsedIds.length > 1 && amountNum > 0 && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Each player receives {amountNum}. Total ={" "}
                  {(amountNum * parsedIds.length).toLocaleString()}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground">{t("remark")}</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Optional note"
                className="w-full px-2 py-2 rounded-sm border border-input bg-background text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-panel-border">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Processing…" : "Credit Players"}
          </button>
          <button
            onClick={() => {
              setSingleId("");
              setBulkIds("");
              setAmount("");
              setRemark("");
              setResults([]);
            }}
            className="h-9 px-4 rounded-sm border border-input bg-background text-sm hover:bg-accent"
          >
            Reset
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-panel border border-panel-border rounded-md">
          <div className="px-4 py-2 border-b border-panel-border flex items-center gap-4 text-xs">
            <span className="font-semibold">Results</span>
            <span className="text-green-600">Success: {successCount}</span>
            <span className="text-red-600">Failed: {errorCount}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">Player ID</th>
                  <th className="px-3 py-2 w-24">Status</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-panel-border">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-mono">{r.playerId}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.status === "success"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {r.status === "success" ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History with filters */}
      <div className="bg-panel border border-panel-border rounded-sm p-3">
        <div className="text-sm font-semibold mb-3">Credit History</div>
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-x-3 gap-y-2">
          <Field label={t("createTimeShort")}>
            <div className="flex items-center gap-1">
              <DateInput value={filters.createFrom} onChange={(v) => updateF("createFrom", v)} />
              <span className="text-[12px] text-muted-foreground">{t("to")}</span>
              <DateInput value={filters.createTo} onChange={(v) => updateF("createTo", v)} />
            </div>
          </Field>
          <Field label={t("orderNo")}>
            <input
              className={inputCls}
              placeholder="OrderNo"
              value={filters.orderNo}
              onChange={(e) => updateF("orderNo", e.target.value)}
            />
          </Field>
          <Field label={t("playerID")}>
            <input
              className={inputCls}
              placeholder="playerID"
              value={filters.playerID}
              onChange={(e) => updateF("playerID", e.target.value)}
            />
          </Field>
          <Field label="Credit Type">
            <select
              className={inputCls}
              value={filters.creditType}
              onChange={(e) => updateF("creditType", e.target.value)}
            >
              <option value="">{t("all")}</option>
              <option value="Bonus">Bonus</option>
              <option value="Manual">Manual Deposit</option>
            </select>
          </Field>
          <Field label={t("startAmount")}>
            <input
              className={inputCls}
              placeholder="Start Amount"
              value={filters.startAmount}
              onChange={(e) => updateF("startAmount", e.target.value)}
            />
          </Field>
          <Field label={t("endAmount")}>
            <input
              className={inputCls}
              placeholder="End Amount"
              value={filters.endAmount}
              onChange={(e) => updateF("endAmount", e.target.value)}
            />
          </Field>
          <Field label={t("remark")}>
            <input
              className={inputCls}
              placeholder="Remark contains…"
              value={filters.remark}
              onChange={(e) => updateF("remark", e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2 col-span-1 md:col-span-3 xl:col-span-5 justify-end">
            <button
              onClick={doSearch}
              className="h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] flex items-center gap-1 hover:bg-info/90"
            >
              <Search className="w-3.5 h-3.5" />
              {t("search")}
            </button>
            <button
              onClick={doReset}
              className="h-8 px-3 rounded-sm bg-warning text-warning-foreground text-[12px] flex items-center gap-1 hover:bg-warning/90"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("reset")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-panel border border-panel-border rounded-sm px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          {tabDefs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={
                  "flex items-center gap-1 " +
                  (active ? "text-info font-medium" : "text-foreground/80 hover:text-info")
                }
              >
                <span>{tab.label}</span>
                <span className="text-muted-foreground">
                  【 <span className="text-danger">{counts[tab.key] ?? 0}</span> 】
                </span>
              </button>
            );
          })}
          <span className="flex items-center gap-1 text-foreground/80">
            <span>Total Amount</span>
            <span className="text-muted-foreground">
              【 <span className="text-danger">{totalAmount.toLocaleString()}</span> 】
            </span>
          </span>
        </div>
        <button
          onClick={doExport}
          className="h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px] flex items-center gap-1 hover:bg-danger/90"
        >
          <Download className="w-3.5 h-3.5" />
          {t("export")}
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-sm overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/50 text-foreground/70">
            <tr className="[&>th]:h-9 [&>th]:px-2 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th>OrderNo.</th>
              <th>playerID</th>
              <th>Credit Type</th>
              <th>Amount</th>
              <th>Coins</th>
              <th>Remark</th>
              <th>Created By</th>
              <th>Create Time</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-panel-border hover:bg-muted/30 [&>td]:px-2 [&>td]:py-2 [&>td]:whitespace-nowrap"
                >
                  <td className="text-info">{d.order_no}</td>
                  <td className="text-info">{d.player_id}</td>
                  <td>
                    <span
                      className={
                        "inline-block px-2 py-0.5 rounded text-[11.5px] " +
                        (d.credit_type === "Bonus"
                          ? "bg-info/15 text-info"
                          : "bg-success/15 text-success")
                      }
                    >
                      {d.credit_type === "Manual" ? "Manual Deposit" : d.credit_type}
                    </span>
                  </td>
                  <td>{Number(d.amount).toLocaleString()}</td>
                  <td>{Number(d.coins).toLocaleString()}</td>
                  <td className="max-w-[240px] truncate" title={d.remark ?? ""}>
                    {d.remark ?? ""}
                  </td>
                  <td>{d.created_by_name ?? ""}</td>
                  <td>{new Date(d.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 text-[12px] px-3 py-2">
        <span className="text-muted-foreground">
          {t("total")} {visible.length}
        </span>
        <span className="border border-panel-border rounded-sm px-2 h-7 flex items-center">
          {pageSize}
          {t("perPage")}
        </span>
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="w-7 h-7 border border-panel-border rounded-sm flex items-center justify-center disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="w-7 h-7 rounded-sm bg-info text-info-foreground flex items-center justify-center">
          {page}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="w-7 h-7 border border-panel-border rounded-sm flex items-center justify-center disabled:opacity-40"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}