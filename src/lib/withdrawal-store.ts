import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Withdrawal } from "./mock-withdrawals";

type Row = {
  id: string;
  order_no: string;
  player_id: string;
  level: string;
  source_user_id: string | null;
  channel_code: string | null;
  payout_mode: string;
  account_no: string;
  apply_amount: number;
  fee: number;
  actual_amount: number;
  channel: string | null;
  out_trade_no: string | null;
  status: Withdrawal["status"];
  created_at: string;
  payment_time: string | null;
  auditor_name: string | null;
  transferor_name: string | null;
  lock_user_name: string | null;
  notify_time: string | null;
  first_withdrawal: boolean;
  lock_flag: "locked" | "unlocked";
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") : "";

const mapRow = (r: Row): Withdrawal => ({
  orderNo: r.order_no,
  playerID: r.player_id,
  level: r.level ?? "NORMAL",
  sourceUserId: r.source_user_id ?? "",
  channelCode: r.channel_code ?? "",
  payoutMode: r.payout_mode,
  accountNo: r.account_no,
  applyAmount: Number(r.apply_amount),
  fee: Number(r.fee),
  actualAmount: Number(r.actual_amount),
  channel: r.channel ?? "",
  outTradeNo: r.out_trade_no ?? "",
  status: r.status,
  createTime: fmt(r.created_at),
  paymentTime: fmt(r.payment_time),
  auditor: r.auditor_name ?? "",
  transferor: r.transferor_name ?? "",
  lockUser: r.lock_user_name ?? "",
  notifyTime: fmt(r.notify_time),
  firstWithdrawal: r.first_withdrawal,
  lockFlag: r.lock_flag,
});

let cache: Withdrawal[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function fetchAll() {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[withdrawals]", error);
    return;
  }
  cache = (data as Row[]).map(mapRow);
  loaded = true;
  emit();
}

let channel: ReturnType<typeof supabase.channel> | null = null;
function ensureSubscription() {
  if (channel) return;
  channel = supabase
    .channel("withdrawals-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "withdrawals" },
      () => {
        void fetchAll();
      },
    )
    .subscribe();
}

export function useWithdrawals(): Withdrawal[] {
  const [snap, setSnap] = useState<Withdrawal[]>(cache);
  useEffect(() => {
    const l = () => setSnap([...cache]);
    listeners.add(l);
    ensureSubscription();
    if (!loaded && !loading) {
      loading = fetchAll().finally(() => {
        loading = null;
      });
    }
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return snap;
}

function findId(orderNo: string) {
  const w = cache.find((r) => r.orderNo === orderNo);
  return w ? { orderNo } : null;
}

async function rpcByOrder(fn: string, orderNo: string, extra: Record<string, unknown> = {}) {
  const { data: rows, error: qe } = await supabase
    .from("withdrawals")
    .select("id")
    .eq("order_no", orderNo)
    .maybeSingle();
  if (qe || !rows) {
    console.error("[withdrawal lookup]", qe);
    return;
  }
  const { error } = await supabase.rpc(fn as never, { _id: rows.id, ...extra } as never);
  if (error) {
    console.error(`[rpc ${fn}]`, error);
    alert(error.message);
  }
  await fetchAll();
}

/**
 * Smart patch dispatcher: inspects the patch shape and calls the right RPC.
 * - status Audited => approve_withdrawal
 * - status Reject  => reject_withdrawal
 * - status Freeze  => risk_control_withdrawal
 * - status Successful => mark_withdrawal_paid
 * - only lockFlag  => lock_withdrawal
 */
export async function updateWithdrawal(orderNo: string, patch: Partial<Withdrawal>) {
  if (patch.status === "Audited") {
    await rpcByOrder("approve_withdrawal", orderNo, { _remark: "" });
  } else if (patch.status === "Reject") {
    await rpcByOrder("reject_withdrawal", orderNo, { _remark: "" });
  } else if (patch.status === "Freeze") {
    await rpcByOrder("risk_control_withdrawal", orderNo, { _remark: "" });
  } else if (patch.status === "Successful") {
    await rpcByOrder("mark_withdrawal_paid", orderNo, {
      _out_trade_no: patch.outTradeNo ?? "",
      _channel: patch.channel ?? "",
    });
  } else if (patch.lockFlag !== undefined) {
    await rpcByOrder("lock_withdrawal", orderNo, { _lock: patch.lockFlag === "locked" });
  } else if (findId(orderNo)) {
    // fallback: update remark only
    if (patch.status === undefined && "remark" in (patch as object)) {
      await supabase.from("withdrawals").update({ remark: (patch as { remark?: string }).remark }).eq("order_no", orderNo);
      await fetchAll();
    }
  }
}

export async function updateWithdrawals(fn: (rows: Withdrawal[]) => Withdrawal[]) {
  const next = fn(cache);
  const changed = next.filter((r, i) => cache[i] && cache[i].status !== r.status);
  await Promise.all(changed.map((r) => updateWithdrawal(r.orderNo, { status: r.status })));
}

/** Player-side: create a new withdrawal request. */
export async function createPlayerWithdrawal(input: {
  amount: number;
  payoutMode: string;
  accountNo: string;
}) {
  const { data, error } = await supabase.rpc("create_withdrawal", {
    _amount: input.amount,
    _payout_mode: input.payoutMode,
    _account_no: input.accountNo,
  });
  if (error) throw error;
  return data;
}

/** Admin custom remark reply via mail — use mailbox-store sendMail instead. */
export async function sendAdminRemark(orderNo: string, remark: string) {
  await rpcByOrder("approve_withdrawal", orderNo, { _remark: remark });
}