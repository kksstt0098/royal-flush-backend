import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { type Withdrawal } from "@/lib/mock-withdrawals";
import { useWithdrawals, updateWithdrawal, updateWithdrawals } from "@/lib/withdrawal-store";
import { sendMail } from "@/lib/mailbox-store";
import { mockPlayers } from "@/lib/mock-players";
import { Search, Download, Calendar, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { TransferReviewModal, type ReviewAction } from "./TransferReviewModal";

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
  payoutMode: string;
  accountNo: string;
  startAmount: string;
  endAmount: string;
  timeRefresh: string;
};

const emptyFilters: Filters = {
  createFrom: "2025-12-25T00:00",
  createTo: "2025-12-28T23:59",
  orderNo: "",
  playerID: "",
  payoutMode: "",
  accountNo: "",
  startAmount: "",
  endAmount: "",
  timeRefresh: "",
};

export function ReviewWithdrawalPage() {
  const { t } = useT();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const allRows = useWithdrawals();
  // Review page only shows brand-new Pending orders awaiting audit.
  const rows = useMemo(() => allRows.filter((w) => w.status === "Pending"), [allRows]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [detailTarget, setDetailTarget] = useState<Withdrawal | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Withdrawal | null>(null);

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const playerMap = useMemo(() => {
    const m = new Map<string, (typeof mockPlayers)[number]>();
    for (const p of mockPlayers) m.set(p.playerID, p);
    return m;
  }, []);

  const filtered = useMemo(() => {
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
      if (f.payoutMode && !w.payoutMode.toLowerCase().includes(f.payoutMode.toLowerCase()))
        return false;
      if (f.accountNo && !w.accountNo.includes(f.accountNo)) return false;
      if (w.applyAmount < min || w.applyAmount > max) return false;
      return true;
    });
  }, [rows, applied]);

  const totalApply = filtered.reduce((s, w) => s + w.applyAmount, 0);
  const totalActual = filtered.reduce((s, w) => s + w.actualAmount, 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.has(r.orderNo));
  const toggleAll = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allChecked) pageRows.forEach((r) => next.delete(r.orderNo));
      else pageRows.forEach((r) => next.add(r.orderNo));
      return next;
    });
  };
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
      "TotalRecharge",
      "RechargeTimes",
      "TotalWithdraw",
      "TotalWithdrawTimes",
      "ApplyAmount",
      "Fee",
      "ActualAmount",
      "Remark",
      "CreateTime",
    ];
    const lines = [headers.join(",")];
    for (const w of filtered) {
      const p = playerMap.get(w.playerID);
      lines.push(
        [
          w.orderNo,
          w.playerID,
          w.level,
          w.sourceUserId,
          w.channelCode,
          w.payoutMode,
          w.accountNo,
          p?.totalPayed ?? 0,
          p?.totalPayedTimes ?? 0,
          p?.totalWithdrawal ?? 0,
          p?.totalWithdrawTimes ?? 0,
          w.applyAmount,
          w.fee,
          w.actualAmount,
          p?.remark ?? "",
          w.createTime,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review_withdrawals_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const auditBulk = () => {
    if (selected.size === 0) {
      alert("Please select orders to audit");
      return;
    }
    updateWithdrawals((rs) =>
      rs.map((r) =>
        selected.has(r.orderNo) && r.status === "Pending"
          ? { ...r, status: "Audited", auditor: "Minmin" }
          : r,
      ),
    );
    setSelected(new Set());
  };

  const handleReview = (action: ReviewAction, remark: string) => {
    if (!reviewTarget) return;
    const w = reviewTarget;
    if (action === "approve") {
      updateWithdrawal(w.orderNo, { status: "Audited", auditor: "Minmin" });
      if (remark.trim()) {
        sendMail({
          playerID: w.playerID,
          subject: `Withdrawal ${w.orderNo} approved`,
          body: remark,
        });
      }
    } else if (action === "reject") {
      updateWithdrawal(w.orderNo, { status: "Reject", auditor: "Minmin" });
      sendMail({
        playerID: w.playerID,
        subject: `Withdrawal ${w.orderNo} rejected`,
        body: remark || "Your withdrawal request has been rejected.",
      });
    } else {
      // risk control — freeze funds
      updateWithdrawal(w.orderNo, {
        status: "Freeze",
        auditor: "Minmin",
        lockFlag: "locked",
        lockUser: "Minmin",
      });
      sendMail({
        playerID: w.playerID,
        subject: `Withdrawal ${w.orderNo} under risk review`,
        body: remark || "Your funds are temporarily held for a risk review.",
      });
    }
    setReviewTarget(null);
  };

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="bg-panel border border-panel-border rounded-sm p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-2">
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
              placeholder="Order No."
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
          <Field label={t("payoutMode")}>
            <input
              className={inputCls}
              placeholder="Payout Mode"
              value={filters.payoutMode}
              onChange={(e) => update("payoutMode", e.target.value)}
            />
          </Field>
          <Field label={t("accountNo")}>
            <input
              className={inputCls}
              placeholder="Account No."
              value={filters.accountNo}
              onChange={(e) => update("accountNo", e.target.value)}
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
          <Field label="Time Refresh">
            <select
              className={inputCls}
              value={filters.timeRefresh}
              onChange={(e) => update("timeRefresh", e.target.value)}
            >
              <option value="">{t("select")}</option>
              <option value="10">10s</option>
              <option value="30">30s</option>
              <option value="60">60s</option>
            </select>
          </Field>
          <div className="flex items-center gap-2 justify-end">
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
              {t("reset")}
            </button>
          </div>
        </div>
      </div>

      {/* Summary + actions */}
      <div className="flex items-center justify-between bg-panel border border-panel-border rounded-sm px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-6 text-[12.5px]">
          <span>
            Total Orders{" "}
            <span className="text-muted-foreground">
              【 <span className="text-danger">{filtered.length}</span> 】
            </span>
          </span>
          <span>
            Apply Amount{" "}
            <span className="text-muted-foreground">
              【 <span className="text-danger">{totalApply.toLocaleString()}</span> 】
            </span>
          </span>
          <span>
            Actual Amount{" "}
            <span className="text-muted-foreground">
              【 <span className="text-danger">{totalActual.toLocaleString()}</span> 】
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={auditBulk}
            className="h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px] flex items-center gap-1 hover:bg-danger/90"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            audit
          </button>
          <button
            onClick={doExport}
            className="h-8 px-3 rounded-sm bg-warning text-warning-foreground text-[12px] flex items-center gap-1 hover:bg-warning/90"
          >
            <Download className="w-3.5 h-3.5" />
            {t("export")}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-sm overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/50 text-foreground/70">
            <tr className="[&>th]:h-9 [&>th]:px-2 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th className="w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th>Order No.</th>
              <th>playerID</th>
              <th>Level</th>
              <th>Source userId</th>
              <th>Channel code</th>
              <th>Payout Mode</th>
              <th>Account No.</th>
              <th>Total Recharge</th>
              <th>Recharge Times</th>
              <th>total withdraw</th>
              <th>total withdraw times</th>
              <th>Apply Amount</th>
              <th>Fee</th>
              <th>Actual Amount</th>
              <th>Player Remarks</th>
              <th>Create Time</th>
              <th className="text-center">operate</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={18} className="text-center py-10 text-muted-foreground">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((w) => {
                const p = playerMap.get(w.playerID);
                return (
                  <tr
                    key={w.orderNo}
                    className="border-t border-panel-border hover:bg-muted/30 [&>td]:px-2 [&>td]:py-2 [&>td]:whitespace-nowrap"
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(w.orderNo)}
                        onChange={() => toggleOne(w.orderNo)}
                      />
                    </td>
                    <td>{w.orderNo}</td>
                    <td className="text-info">{w.playerID}</td>
                    <td>{w.level}</td>
                    <td className="text-info">{w.sourceUserId || "-"}</td>
                    <td>{w.channelCode}</td>
                    <td>{w.payoutMode}</td>
                    <td>{w.accountNo}</td>
                    <td>{(p?.totalPayed ?? 0).toLocaleString()}</td>
                    <td>{p?.totalPayedTimes ?? 0}</td>
                    <td>{(p?.totalWithdrawal ?? 0).toLocaleString()}</td>
                    <td>{p?.totalWithdrawTimes ?? 0}</td>
                    <td>{w.applyAmount.toLocaleString()}</td>
                    <td>{w.fee}</td>
                    <td>{w.actualAmount.toLocaleString()}</td>
                    <td className="text-muted-foreground">{p?.remark || "-"}</td>
                    <td>{w.createTime}</td>
                    <td>
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => {
                            setDetailTarget(w);
                          }}
                          className="text-info hover:underline"
                        >
                          details
                        </button>
                        <button
                          onClick={() => setReviewTarget(w)}
                          disabled={w.status !== "Pending"}
                          className="text-success hover:underline disabled:opacity-40"
                        >
                          audit
                        </button>
                        <button
                          onClick={() =>
                            updateWithdrawal(w.orderNo, {
                              lockFlag: w.lockFlag === "locked" ? "unlocked" : "locked",
                              lockUser: w.lockFlag === "locked" ? "" : "Minmin",
                            })
                          }
                          className="text-warning hover:underline"
                        >
                          {w.lockFlag === "locked" ? "Unlock" : "Lock"}
                        </button>
                      </div>
                    </td>
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
          {t("total")} {filtered.length}
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

      {/* Details modal (view only) */}
      {detailTarget && (
        <OrderDetailsModal
          withdrawal={detailTarget}
          player={playerMap.get(detailTarget.playerID)}
          onClose={() => setDetailTarget(null)}
          footer={
            detailTarget.status === "Pending" ? (
              <button
                onClick={() => {
                  const w = detailTarget;
                  setDetailTarget(null);
                  setReviewTarget(w);
                }}
                className="h-8 px-5 rounded-sm bg-info text-info-foreground text-[12.5px]"
              >
                Review
              </button>
            ) : null
          }
        />
      )}

      {/* Transfer review modal */}
      {reviewTarget && (
        <TransferReviewModal
          withdrawal={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleReview}
        />
      )}
    </div>
  );
}