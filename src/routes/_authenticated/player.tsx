import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { useMailbox, markMailRead } from "@/lib/mailbox-store";
import { createPlayerWithdrawal } from "@/lib/withdrawal-store";

export const Route = createFileRoute("/_authenticated/player")({
  component: PlayerApp,
});

type Wallet = {
  coins: number;
  safe_coins: number;
  frozen: number;
  total_payed: number;
  total_withdrawal: number;
};

type HistoryRow = {
  order_no: string;
  apply_amount: number;
  actual_amount: number;
  status: string;
  created_at: string;
  payout_mode: string;
};

type Tab = "wallet" | "withdraw" | "mailbox" | "history";

function PlayerApp() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("wallet");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [nick, setNick] = useState<string>("");
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const loadWallet = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("coins,safe_coins,frozen,total_payed,total_withdrawal")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setWallet(data as Wallet);
  };
  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("nick").eq("id", user.id).maybeSingle();
    if (data) setNick(data.nick ?? "");
  };
  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("withdrawals")
      .select("order_no,apply_amount,actual_amount,status,created_at,payout_mode")
      .eq("player_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setHistory(data as HistoryRow[]);
  };

  useEffect(() => {
    void loadWallet();
    void loadProfile();
    void loadHistory();
    if (!user) return;
    const ch = supabase
      .channel(`player-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => loadWallet())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `player_id=eq.${user.id}` }, () => loadHistory())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-panel-border bg-panel">
        <div className="max-w-3xl mx-auto flex items-center justify-between p-3">
          <div>
            <div className="text-sm font-semibold">Player Portal</div>
            <div className="text-xs text-muted-foreground">{nick || user?.email}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/_authenticated/admin" as never })}
              className="text-xs px-3 h-8 rounded-sm border border-input hover:bg-accent"
            >
              Admin panel
            </button>
            <button onClick={signOut} className="text-xs px-3 h-8 rounded-sm border border-input hover:bg-accent">
              Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto flex gap-1 px-3 pb-2 text-sm">
          {(["wallet", "withdraw", "mailbox", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 h-8 rounded-sm ${tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-3xl mx-auto p-4">
        {tab === "wallet" && <WalletTab wallet={wallet} onDeposit={loadWallet} />}
        {tab === "withdraw" && <WithdrawTab wallet={wallet} onDone={() => { loadWallet(); loadHistory(); setTab("history"); }} />}
        {tab === "mailbox" && <MailboxTab playerID={user?.id} />}
        {tab === "history" && <HistoryTab rows={history} />}
      </main>
    </div>
  );
}

function WalletTab({ wallet, onDeposit }: { wallet: Wallet | null; onDeposit: () => void }) {
  const [amt, setAmt] = useState("1000");
  const [busy, setBusy] = useState(false);
  const topup = async () => {
    const a = Number(amt);
    if (!a || a <= 0) return;
    setBusy(true);
    const { error } = await supabase.rpc("mock_deposit", { _amount: a });
    setBusy(false);
    if (error) alert(error.message);
    else onDeposit();
  };
  return (
    <div className="space-y-4">
      <div className="bg-panel border border-panel-border rounded-md p-4">
        <div className="text-xs text-muted-foreground">Available balance</div>
        <div className="text-3xl font-bold mt-1">{(wallet?.coins ?? 0).toLocaleString()} MMK</div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
          <Stat label="Frozen" value={wallet?.frozen ?? 0} />
          <Stat label="Total deposit" value={wallet?.total_payed ?? 0} />
          <Stat label="Total withdraw" value={wallet?.total_withdrawal ?? 0} />
        </div>
      </div>
      <div className="bg-panel border border-panel-border rounded-md p-4 space-y-3">
        <div className="text-sm font-semibold">Top up (mock)</div>
        <div className="flex gap-2">
          <input
            type="number"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            className="flex-1 h-9 px-2 rounded-sm border border-input bg-background text-sm"
          />
          <button
            disabled={busy}
            onClick={topup}
            className="px-4 h-9 rounded-sm bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            Add coins
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{Number(value).toLocaleString()}</div>
    </div>
  );
}

function WithdrawTab({ wallet, onDone }: { wallet: Wallet | null; onDone: () => void }) {
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState("KBZPay");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const a = Number(amount);
    if (!a || a < 1000) { setErr("Minimum 1,000"); return; }
    if ((wallet?.coins ?? 0) < a) { setErr("Insufficient balance"); return; }
    setBusy(true);
    try {
      await createPlayerWithdrawal({ amount: a, payoutMode: mode, accountNo: account });
      setOk("Request submitted, waiting for review.");
      setAmount("1000");
      setAccount("");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-panel border border-panel-border rounded-md p-4 space-y-3">
      <div className="text-sm font-semibold">Withdraw</div>
      <div className="text-xs text-muted-foreground">Available: {(wallet?.coins ?? 0).toLocaleString()} MMK</div>
      <label className="block text-xs">Amount
        <input type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm" />
      </label>
      <label className="block text-xs">Payout mode
        <select value={mode} onChange={(e) => setMode(e.target.value)}
          className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm">
          <option>KBZPay</option><option>WavePay</option><option>AyaPay</option><option>CBPay</option><option>Card</option>
        </select>
      </label>
      <label className="block text-xs">Account number
        <input required value={account} onChange={(e) => setAccount(e.target.value)}
          className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm" />
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {ok && <p className="text-xs text-success">{ok}</p>}
      <button disabled={busy} type="submit"
        className="w-full h-10 rounded-sm bg-primary text-primary-foreground text-sm disabled:opacity-50">
        {busy ? "Submitting…" : "Request withdrawal"}
      </button>
    </form>
  );
}

function MailboxTab({ playerID }: { playerID?: string }) {
  const mails = useMailbox(playerID);
  if (!playerID) return null;
  if (mails.length === 0)
    return <div className="text-sm text-muted-foreground">No mails yet.</div>;
  return (
    <div className="space-y-2">
      {mails.map((m) => (
        <div key={m.id} className={`bg-panel border rounded-md p-3 ${m.read ? "border-panel-border" : "border-primary"}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="font-semibold text-sm">{m.subject}</div>
            <div className="text-xs text-muted-foreground">{m.time}</div>
          </div>
          <div className="text-sm mt-1 whitespace-pre-wrap">{m.body}</div>
          {!m.read && (
            <button onClick={() => markMailRead(m.id)}
              className="text-xs text-info hover:underline mt-2">
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0)
    return <div className="text-sm text-muted-foreground">No withdrawals yet.</div>;
  return (
    <div className="bg-panel border border-panel-border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs">
          <tr>
            <th className="p-2 text-left">Order</th>
            <th className="p-2 text-right">Amount</th>
            <th className="p-2 text-left">Mode</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.order_no} className="border-t border-panel-border">
              <td className="p-2 font-mono text-xs">{r.order_no}</td>
              <td className="p-2 text-right">{Number(r.actual_amount).toLocaleString()}</td>
              <td className="p-2">{r.payout_mode}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}