import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
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

type Row = {
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
  { key: "all", label: "total entries", match: (_r: Row) => true },
  { key: "Manual", label: "Add", match: (r: Row) => r.credit_type === "Manual" },
  { key: "Bonus", label: "Bonus", match: (r: Row) => r.credit_type === "Bonus" },
  { key: "Debit", label: "Subtract", match: (r: Row) => r.credit_type === "Debit" },
];

export function OfflineRechargePage() {
  const { t } = useT();
  const [rows, setRows] = useState<Row[]>([]);
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
        .in("credit_type", ["Bonus", "Manual", "Debit"])
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!cancelled) setRows((data ?? []) as Row[]);
    };
    load();
    const ch = supabase
      .channel("deposits-offline-recharge")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const f = applied;
    const from = f.createFrom ? new Date(f.createFrom).getTime() : 0;
    const to = f.createTo ? new Date(f.createTo).getTime() : Infinity;
    const min = f.startAmount ? Number(f.startAmount) : -Infinity;
    const max = f.endAmount ? Number(f.endAmount) : Infinity;
    return rows.filter((d) => {
      const ct = new Date(d.created_at).getTime();
      if (ct < from || ct > to) return false;
      if (f.orderNo && !d.order_no.toLowerCase().includes(f.orderNo.toLowerCase())) return false;
      if (f.playerID && !d.player_id.includes(f.playerID)) return false;
      if (f.creditType && d.credit_type !== f.creditType) return false;
      if (f.remark && !(d.remark ?? "").toLowerCase().includes(f.remark.toLowerCase())) return false;
      const amt = Number(d.amount);
      if (amt < min || amt > max) return false;
      return true;
    });
  }, [rows, applied]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tab of tabDefs) map[tab.key] = filtered.filter(tab.match).length;
    return map;
  }, [filtered]);

  const netAmount = useMemo(
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
    a.download = `offline_recharge_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabel = (c: string | null) =>
    c === "Manual" ? "Add" : c === "Debit" ? "Subtract" : c ?? "";
  const typeCls = (c: string | null) =>
    c === "Debit"
      ? "bg-danger/10 text-danger"
      : c === "Bonus"
        ? "bg-info/15 text-info"
        : "bg-success/15 text-success";

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="bg-panel border border-panel-border rounded-sm p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-x-3 gap-y-2">
          <Field label={t("createTimeShort")}>
            <div className="flex items-center gap-1">
              <DateInput value={filters.createFrom} onChange={(v) => update("createFrom", v)} />
              <span className="text-[12px] text-muted-foreground">{t("to")}</span>
              <DateInput value={filters.createTo} onChange={(v) => update("createTo", v)} />
            </div>
          </Field>
          <Field label={t("orderNo")}>
            <input
              className={inputCls}
              placeholder="OrderNo"
              value={filters.orderNo}
              onChange={(e) => update("orderNo", e.target.value)}
            />
          </Field>
          <Field label={t("playerID")}>
            <input
              className={inputCls}
              placeholder="playerID"
              value={filters.playerID}
              onChange={(e) => update("playerID", e.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={filters.creditType}
              onChange={(e) => update("creditType", e.target.value)}
            >
              <option value="">{t("all")}</option>
              <option value="Manual">Add</option>
              <option value="Bonus">Bonus</option>
              <option value="Debit">Subtract</option>
            </select>
          </Field>
          <Field label={t("startAmount")}>
            <input
              className={inputCls}
              placeholder="Start Amount"
              value={filters.startAmount}
              onChange={(e) => update("startAmount", e.target.value)}
            />
          </Field>
          <Field label={t("endAmount")}>
            <input
              className={inputCls}
              placeholder="End Amount"
              value={filters.endAmount}
              onChange={(e) => update("endAmount", e.target.value)}
            />
          </Field>
          <Field label={t("remark")}>
            <input
              className={inputCls}
              placeholder="Remark contains…"
              value={filters.remark}
              onChange={(e) => update("remark", e.target.value)}
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

      {/* Tabs + export */}
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
            <span>Net Amount</span>
            <span className="text-muted-foreground">
              【 <span className="text-danger">{netAmount.toLocaleString()}</span> 】
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

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-sm overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/50 text-foreground/70">
            <tr className="[&>th]:h-9 [&>th]:px-2 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th>OrderNo.</th>
              <th>playerID</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Remark</th>
              <th>Created By</th>
              <th>Create Time</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((d) => {
                const amt = Number(d.amount);
                return (
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
                          typeCls(d.credit_type)
                        }
                      >
                        {typeLabel(d.credit_type)}
                      </span>
                    </td>
                    <td className={amt < 0 ? "text-danger" : "text-success"}>
                      {amt > 0 ? "+" : ""}
                      {amt.toLocaleString()}
                    </td>
                    <td className="max-w-[240px] truncate" title={d.remark ?? ""}>
                      {d.remark ?? ""}
                    </td>
                    <td>{d.created_by_name ?? ""}</td>
                    <td>{new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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