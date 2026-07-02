import { useState, type ReactNode } from "react";
import { X, Maximize2, Copy } from "lucide-react";
import type { Withdrawal, WithdrawalStatus } from "@/lib/mock-withdrawals";
import type { Player } from "@/lib/mock-players";

const statusColor: Record<WithdrawalStatus, string> = {
  Pending: "text-danger",
  Audited: "text-info",
  Reject: "text-danger",
  Freeze: "text-warning",
  "Paying Out": "text-info",
  Failed: "text-danger",
  Successful: "text-success",
};

type Cell = { label: string; value: ReactNode; full?: boolean };

function InfoTable({ rows }: { rows: Cell[] }) {
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < rows.length) {
    const a = rows[i];
    if (a.full) {
      out.push(
        <tr key={key++} className="border-t border-panel-border">
          <td className="w-[16%] px-3 py-2 bg-muted/40 text-foreground/70 align-top">{a.label}</td>
          <td className="px-3 py-2 align-top" colSpan={3}>{a.value ?? "-"}</td>
        </tr>,
      );
      i += 1;
      continue;
    }
    const b = rows[i + 1];
    out.push(
      <tr key={key++} className="border-t border-panel-border">
        <td className="w-[16%] px-3 py-2 bg-muted/40 text-foreground/70 align-top">{a.label}</td>
        <td className="w-[34%] px-3 py-2 align-top">{a.value ?? "-"}</td>
        {b ? (
          <>
            <td className="w-[16%] px-3 py-2 bg-muted/40 text-foreground/70 align-top">{b.label}</td>
            <td className="w-[34%] px-3 py-2 align-top">{b.value ?? "-"}</td>
          </>
        ) : (
          <>
            <td className="w-[16%] px-3 py-2 bg-muted/40" />
            <td className="w-[34%] px-3 py-2" />
          </>
        )}
      </tr>,
    );
    i += 2;
  }
  return (
    <table className="w-full text-[12.5px] border border-panel-border">
      <tbody>{out}</tbody>
    </table>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-[13px] font-medium mb-2">{children}</div>;
}

export function OrderDetailsModal({
  withdrawal,
  player,
  onClose,
  footer,
}: {
  withdrawal: Withdrawal;
  player?: Player;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const [tab, setTab] = useState<"other" | "payed" | "withdrawal">("other");
  const [expanded, setExpanded] = useState(false);

  const w = withdrawal;
  const p = player;

  const orderRows: Cell[] = [
    { label: "Order No.", value: w.orderNo },
    { label: "Create Time", value: w.createTime },
    { label: "Applly Amount", value: w.applyAmount ? w.applyAmount.toLocaleString() : "No" },
    { label: "Disbursement type", value: w.payoutMode },
    { label: "Fee", value: w.fee ? w.fee.toLocaleString() : "No" },
    { label: "Actual Amount", value: w.actualAmount ? w.actualAmount.toLocaleString() : "No" },
    { label: "KBZPay_Account", value: w.payoutMode === "KBZPay" ? w.accountNo : "-" },
    { label: "KBZPay_AccountName", value: w.payoutMode === "KBZPay" ? p?.nick ?? "-" : "-" },
    { label: "WavePay_Account", value: w.payoutMode === "WavePay" ? w.accountNo : w.accountNo },
    { label: "WavePay_AccountName", value: p?.nick ?? "-" },
  ];

  const winLossRatio =
    p && p.totalBets ? ((p.totalWin / p.totalBets) * 100).toFixed(2) + " x" : "0.00 x";

  const playerRows: Cell[] = [
    {
      label: "playerID",
      value: (
        <span className="inline-flex items-center gap-1 text-info">
          {w.playerID}
          <Copy className="w-3 h-3 cursor-pointer" onClick={() => navigator.clipboard?.writeText(w.playerID)} />
        </span>
      ),
    },
    {
      label: "Total Capital",
      value: `Coins Carried: ${p?.coins?.toLocaleString() ?? "NaN"} | Safe: ${p?.safeCoins?.toLocaleString() ?? "NaN"}`,
    },
    { label: "VIP level", value: p?.vip ?? "-" },
    { label: "Level", value: w.level },
    {
      label: "total bets",
      value: (
        <span>
          {p?.totalBets?.toLocaleString() ?? "NaN"} | (<span className="text-danger">{winLossRatio}</span>)
        </span>
      ),
    },
    { label: "Player Remarks", value: p?.remark || "-" },
    { label: "today win", value: p?.todayWin ? p.todayWin.toLocaleString() : "No" },
    { label: "total win", value: p?.totalWin ? p.totalWin.toLocaleString() : "No" },
    {
      label: "total payed",
      value: `amount: ${p?.totalPayed?.toLocaleString() ?? 0} | times: ${p?.totalPayedTimes ?? 0}`,
    },
    {
      label: "total withdrawal",
      value: `amount: ${p?.totalWithdrawal?.toLocaleString() ?? "NaN"} | times: ${p?.totalWithdrawTimes ?? 0}`,
    },
  ];

  const otherRows: Cell[] = [
    {
      label: "User IP",
      value: (
        <span>
          {p?.loginIp ?? p?.registerIp ?? "-"}{" "}
          <span className="text-info">({p?.loginCountry ?? p?.registerCountry ?? ""})</span>
        </span>
      ),
    },
    { label: "Device Code", value: p?.registerMac ?? "-" },
    { label: "Auditor", value: w.auditor || "" },
    { label: "Audit Date", value: w.auditor ? w.createTime : "" },
    { label: "Remarks", value: "auto audit fail:profit", full: true },
    { label: "Transferor", value: w.transferor || "" },
    { label: "Transfer Date", value: w.paymentTime || "" },
    { label: "Remarks", value: "", full: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={
          "bg-panel rounded-md border border-panel-border shadow-lg w-full " +
          (expanded ? "max-w-[95vw]" : "max-w-4xl")
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-panel-border bg-muted/40">
          <div className="text-[14px] font-medium">Order Details</div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Maximize2
              className="w-4 h-4 cursor-pointer hover:text-info"
              onClick={() => setExpanded((v) => !v)}
            />
            <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Order Information */}
          <div>
            <SectionTitle>
              Order Information <span className={"ml-2 " + statusColor[w.status]}>{w.status}</span>
            </SectionTitle>
            <InfoTable rows={orderRows} />
          </div>

          {/* Player Information */}
          <div>
            <SectionTitle>Player Information</SectionTitle>
            <InfoTable rows={playerRows} />
          </div>

          {/* Tabs */}
          <div>
            <div className="flex items-center gap-6 border-b border-panel-border text-[13px]">
              {[
                { k: "other", label: "Other Information" },
                { k: "payed", label: "Payed Records" },
                { k: "withdrawal", label: "Withdrawal Records" },
              ].map((tb) => {
                const active = tab === tb.k;
                return (
                  <button
                    key={tb.k}
                    onClick={() => setTab(tb.k as typeof tab)}
                    className={
                      "pb-2 -mb-px border-b-2 " +
                      (active
                        ? "border-info text-info"
                        : "border-transparent text-foreground/70 hover:text-info")
                    }
                  >
                    {tb.label}
                  </button>
                );
              })}
            </div>
            <div className="pt-3">
              {tab === "other" && <InfoTable rows={otherRows} />}
              {tab === "payed" && (
                <table className="w-full text-[12.5px] border border-panel-border">
                  <thead className="bg-muted/40">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                      <th>Order No.</th>
                      <th>Time</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Coins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(p?.payedRecords ?? []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No records</td></tr>
                    ) : (
                      p!.payedRecords!.map((r) => (
                        <tr key={r.orderNo} className="border-t border-panel-border">
                          <td className="px-3 py-2 text-info">{r.orderNo}</td>
                          <td className="px-3 py-2">{r.time}</td>
                          <td className="px-3 py-2 text-right">{r.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{r.coins.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              {tab === "withdrawal" && (
                <table className="w-full text-[12.5px] border border-panel-border">
                  <thead className="bg-muted/40">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                      <th>Order No.</th>
                      <th>Time</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Coins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(p?.withdrawalRecords ?? []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No records</td></tr>
                    ) : (
                      p!.withdrawalRecords!.map((r) => (
                        <tr key={r.orderNo} className="border-t border-panel-border">
                          <td className="px-3 py-2 text-info">{r.orderNo}</td>
                          <td className="px-3 py-2">{r.time}</td>
                          <td className="px-3 py-2 text-right">{r.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{r.coins.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-panel-border flex items-center justify-center gap-3">
          {footer}
          <button
            onClick={onClose}
            className="h-8 px-5 rounded-sm border border-panel-border bg-panel text-[12.5px] hover:bg-muted/40"
          >
            Return
          </button>
        </div>
      </div>
    </div>
  );
}
