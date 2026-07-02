import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { mockWithdrawals, type Withdrawal, type WithdrawalStatus } from "@/lib/mock-withdrawals";
import {
  Search,
  RotateCcw,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const inputCls =
  "w-full h-8 px-2 text-[12px] rounded-sm border border-panel-border bg-panel focus:outline-none focus:border-info placeholder:text-muted-foreground/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="text-[12px] text-foreground/70 shrink-0 whitespace-nowrap">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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
  sourceUserId: string;
  level: string;
  payed: string;
  payoutMode: string;
  accountNo: string;
  channelCode: string;
  channel: string;
  firstWithdrawal: string;
  status: string;
  transferor: string;
  startAmount: string;
  endAmount: string;
  lockFlag: string;
};

const emptyFilters: Filters = {
  createFrom: "2025-12-28T00:00",
  createTo: "2025-12-28T23:59",
  orderNo: "",
  playerID: "",
  sourceUserId: "",
  level: "",
  payed: "",
  payoutMode: "",
  accountNo: "",
  channelCode: "",
  channel: "",
  firstWithdrawal: "",
  status: "",
  transferor: "",
  startAmount: "",
  endAmount: "",
  lockFlag: "",
};

const statusStyles: Record<WithdrawalStatus, string> = {
  Pending: "bg-muted text-foreground/70",
  Audited: "bg-info/10 text-info",
  Reject: "bg-danger/10 text-danger",
  Freeze: "bg-warning/10 text-warning",
  "Paying Out": "bg-info/15 text-info",
  Failed: "bg-danger/10 text-danger",
  Successful: "bg-success/15 text-success",
};

const tabDefs: { key: string; label: string; match: (w: Withdrawal) => boolean }[] = [
  { key: "all", label: "total orders", match: () => true },
  { key: "Pending", label: "Pending", match: (w) => w.status === "Pending" },
  { key: "Audited", label: "Audited", match: (w) => w.status === "Audited" },
  { key: "Reject", label: "Reject", match: (w) => w.status === "Reject" },
  { key: "Freeze", label: "Freeze", match: (w) => w.status === "Freeze" },
  { key: "Paying Out", label: "Paying Out", match: (w) => w.status === "Paying Out" },
  { key: "Failed", label: "Failed", match: (w) => w.status === "Failed" },
  { key: "Successful", label: "Successful Orders", match: (w) => w.status === "Successful" },
];

export function WithdrawalOrderPage() {
  const { t } = useT();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [rows, setRows] = useState<Withdrawal[]>(mockWithdrawals);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [detail, setDetail] = useState<Withdrawal | null>(null);

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const filteredByForm = useMemo(() => {
    const f = applied;
    const from = f.createFrom ? new Date(f.createFrom).getTime() : 0;
    const to = f.createTo ? new Date(f.createTo).getTime() : Infinity;
    const min = f.startAmount ? Number(f.startAmount) : -Infinity;
    const max = f.endAmount ? Number(f.endAmount) : Infinity;
    return rows.filter((w) => {
      const ct = new Date(w.createTime).getTime();
      if (ct < from || ct > to) return false;
      if (f.orderNo && !w.orderNo.toLowerCase().includes(f.orderNo.toLowerCase())) return false;
      if (f.playerID && !w.playerID.includes(f.playerID)) return false;
      if (f.sourceUserId && !w.sourceUserId.includes(f.sourceUserId)) return false;
      if (f.level && w.level !== f.level) return false;
      if (f.payoutMode && !w.payoutMode.toLowerCase().includes(f.payoutMode.toLowerCase()))
        return false;
      if (f.accountNo && !w.accountNo.includes(f.accountNo)) return false;
      if (f.channelCode && !w.channelCode.includes(f.channelCode)) return false;
      if (f.channel && !w.channel.toLowerCase().includes(f.channel.toLowerCase())) return false;
      if (f.firstWithdrawal === "yes" && !w.firstWithdrawal) return false;
      if (f.firstWithdrawal === "no" && w.firstWithdrawal) return false;
      if (f.status && w.status !== (f.status as WithdrawalStatus)) return false;
      if (f.transferor && !w.transferor.toLowerCase().includes(f.transferor.toLowerCase()))
        return false;
      if (f.lockFlag && w.lockFlag !== f.lockFlag) return false;
      if (w.applyAmount < min || w.applyAmount > max) return false;
      return true;
    });
  }, [rows, applied]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tabDefs) map[t.key] = filteredByForm.filter(t.match).length;
    return map;
  }, [filteredByForm]);

  const successfulAmount = useMemo(
    () =>
      filteredByForm
        .filter((w) => w.status === "Successful")
        .reduce((s, w) => s + w.applyAmount, 0),
    [filteredByForm],
  );
  const successfulActual = useMemo(
    () =>
      filteredByForm
        .filter((w) => w.status === "Successful")
        .reduce((s, w) => s + w.actualAmount, 0),
    [filteredByForm],
  );

  const currentTab = tabDefs.find((t) => t.key === activeTab)!;
  const visible = filteredByForm.filter(currentTab.match);
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
      "Level",
      "SourceUserId",
      "ChannelCode",
      "PayoutMode",
      "AccountNo",
      "ApplyAmount",
      "Fee",
      "ActualAmount",
      "Channel",
      "OutTradeNo",
      "Status",
      "CreateTime",
      "PaymentTime",
      "Auditor",
      "Transferor",
      "LockUser",
      "NotifyTime",
    ];
    const lines = [headers.join(",")];
    for (const w of visible) {
      lines.push(
        [
          w.orderNo,
          w.playerID,
          w.level,
          w.sourceUserId,
          w.channelCode,
          w.payoutMode,
          w.accountNo,
          w.applyAmount,
          w.fee,
          w.actualAmount,
          w.channel,
          w.outTradeNo,
          w.status,
          w.createTime,
          w.paymentTime,
          w.auditor,
          w.transferor,
          w.lockUser,
          w.notifyTime,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `withdrawal_orders_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateRow = (orderNo: string, patch: Partial<Withdrawal>) =>
    setRows((rs) => rs.map((r) => (r.orderNo === orderNo ? { ...r, ...patch } : r)));

  const levels = useMemo(() => Array.from(new Set(mockWithdrawals.map((w) => w.level))), []);
  const payoutModes = useMemo(
    () => Array.from(new Set(mockWithdrawals.map((w) => w.payoutMode))),
    [],
  );

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
          <Field label={t("sourceUserId")}>
            <input
              className={inputCls}
              placeholder="Source userId"
              value={filters.sourceUserId}
              onChange={(e) => update("sourceUserId", e.target.value)}
            />
          </Field>
          <Field label={t("level")}>
            <select
              className={inputCls}
              value={filters.level}
              onChange={(e) => update("level", e.target.value)}
            >
              <option value="">{t("select")}</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("payed")}>
            <select
              className={inputCls}
              value={filters.firstWithdrawal}
              onChange={(e) => update("firstWithdrawal", e.target.value)}
            >
              <option value="">{t("select")}</option>
              <option value="yes">{t("yes")}</option>
              <option value="no">{t("no")}</option>
            </select>
          </Field>
          <Field label={t("payoutMode")}>
            <select
              className={inputCls}
              value={filters.payoutMode}
              onChange={(e) => update("payoutMode", e.target.value)}
            >
              <option value="">Payout Mode</option>
              {payoutModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("accountNo")}>
            <input
              className={inputCls}
              placeholder="Account No."
              value={filters.accountNo}
              onChange={(e) => update("accountNo", e.target.value)}
            />
          </Field>
          <Field label={t("channelCode")}>
            <input
              className={inputCls}
              placeholder="Channel Code"
              value={filters.channelCode}
              onChange={(e) => update("channelCode", e.target.value)}
            />
          </Field>
          <Field label={t("channel")}>
            <select
              className={inputCls}
              value={filters.channel}
              onChange={(e) => update("channel", e.target.value)}
            >
              <option value="">Channel</option>
              {payoutModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("firstWithdrawal")}>
            <select
              className={inputCls}
              value={filters.firstWithdrawal}
              onChange={(e) => update("firstWithdrawal", e.target.value)}
            >
              <option value="">{t("all")}</option>
              <option value="yes">{t("yes")}</option>
              <option value="no">{t("no")}</option>
            </select>
          </Field>
          <Field label={t("status")}>
            <select
              className={inputCls}
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="">{t("all")}</option>
              <option value="Pending">Pending</option>
              <option value="Audited">Audited</option>
              <option value="Reject">Reject</option>
              <option value="Freeze">Freeze</option>
              <option value="Paying Out">Paying Out</option>
              <option value="Failed">Failed</option>
              <option value="Successful">Successful</option>
            </select>
          </Field>
          <Field label={t("transferor")}>
            <input
              className={inputCls}
              placeholder="Transferor"
              value={filters.transferor}
              onChange={(e) => update("transferor", e.target.value)}
            />
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
          <Field label={t("lockFlag")}>
            <select
              className={inputCls}
              value={filters.lockFlag}
              onChange={(e) => update("lockFlag", e.target.value)}
            >
              <option value="">{t("select")}</option>
              <option value="locked">{t("locked")}</option>
              <option value="unlocked">{t("unlocked")}</option>
            </select>
          </Field>
          <div className="flex items-center gap-2 col-span-1 md:col-span-2 xl:col-span-2 justify-end">
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

      {/* Status tabs + export */}
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
            <span>Successful Amount</span>
            <span className="text-muted-foreground">
              【 <span className="text-danger">{successfulAmount.toLocaleString()}</span> 】
            </span>
          </span>
          <span className="flex items-center gap-1 text-foreground/80">
            <span>Actual Amount</span>
            <span className="text-muted-foreground">
              【 <span className="text-danger">{successfulActual.toLocaleString()}</span> 】
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
              <th>Level</th>
              <th>Source userId</th>
              <th>Channel code</th>
              <th>Payout Mode</th>
              <th>Account No.</th>
              <th>Apply Amount</th>
              <th>Fee</th>
              <th>Actual Amount</th>
              <th>Channel</th>
              <th>OutTradeNo</th>
              <th>Status</th>
              <th>Create Time</th>
              <th>Payment Time</th>
              <th>Auditor</th>
              <th>Transferor</th>
              <th>lock user</th>
              <th>Notify time</th>
              <th className="text-center">operate</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={20} className="text-center py-10 text-muted-foreground">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((w) => (
                <tr
                  key={w.orderNo}
                  className="border-t border-panel-border hover:bg-muted/30 [&>td]:px-2 [&>td]:py-2 [&>td]:whitespace-nowrap"
                >
                  <td className="text-info">{w.orderNo}</td>
                  <td className="text-info">{w.playerID}</td>
                  <td>{w.level}</td>
                  <td>{w.sourceUserId}</td>
                  <td>{w.channelCode}</td>
                  <td>{w.payoutMode}</td>
                  <td>{w.accountNo}</td>
                  <td>{w.applyAmount.toLocaleString()}</td>
                  <td>{w.fee}</td>
                  <td>{w.actualAmount.toLocaleString()}</td>
                  <td>{w.channel}</td>
                  <td>{w.outTradeNo}</td>
                  <td>
                    <span
                      className={
                        "inline-block px-2 py-0.5 rounded text-[11.5px] " + statusStyles[w.status]
                      }
                    >
                      {w.status}
                    </span>
                  </td>
                  <td>{w.createTime}</td>
                  <td>{w.paymentTime}</td>
                  <td>{w.auditor}</td>
                  <td>{w.transferor}</td>
                  <td>{w.lockUser}</td>
                  <td>{w.notifyTime}</td>
                  <td>
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => setDetail(w)}
                        className="text-info hover:underline"
                      >
                        details
                      </button>
                      <button
                        onClick={() =>
                          updateRow(w.orderNo, {
                            lockFlag: w.lockFlag === "locked" ? "unlocked" : "locked",
                            lockUser: w.lockFlag === "locked" ? "" : "Minmin",
                          })
                        }
                        className="text-warning hover:underline"
                      >
                        {w.lockFlag === "locked" ? "unlock" : "lock"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
        <span className="text-muted-foreground">{t("goTo")}</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={page}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) setPage(Math.min(totalPages, Math.max(1, n)));
          }}
          className="w-12 h-7 text-center border border-panel-border rounded-sm"
        />
      </div>

      {/* Details modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-panel rounded-md w-full max-w-3xl border border-panel-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-11 border-b border-panel-border">
              <div className="text-[14px] font-medium">{t("withdrawalOrderDetails")}</div>
              <button
                onClick={() => setDetail(null)}
                className="text-muted-foreground hover:text-danger"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
              {[
                ["OrderNo.", detail.orderNo],
                ["playerID", detail.playerID],
                ["Level", detail.level],
                ["Source userId", detail.sourceUserId || "-"],
                ["Channel code", detail.channelCode],
                ["Payout Mode", detail.payoutMode],
                ["Account No.", detail.accountNo],
                ["Apply Amount", detail.applyAmount.toLocaleString()],
                ["Fee", detail.fee.toLocaleString()],
                ["Actual Amount", detail.actualAmount.toLocaleString()],
                ["Channel", detail.channel || "-"],
                ["OutTradeNo", detail.outTradeNo || "-"],
                ["Status", detail.status],
                ["Create Time", detail.createTime],
                ["Payment Time", detail.paymentTime || "-"],
                ["Auditor", detail.auditor || "-"],
                ["Transferor", detail.transferor || "-"],
                ["Lock User", detail.lockUser || "-"],
                ["Notify time", detail.notifyTime || "-"],
                ["First Withdrawal", detail.firstWithdrawal ? "Yes" : "No"],
                ["Lock Flag", detail.lockFlag],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex gap-2">
                  <span className="text-muted-foreground w-32 shrink-0">{k}</span>
                  <span className="text-foreground/90 break-all">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-panel-border flex items-center justify-end gap-2">
              {detail.status === "Pending" && (
                <>
                  <button
                    onClick={() => {
                      updateRow(detail.orderNo, { status: "Audited", auditor: "Minmin" });
                      setDetail({ ...detail, status: "Audited", auditor: "Minmin" });
                    }}
                    className="h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      updateRow(detail.orderNo, { status: "Reject", auditor: "Minmin" });
                      setDetail({ ...detail, status: "Reject", auditor: "Minmin" });
                    }}
                    className="h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px]"
                  >
                    Reject
                  </button>
                </>
              )}
              {(detail.status === "Audited" || detail.status === "Paying Out") && (
                <>
                  <button
                    onClick={() => {
                      const now = new Date().toISOString().slice(0, 16).replace("T", " ");
                      updateRow(detail.orderNo, {
                        status: "Successful",
                        paymentTime: now,
                        notifyTime: now,
                      });
                      setDetail({
                        ...detail,
                        status: "Successful",
                        paymentTime: now,
                        notifyTime: now,
                      });
                    }}
                    className="h-8 px-3 rounded-sm bg-success text-success-foreground text-[12px]"
                  >
                    Mark Paid
                  </button>
                  <button
                    onClick={() => {
                      updateRow(detail.orderNo, { status: "Failed" });
                      setDetail({ ...detail, status: "Failed" });
                    }}
                    className="h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px]"
                  >
                    Mark Failed
                  </button>
                </>
              )}
              <button
                onClick={() => setDetail(null)}
                className="h-8 px-3 rounded-sm border border-panel-border text-[12px]"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}