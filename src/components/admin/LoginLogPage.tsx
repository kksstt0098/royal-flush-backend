import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  username: string;
  admin_role: string | null;
  status: "success" | "failed";
  failure_reason: string | null;
  ip_address: string | null;
  session_id: string | null;
  logged_in_at: string;
  logged_out_at: string | null;
};

const REASON_LABEL: Record<string, string> = {
  invalid_username: "Invalid Username",
  invalid_password: "Invalid Password",
  invalid_2fa: "Invalid 2FA Code",
  invalid_ip: "Invalid IP",
  account_disabled: "Account Disabled",
  account_locked: "Account Locked",
  too_many_attempts: "Too Many Attempts",
  unknown_error: "Unknown Error",
};

function fmtDuration(startIso: string, endIso: string | null) {
  if (!endIso) return "Active";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const PAGE_SIZE = 20;

export function LoginLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"all" | "success" | "failed">("all");

  const [applied, setApplied] = useState({
    from: "",
    to: "",
    username: "",
    status: "all" as "all" | "success" | "failed",
  });

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("admin_login_logs")
      .select("*", { count: "exact" })
      .order("logged_in_at", { ascending: false });

    if (applied.from) q = q.gte("logged_in_at", new Date(applied.from).toISOString());
    if (applied.to) {
      const end = new Date(applied.to);
      end.setHours(23, 59, 59, 999);
      q = q.lte("logged_in_at", end.toISOString());
    }
    if (applied.username.trim()) q = q.ilike("username", `%${applied.username.trim()}%`);
    if (applied.status !== "all") q = q.eq("status", applied.status);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await q.range(from, to);
    setRows((data ?? []) as Row[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const doSearch = () => {
    setPage(1);
    setApplied({ from: fromDate, to: toDate, username, status });
  };
  const doReset = () => {
    setFromDate("");
    setToDate("");
    setUsername("");
    setStatus("all");
    setPage(1);
    setApplied({ from: "", to: "", username: "", status: "all" });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-panel border border-panel-border rounded-md p-5">
        <h1 className="text-lg font-semibold">Admin Login Log</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Read-only audit trail of every backend sign-in attempt.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-3">
            <label className="text-[11px] text-muted-foreground">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-[11px] text-muted-foreground">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-[11px] text-muted-foreground">Admin User</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username / email"
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-[11px] text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={doSearch}
            className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90"
          >
            Search
          </button>
          <button
            onClick={doReset}
            className="h-9 px-4 rounded-sm border border-input text-sm hover:bg-accent"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 whitespace-nowrap">Login Time</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Username</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Role</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Status</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Failure Reason</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">IP Address</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Session ID</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Logout Time</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    No login records found.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-panel-border">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {new Date(r.logged_in_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.username}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.admin_role ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-sm ${
                          r.status === "success"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {r.status === "success" ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.status === "failed"
                        ? (REASON_LABEL[r.failure_reason ?? "unknown_error"] ?? "Unknown Error")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.ip_address ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {r.status === "success" ? (r.session_id ?? "—") : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.status !== "success" ? (
                        "—"
                      ) : r.logged_out_at ? (
                        new Date(r.logged_out_at).toLocaleString()
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.status !== "success" ? "—" : fmtDuration(r.logged_in_at, r.logged_out_at)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-panel-border text-xs text-muted-foreground">
          <div>
            {total} record{total === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 px-3 rounded-sm border border-input hover:bg-accent disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 px-3 rounded-sm border border-input hover:bg-accent disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}