import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorName } from "@/hooks/use-auth";

type Row = {
  id: string;
  ip_address: string;
  label: string;
  note: string;
  active: boolean;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type Attempt = {
  id: string;
  ip_address: string | null;
  email: string | null;
  allowed: boolean;
  user_agent: string | null;
  created_at: string;
};

const IPV4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;

function isValidIp(v: string) {
  const s = v.trim();
  return IPV4.test(s) || (IPV6.test(s) && s.includes(":"));
}

export function WhitelistPage() {
  const operator = useOperatorName();
  const [rows, setRows] = useState<Row[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "attempts">("list");

  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: wl }, { data: at }] = await Promise.all([
      supabase.from("ip_whitelist").select("*").order("created_at", { ascending: false }),
      supabase
        .from("ip_whitelist_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setRows((wl ?? []) as Row[]);
    setAttempts((at ?? []) as Attempt[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!isValidIp(ip)) {
      setMsg("Invalid IP address format.");
      return;
    }
    if (!label.trim()) {
      setMsg("Label (for whom) is required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("ip_whitelist").insert({
      ip_address: ip.trim(),
      label: label.trim(),
      note: note.trim(),
      created_by_name: operator,
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setIp("");
    setLabel("");
    setNote("");
    load();
  };

  const toggle = async (r: Row) => {
    await supabase.from("ip_whitelist").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  const remove = async (r: Row) => {
    if (!confirm(`Remove ${r.ip_address} (${r.label}) from whitelist?`)) return;
    await supabase.from("ip_whitelist").delete().eq("id", r.id);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-panel border border-panel-border rounded-md p-5">
        <h1 className="text-lg font-semibold">IP Whitelist</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Only IP addresses on this list can sign in to the backend. If the list is empty, all
          access is denied (fail-closed).
        </p>

        <form onSubmit={add} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-2">
          <input
            className="md:col-span-3 h-9 px-2 rounded-sm border border-input bg-background text-sm"
            placeholder="IP address (e.g. 1.2.3.4)"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <input
            className="md:col-span-3 h-9 px-2 rounded-sm border border-input bg-background text-sm"
            placeholder="For whom (label)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className="md:col-span-4 h-9 px-2 rounded-sm border border-input bg-background text-sm"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="md:col-span-2 h-9 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add IP"}
          </button>
        </form>
        {msg && <p className="text-xs text-destructive mt-2">{msg}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("list")}
          className={`h-8 px-3 rounded-sm text-sm ${tab === "list" ? "bg-primary text-primary-foreground" : "border border-input"}`}
        >
          Whitelist ({rows.length})
        </button>
        <button
          onClick={() => setTab("attempts")}
          className={`h-8 px-3 rounded-sm text-sm ${tab === "attempts" ? "bg-primary text-primary-foreground" : "border border-input"}`}
        >
          Blocked attempts ({attempts.filter((a) => !a.allowed).length})
        </button>
      </div>

      {tab === "list" ? (
        <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">IP</th>
                <th className="text-left px-3 py-2">For whom</th>
                <th className="text-left px-3 py-2">Note</th>
                <th className="text-left px-3 py-2">Operator</th>
                <th className="text-left px-3 py-2">Added</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-destructive">
                    Whitelist is empty — nobody can sign in. Add at least one IP.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-panel-border">
                  <td className="px-3 py-2 font-mono">{r.ip_address}</td>
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.note || "—"}</td>
                  <td className="px-3 py-2">{r.created_by_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-sm ${r.active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}
                    >
                      {r.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      onClick={() => toggle(r)}
                      className="text-xs h-7 px-2 rounded-sm border border-input hover:bg-accent"
                    >
                      {r.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="text-xs h-7 px-2 rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">IP</th>
                <th className="text-left px-3 py-2">Email tried</th>
                <th className="text-left px-3 py-2">Result</th>
                <th className="text-left px-3 py-2">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No attempts logged yet.
                  </td>
                </tr>
              )}
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-panel-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono">{a.ip_address ?? "—"}</td>
                  <td className="px-3 py-2">{a.email || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-sm ${a.allowed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {a.allowed ? "Allowed" : "Blocked"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[400px]">
                    {a.user_agent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}