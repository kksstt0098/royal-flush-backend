import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  LogIn,
} from "lucide-react";

type Status = "success" | "failed" | "locked" | "logged_out";
type Method = "password" | "otp" | "google" | "apple" | "facebook" | "guest";

type Row = {
  id: string;
  player_id: string | null;
  username: string;
  status: Status;
  login_method: Method;
  failure_reason: string | null;
  remark: string;
  device_type: string | null;
  device_name: string | null;
  device_id: string | null;
  browser: string | null;
  os: string | null;
  app_version: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  session_id: string | null;
  vip_level: number | null;
  agent: string | null;
  logged_in_at: string;
  logged_out_at: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  success: "Success",
  failed: "Failed",
  locked: "Locked",
  logged_out: "Logged Out",
};

const STATUS_CLASS: Record<Status, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  locked: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  logged_out: "bg-muted text-muted-foreground border-panel-border",
};

const METHOD_LABEL: Record<Method, string> = {
  password: "Password",
  otp: "OTP",
  google: "Google Login",
  apple: "Apple Login",
  facebook: "Facebook Login",
  guest: "Guest Login",
};

const PAGE_SIZE = 20;

const emptyFilters = {
  from: "",
  to: "",
  playerId: "",
  username: "",
  status: "all" as "all" | Status,
  device: "all",
  country: "",
};
type Filters = typeof emptyFilters;

function fmtDuration(a: string, b: string | null) {
  if (!b) return "—";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const inputCls =
  "w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring";
const labelCls = "text-[11px] text-muted-foreground mb-1 block";

export function PlayerLoginLogPage() {
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, locked: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [asc, setAsc] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);

  const buildQuery = (select: string, count?: "exact") => {
    let q = supabase
      .from("player_login_logs")
      .select(select, count ? { count } : undefined)
      .order("logged_in_at", { ascending: asc });
    if (applied.from) q = q.gte("logged_in_at", new Date(applied.from).toISOString());
    if (applied.to) {
      const end = new Date(applied.to);
      end.setHours(23, 59, 59, 999);
      q = q.lte("logged_in_at", end.toISOString());
    }
    if (applied.playerId.trim()) q = q.eq("player_id", applied.playerId.trim());
    if (applied.username.trim()) q = q.ilike("username", `%${applied.username.trim()}%`);
    if (applied.status !== "all") q = q.eq("status", applied.status);
    if (applied.device !== "all") q = q.eq("device_type", applied.device);
    if (applied.country.trim()) q = q.ilike("country", `%${applied.country.trim()}%`);
    return q;
  };

  const load = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await buildQuery("*", "exact").range(from, from + PAGE_SIZE - 1);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setTotal(count ?? 0);

    const { data: agg } = await buildQuery("status").limit(50000);
    const list = (agg ?? []) as unknown as { status: Status }[];
    setStats({
      total: list.length,
      success: list.filter((r) => r.status === "success").length,
      failed: list.filter((r) => r.status === "failed").length,
      locked: list.filter((r) => r.status === "locked").length,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page, asc]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, total);

  const doExport = async () => {
    const { data } = await buildQuery("*").limit(50000);
    const list = (data ?? []) as unknown as Row[];
    if (list.length === 0) {
      toast.error("No records to export");
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(
      list.map((r) => ({
        "Login Time": new Date(r.logged_in_at).toLocaleString(),
        "Player ID": r.player_id ?? "",
        Username: r.username,
        Status: STATUS_LABEL[r.status],
        "Device Type": r.device_type ?? "",
        "Login IP": r.ip_address ?? "",
        Country: r.country ?? "",
        "Login Method": METHOD_LABEL[r.login_method],
        Remark: r.remark,
        "Logout Time": r.logged_out_at ? new Date(r.logged_out_at).toLocaleString() : "",
        Duration: fmtDuration(r.logged_in_at, r.logged_out_at),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "PlayerLoginLog");
    XLSX.writeFile(wb, `player-login-log-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${list.length} records`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Player Login Log</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Audit trail of player sign-in activity for security monitoring, support and risk control.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-panel border border-panel-border rounded-lg shadow-sm p-4">
        <div
          className="grid gap-3 items-end"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <div>
            <label className={labelCls}>From</label>
            <input
              type="date"
              className={inputCls}
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input
              type="date"
              className={inputCls}
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Player ID</label>
            <input
              className={inputCls}
              placeholder="UUID"
              value={draft.playerId}
              onChange={(e) => setDraft({ ...draft, playerId: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input
              className={inputCls}
              placeholder="username"
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Login Status</label>
            <select
              className={inputCls}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters["status"] })}
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="locked">Locked</option>
              <option value="logged_out">Logged Out</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Device Type</label>
            <select
              className={inputCls}
              value={draft.device}
              onChange={(e) => setDraft({ ...draft, device: e.target.value })}
            >
              <option value="all">All</option>
              <option value="Android">Android</option>
              <option value="iOS">iOS</option>
              <option value="Desktop">Desktop</option>
              <option value="Mobile Web">Mobile Web</option>
              <option value="Tablet">Tablet</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input
              className={inputCls}
              placeholder="country"
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPage(1);
                setApplied(draft);
              }}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
            >
              <Search className="h-3.5 w-3.5" /> Search
            </button>
            <button
              onClick={() => {
                setDraft(emptyFilters);
                setApplied(emptyFilters);
                setPage(1);
              }}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-input text-sm hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={doExport}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-input text-sm hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">
                  <button
                    onClick={() => setAsc((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Login Time <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Player ID</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Username</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Login Status</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Device Type</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Login IP</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Country</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Login Method</th>
                <th className="text-left px-3 py-2.5 whitespace-nowrap">Remark</th>
                <th className="text-right px-3 py-2.5 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                    No login records found.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-panel-border hover:bg-accent/40">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {new Date(r.logged_in_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {r.player_id ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.username || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_CLASS[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.device_type ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.ip_address ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.country ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{METHOD_LABEL[r.login_method]}</td>
                    <td
                      className="px-3 py-2 text-xs max-w-[200px] truncate"
                      title={r.remark || undefined}
                    >
                      {r.remark || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setDetail(r)}
                        className="h-7 px-2.5 rounded-md border border-input text-xs hover:bg-accent"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-t border-panel-border text-xs">
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span>
              Total Attempts: <b className="text-foreground">{stats.total}</b>
            </span>
            <span>
              Successful: <b className="text-emerald-400">{stats.success}</b>
            </span>
            <span>
              Failed: <b className="text-red-400">{stats.failed}</b>
            </span>
            <span>
              Locked: <b className="text-amber-400">{stats.locked}</b>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Showing {rangeFrom}–{rangeTo} of {total} Records
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {detail && <DetailModal row={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-panel-border/60 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background/40 border border-panel-border rounded-md p-3">
      <div className="text-xs font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function DetailModal({ row, onClose }: { row: Row; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-panel border border-panel-border rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border sticky top-0 bg-panel">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LogIn className="h-4 w-4" /> Login Detail
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 grid gap-3 md:grid-cols-2">
          <Section title="Login Information">
            <Field label="Login Time" value={new Date(row.logged_in_at).toLocaleString()} />
            <Field
              label="Logout Time"
              value={row.logged_out_at ? new Date(row.logged_out_at).toLocaleString() : "—"}
            />
            <Field label="Session Duration" value={fmtDuration(row.logged_in_at, row.logged_out_at)} />
            <Field label="Login Status" value={STATUS_LABEL[row.status]} />
            <Field label="Failure Reason" value={row.failure_reason ?? "—"} />
            <Field label="Remark" value={row.remark || "—"} />
          </Section>
          <Section title="Player Information">
            <Field label="Player ID" value={row.player_id ?? "—"} />
            <Field label="Username" value={row.username || "—"} />
            <Field label="VIP Level" value={row.vip_level ?? "—"} />
            <Field label="Agent" value={row.agent ?? "—"} />
          </Section>
          <Section title="Device Information">
            <Field label="Device Type" value={row.device_type ?? "—"} />
            <Field label="Device Name" value={row.device_name ?? "—"} />
            <Field label="Browser" value={row.browser ?? "—"} />
            <Field label="Operating System" value={row.os ?? "—"} />
            <Field label="App Version" value={row.app_version ?? "—"} />
          </Section>
          <Section title="Network Information">
            <Field label="Login IP" value={row.ip_address ?? "—"} />
            <Field label="Country" value={row.country ?? "—"} />
            <Field label="City" value={row.city ?? "—"} />
          </Section>
          <Section title="Security Information">
            <Field label="Device ID" value={row.device_id ?? "—"} />
            <Field label="Session ID" value={row.session_id ?? "—"} />
            <Field label="Login Method" value={METHOD_LABEL[row.login_method]} />
          </Section>
        </div>
      </div>
    </div>
  );
}