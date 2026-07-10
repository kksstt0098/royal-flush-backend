import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useMyanmarClock() {
  const [now, setNow] = useState(() => formatYangon(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(formatYangon(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatYangon(d: Date) {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d);
  // en-CA => "2025-12-28, 09:20:06"
  return s.replace(",", "");
}

export type PendingCounts = { withdrawals: number; deposits: number };

export function usePendingCounts(onNewWithdrawal?: (order: string) => void, onNewDeposit?: (order: string) => void): PendingCounts {
  const [counts, setCounts] = useState<PendingCounts>({ withdrawals: 0, deposits: 0 });
  const first = useRef(true);

  const refresh = async () => {
    const [w, d] = await Promise.all([
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "Pending"),
    ]);
    setCounts({ withdrawals: w.count ?? 0, deposits: d.count ?? 0 });
  };

  useEffect(() => {
    void refresh();
    const ch = supabase
      .channel("admin-topbar-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, (p) => {
        const row = p.new as { order_no?: string; status?: string };
        if (row.status === "Pending" && !first.current && onNewWithdrawal) onNewWithdrawal(row.order_no ?? "");
        void refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "withdrawals" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deposits" }, (p) => {
        const row = p.new as { order_no?: string; status?: string };
        if (row.status === "Pending" && !first.current && onNewDeposit) onNewDeposit(row.order_no ?? "");
        void refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deposits" }, () => refresh())
      .subscribe();
    first.current = false;
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return counts;
}

export function useOnlineStaff(userId: string | undefined, nick: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("admin-presence", { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setCount(Object.keys(state).length);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ nick, at: Date.now() });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, nick]);
  return count;
}

export type PendingOrder = {
  kind: "withdrawal" | "deposit";
  orderNo: string;
  amount: number;
  createdAt: string;
};

export function useRecentPending(): PendingOrder[] {
  const [rows, setRows] = useState<PendingOrder[]>([]);
  const load = async () => {
    const [w, d] = await Promise.all([
      supabase.from("withdrawals").select("order_no,apply_amount,created_at").eq("status", "Pending").order("created_at", { ascending: false }).limit(10),
      supabase.from("deposits").select("order_no,amount,created_at").eq("status", "Pending").order("created_at", { ascending: false }).limit(10),
    ]);
    const list: PendingOrder[] = [
      ...((w.data ?? []) as Array<{ order_no: string; apply_amount: number; created_at: string }>).map((r) => ({
        kind: "withdrawal" as const, orderNo: r.order_no, amount: Number(r.apply_amount), createdAt: r.created_at,
      })),
      ...((d.data ?? []) as Array<{ order_no: string; amount: number; created_at: string }>).map((r) => ({
        kind: "deposit" as const, orderNo: r.order_no, amount: Number(r.amount), createdAt: r.created_at,
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 12);
    setRows(list);
  };
  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-topbar-recent")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  return rows;
}

export async function reauthenticate(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    toast.error(error.message);
    return false;
  }
  return true;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  return lines.join("\n");
}

export function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchExportBundle(): Promise<{ withdrawals: Record<string, unknown>[]; deposits: Record<string, unknown>[] }> {
  const [w, d] = await Promise.all([
    supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(5000),
    supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(5000),
  ]);
  return {
    withdrawals: (w.data ?? []) as Record<string, unknown>[],
    deposits: (d.data ?? []) as Record<string, unknown>[],
  };
}