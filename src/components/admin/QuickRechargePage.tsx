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
    </div>
  );
}