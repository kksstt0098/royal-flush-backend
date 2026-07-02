import { useSyncExternalStore } from "react";
import { mockWithdrawals, type Withdrawal } from "./mock-withdrawals";

// Additional seed rows (previously local to WithdrawalPaymentPage) — audited
// entries ready for payment. Kept here so all three pages share one source
// of truth.
const extraSeed: Withdrawal[] = [
  {
    orderNo: "T25122717424588",
    playerID: "6223468",
    level: "NORMAL",
    sourceUserId: "5015968",
    channelCode: "1026",
    payoutMode: "KBZPay",
    accountNo: "09256644689",
    applyAmount: 10000,
    fee: 0,
    actualAmount: 10000,
    channel: "KBZPay",
    outTradeNo: "",
    status: "Audited",
    createTime: "2025-12-27 17:42",
    paymentTime: "",
    auditor: "Grey107",
    transferor: "",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T251227174014586",
    playerID: "16254788",
    level: "NORMAL",
    sourceUserId: "1000",
    channelCode: "1000",
    payoutMode: "KBZPay",
    accountNo: "09672122872",
    applyAmount: 4500,
    fee: 0,
    actualAmount: 4500,
    channel: "KBZPay",
    outTradeNo: "",
    status: "Audited",
    createTime: "2025-12-27 17:40",
    paymentTime: "",
    auditor: "Masha",
    transferor: "",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T2512271656314555",
    playerID: "7647648",
    level: "NORMAL",
    sourceUserId: "",
    channelCode: "",
    payoutMode: "Card",
    accountNo: "09897963582",
    applyAmount: 9500,
    fee: 0,
    actualAmount: 9500,
    channel: "Card",
    outTradeNo: "",
    status: "Audited",
    createTime: "2025-12-27 16:56",
    paymentTime: "",
    auditor: "Minminsoe",
    transferor: "",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
];

let state: Withdrawal[] = [...mockWithdrawals, ...extraSeed];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;

export function useWithdrawals() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function updateWithdrawal(orderNo: string, patch: Partial<Withdrawal>) {
  state = state.map((r) => (r.orderNo === orderNo ? { ...r, ...patch } : r));
  emit();
}

export function updateWithdrawals(fn: (rows: Withdrawal[]) => Withdrawal[]) {
  state = fn(state);
  emit();
}