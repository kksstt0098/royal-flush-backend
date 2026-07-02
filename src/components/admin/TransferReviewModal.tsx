import { useState } from "react";
import { X } from "lucide-react";
import type { Withdrawal } from "@/lib/mock-withdrawals";

export type ReviewAction = "approve" | "reject" | "risk";

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-panel rounded-md border border-panel-border shadow-lg w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-10 border-b border-panel-border bg-muted/40">
          <div className="text-[13px] font-medium">{title}</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onCancel} />
        </div>
        <div className="p-4 text-[12.5px]">{message}</div>
        <div className="px-4 py-3 border-t border-panel-border flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-sm border border-panel-border bg-panel text-[12.5px] hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={"h-8 px-4 rounded-sm text-[12.5px] " + confirmClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TransferReviewModal({
  withdrawal,
  onClose,
  onSubmit,
}: {
  withdrawal: Withdrawal;
  onClose: () => void;
  onSubmit: (action: ReviewAction, remark: string) => void;
}) {
  const [remark, setRemark] = useState("");
  const [confirm, setConfirm] = useState<ReviewAction | null>(null);

  const confirmMeta: Record<
    ReviewAction,
    { title: string; message: string; label: string; cls: string }
  > = {
    approve: {
      title: "Confirm Approval",
      message: `Approve withdrawal ${withdrawal.orderNo}? It will be sent to Withdrawal Payment.`,
      label: "Confirm Approve",
      cls: "bg-success text-success-foreground hover:bg-success/90",
    },
    reject: {
      title: "Confirm Reject",
      message: `Reject withdrawal ${withdrawal.orderNo}? The player will be notified via mailbox.`,
      label: "Confirm Reject",
      cls: "bg-danger text-danger-foreground hover:bg-danger/90",
    },
    risk: {
      title: "Confirm Risk Control",
      message: `Apply Risk Control on ${withdrawal.orderNo}? Funds will be frozen.`,
      label: "Confirm Risk Ctrl",
      cls: "bg-danger text-danger-foreground hover:bg-danger/90",
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-panel rounded-md border border-panel-border shadow-lg w-full max-w-md mt-24"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-panel-border bg-muted/40">
          <div className="text-[14px] font-medium">Transfer review</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <label className="text-[12.5px] text-foreground/80 pt-2 shrink-0">Remark:</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={6}
              className="flex-1 rounded-sm border border-panel-border bg-panel p-2 text-[12.5px] focus:outline-none focus:border-info resize-none"
              placeholder="Message sent to player's mailbox..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-panel-border flex items-center justify-center gap-3">
          <button
            onClick={() => setConfirm("approve")}
            className="h-8 px-5 rounded-sm bg-success text-success-foreground text-[12.5px] hover:bg-success/90"
          >
            Approved
          </button>
          <button
            onClick={() => setConfirm("reject")}
            className="h-8 px-5 rounded-sm bg-danger text-danger-foreground text-[12.5px] hover:bg-danger/90"
          >
            Reject
          </button>
          <button
            onClick={() => setConfirm("risk")}
            className="h-8 px-5 rounded-sm bg-warning text-warning-foreground text-[12.5px] hover:bg-warning/90"
          >
            Risk Ctrl
          </button>
          <button
            onClick={onClose}
            className="h-8 px-5 rounded-sm border border-panel-border bg-panel text-[12.5px] hover:bg-muted/40"
          >
            Return
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirmMeta[confirm].title}
          message={confirmMeta[confirm].message}
          confirmLabel={confirmMeta[confirm].label}
          confirmClass={confirmMeta[confirm].cls}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const action = confirm;
            setConfirm(null);
            onSubmit(action, remark);
          }}
        />
      )}
    </div>
  );
}