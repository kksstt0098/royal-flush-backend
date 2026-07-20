import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminPassword,
  kickAdminUser,
  setAdminStatus,
  deleteAdminUser,
} from "@/lib/admin-users.functions";
import {
  Users,
  Wifi,
  Snowflake,
  Ban,
  Search,
  Plus,
  X,
  Loader2,
  Pencil,
  KeyRound,
  LogOut,
  Snowflake as SnowIcon,
  Trash2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

type Row = Awaited<ReturnType<typeof listAdminUsers>>["rows"][number];

const ROLE_OPTS = ["admin", "auditor", "payer"] as const;
const STATUS_OPTS = ["all", "online", "offline", "frozen", "disabled"] as const;

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    online: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    offline: "bg-muted text-muted-foreground border-panel-border",
    frozen: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    disabled: "bg-red-500/15 text-red-500 border-red-500/30",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2 h-5 rounded-sm border text-[11px] capitalize " +
        (map[s] ?? map.offline)
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s}
    </span>
  );
}

function fmt(v?: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString();
}

function genPassword() {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*?";
  const all = upper + lower + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(upper), pick(lower), pick(nums), pick(syms)];
  for (let i = 0; i < 12; i++) base.push(pick(all));
  return base.sort(() => Math.random() - 0.5).join("");
}

export function AdminUserPage() {
  const list = useServerFn(listAdminUsers);
  const create = useServerFn(createAdminUser);
  const update = useServerFn(updateAdminUser);
  const resetPw = useServerFn(resetAdminPassword);
  const kick = useServerFn(kickAdminUser);
  const setStatus = useServerFn(setAdminStatus);
  const softDelete = useServerFn(deleteAdminUser);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "auditor" | "payer">("all");
  const [status, setStatus2] = useState<(typeof STATUS_OPTS)[number]>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, frozen: 0, disabled: 0 });
  const [refreshTick, setRefreshTick] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [pwFor, setPwFor] = useState<Row | null>(null);
  const [reasonFor, setReasonFor] = useState<{ row: Row; action: "freeze" | "disable" } | null>(null);
  const [confirmFor, setConfirmFor] = useState<{ row: Row; action: "unfreeze" | "enable" | "kick" } | null>(null);
  const [deleteFor, setDeleteFor] = useState<Row | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await list({
        data: {
          search,
          role,
          status,
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to + "T23:59:59").toISOString() : null,
          page: p,
          pageSize,
        },
      });
      setRows(res.rows);
      setTotal(res.total);
      setStats(res.stats);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, refreshTick]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const runAction = async (fn: () => Promise<any>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      setRefreshTick((n) => n + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  const reset = () => {
    setSearch("");
    setRole("all");
    setStatus2("all");
    setFrom("");
    setTo("");
    setRefreshTick((n) => n + 1);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Admins" value={stats.total} />
        <StatCard icon={Wifi} label="Online" value={stats.online} tone="emerald" />
        <StatCard icon={Snowflake} label="Frozen" value={stats.frozen} tone="amber" />
        <StatCard icon={Ban} label="Disabled" value={stats.disabled} tone="red" />
      </div>

      {/* Filters */}
      <div className="bg-panel border border-panel-border rounded-md p-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[220px]">
          <label className="text-[11px] text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Username or full name"
              className="h-9 w-full pl-7 pr-2 rounded-sm border border-input bg-background text-sm"
              onKeyDown={(e) => e.key === "Enter" && setRefreshTick((n) => n + 1)}
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="h-9 px-2 rounded-sm border border-input bg-background text-sm">
            <option value="all">All</option>
            {ROLE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus2(e.target.value as any)} className="h-9 px-2 rounded-sm border border-input bg-background text-sm capitalize">
            {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 px-2 rounded-sm border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 px-2 rounded-sm border border-input bg-background text-sm" />
        </div>
        <button onClick={() => setRefreshTick((n) => n + 1)} className="h-9 px-3 rounded-sm bg-primary text-primary-foreground text-sm">Search</button>
        <button onClick={reset} className="h-9 px-3 rounded-sm border border-input text-sm hover:bg-accent">Reset</button>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(true)} className="h-9 px-3 rounded-sm bg-primary text-primary-foreground text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="text-left text-muted-foreground">
                {["ID","Username","Full Name","Role","Status","Last Login","Created By","Created At","Updated By","Updated At","Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={11} className="p-8 text-center text-danger">{error}</td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={11} className="p-10 text-center text-muted-foreground">No admins match your filters.</td></tr>
              )}
              {!loading && !error && rows.map((r) => (
                <tr key={r.id} className="border-t border-panel-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.id.slice(0,8)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {r.username}
                      {r.is_super && <span title="Super admin"><ShieldCheck className="w-3.5 h-3.5 text-primary" /></span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.full_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 capitalize">{r.role ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge s={r.status} /></td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.last_login)}</td>
                  <td className="px-3 py-2">{r.created_by_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2">{r.updated_by_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.updated_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <IconBtn title="Edit" onClick={() => setEdit(r)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Reset password" onClick={() => setPwFor(r)}><KeyRound className="w-3.5 h-3.5" /></IconBtn>
                      {r.status === "online" && (
                        <IconBtn title="Kick online" onClick={() => setConfirmFor({ row: r, action: "kick" })}><LogOut className="w-3.5 h-3.5" /></IconBtn>
                      )}
                      {r.stored_status === "frozen"
                        ? <IconBtn title="Unfreeze" onClick={() => setConfirmFor({ row: r, action: "unfreeze" })}><RefreshCw className="w-3.5 h-3.5" /></IconBtn>
                        : <IconBtn title="Freeze" onClick={() => setReasonFor({ row: r, action: "freeze" })} disabled={r.is_super}><SnowIcon className="w-3.5 h-3.5" /></IconBtn>}
                      {r.stored_status === "disabled"
                        ? <IconBtn title="Enable" onClick={() => setConfirmFor({ row: r, action: "enable" })}><ShieldCheck className="w-3.5 h-3.5" /></IconBtn>
                        : <IconBtn title="Disable" onClick={() => setReasonFor({ row: r, action: "disable" })} disabled={r.is_super}><Ban className="w-3.5 h-3.5" /></IconBtn>}
                      <IconBtn title="Delete" onClick={() => setDeleteFor(r)} disabled={r.is_super}><Trash2 className="w-3.5 h-3.5 text-danger" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-panel-border text-xs text-muted-foreground">
          <div>Total {total}</div>
          <div className="flex items-center gap-2">
            <label>Rows:
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="ml-1 h-7 px-1 rounded-sm border border-input bg-background">
                <option>20</option><option>50</option><option>100</option>
              </select>
            </label>
            <button disabled={page<=1} onClick={() => { const p = page-1; setPage(p); load(p); }} className="h-7 px-2 rounded-sm border border-input disabled:opacity-40">Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page>=totalPages} onClick={() => { const p = page+1; setPage(p); load(p); }} className="h-7 px-2 rounded-sm border border-input disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddEditModal
          title="Add Admin"
          onClose={() => setShowAdd(false)}
          onSubmit={async (v) => {
            await runAction(
              () => create({ data: { email: v.email!, full_name: v.full_name, role: v.role, password: v.password! } }),
              "Admin created",
            );
            setShowAdd(false);
          }}
        />
      )}
      {edit && (
        <AddEditModal
          title="Edit Admin"
          initial={edit}
          onClose={() => setEdit(null)}
          onSubmit={async (v) => {
            await runAction(
              () => update({ data: { id: edit.id, full_name: v.full_name, role: v.role } }),
              "Admin updated",
            );
            setEdit(null);
          }}
        />
      )}
      {pwFor && (
        <ResetPasswordModal
          row={pwFor}
          onClose={() => setPwFor(null)}
          onSubmit={async (pw) => {
            await runAction(
              () => resetPw({ data: { id: pwFor.id, new_password: pw } }),
              "Password reset; all sessions terminated",
            );
            setPwFor(null);
          }}
        />
      )}
      {reasonFor && (
        <ReasonModal
          title={reasonFor.action === "freeze" ? "Freeze admin" : "Disable admin"}
          row={reasonFor.row}
          confirmLabel={reasonFor.action === "freeze" ? "Freeze" : "Disable"}
          onClose={() => setReasonFor(null)}
          onSubmit={async (reason) => {
            await runAction(
              () => setStatus({ data: { id: reasonFor.row.id, action: reasonFor.action, reason } }),
              reasonFor.action === "freeze" ? "Admin frozen" : "Admin disabled",
            );
            setReasonFor(null);
          }}
        />
      )}
      {confirmFor && (
        <ConfirmModal
          title={confirmFor.action === "kick" ? "Kick online sessions?" : confirmFor.action === "unfreeze" ? "Unfreeze admin?" : "Enable admin?"}
          message={
            confirmFor.action === "kick"
              ? `All active sessions for ${confirmFor.row.username} will be terminated immediately.`
              : `${confirmFor.row.username} will regain login access.`
          }
          onClose={() => setConfirmFor(null)}
          onConfirm={async () => {
            if (confirmFor.action === "kick") {
              await runAction(() => kick({ data: { id: confirmFor.row.id } }), "Sessions terminated");
            } else {
              await runAction(
                () => setStatus({ data: { id: confirmFor.row.id, action: confirmFor.action as "unfreeze" | "enable" } }),
                confirmFor.action === "unfreeze" ? "Admin unfrozen" : "Admin enabled",
              );
            }
            setConfirmFor(null);
          }}
        />
      )}
      {deleteFor && (
        <ReasonModal
          title="Delete admin (soft)"
          row={deleteFor}
          confirmLabel="Delete"
          destructive
          onClose={() => setDeleteFor(null)}
          onSubmit={async (reason) => {
            await runAction(
              () => softDelete({ data: { id: deleteFor.id, reason } }),
              "Admin deleted",
            );
            setDeleteFor(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "emerald" | "amber" | "red" }) {
  const toneCls =
    tone === "emerald" ? "text-emerald-500" :
    tone === "amber" ? "text-amber-500" :
    tone === "red" ? "text-red-500" : "text-primary";
  return (
    <div className="bg-panel border border-panel-border rounded-md p-3 flex items-center gap-3">
      <div className={"w-9 h-9 rounded-sm bg-muted/40 flex items-center justify-center " + toneCls}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function IconBtn({ children, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className="h-7 w-7 grid place-items-center rounded-sm border border-panel-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddEditModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: Row;
  onClose: () => void;
  onSubmit: (v: { email?: string; full_name: string; role: "admin" | "auditor" | "payer"; password?: string }) => void;
}) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [role, setRole] = useState<"admin" | "auditor" | "payer">((initial?.role as any) ?? "auditor");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit) {
      if (pw !== pw2) return toast.error("Passwords do not match");
    }
    setBusy(true);
    try {
      await onSubmit({ email, full_name: fullName, role, password: pw });
    } finally { setBusy(false); }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <Field label="Username (email)">
          <input required type="email" disabled={isEdit} value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-9 w-full px-2 rounded-sm border border-input bg-background disabled:opacity-60" />
        </Field>
        <Field label="Full name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 w-full px-2 rounded-sm border border-input bg-background" />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="h-9 w-full px-2 rounded-sm border border-input bg-background capitalize">
            {ROLE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        {!isEdit && (
          <>
            <Field label="Password (12+ chars, upper, lower, number, symbol)">
              <div className="flex gap-2">
                <input required type="text" value={pw} onChange={(e) => setPw(e.target.value)} className="h-9 flex-1 px-2 rounded-sm border border-input bg-background font-mono" />
                <button type="button" onClick={() => { const g = genPassword(); setPw(g); setPw2(g); }} className="h-9 px-2 rounded-sm border border-input text-xs hover:bg-accent">Generate</button>
              </div>
            </Field>
            <Field label="Confirm password">
              <input required type="text" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-9 w-full px-2 rounded-sm border border-input bg-background font-mono" />
            </Field>
            <p className="text-[11px] text-muted-foreground">Status defaults to Offline. The admin must enroll 2FA on first login.</p>
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-sm border border-input hover:bg-accent">Cancel</button>
          <button disabled={busy} type="submit" className="h-9 px-4 rounded-sm bg-primary text-primary-foreground flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ row, onClose, onSubmit }: { row: Row; onClose: () => void; onSubmit: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    try { await onSubmit(pw); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Reset password – ${row.username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <div className="text-xs text-muted-foreground bg-warning/10 border border-warning/30 rounded-sm p-2">
          After reset, all active sessions for this admin will be terminated.
        </div>
        <Field label="New password (12+ chars, upper, lower, number, symbol)">
          <div className="flex gap-2">
            <input required type="text" value={pw} onChange={(e) => setPw(e.target.value)} className="h-9 flex-1 px-2 rounded-sm border border-input bg-background font-mono" />
            <button type="button" onClick={() => { const g = genPassword(); setPw(g); setPw2(g); }} className="h-9 px-2 rounded-sm border border-input text-xs hover:bg-accent">Generate</button>
          </div>
        </Field>
        <Field label="Confirm password">
          <input required type="text" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-9 w-full px-2 rounded-sm border border-input bg-background font-mono" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-sm border border-input hover:bg-accent">Cancel</button>
          <button disabled={busy} type="submit" className="h-9 px-4 rounded-sm bg-primary text-primary-foreground flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Reset
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReasonModal({
  title, row, confirmLabel, destructive, onClose, onSubmit,
}: {
  title: string; row: Row; confirmLabel: string; destructive?: boolean;
  onClose: () => void; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error("Reason required");
    setBusy(true);
    try { await onSubmit(reason.trim()); } finally { setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">Target: <span className="font-medium">{row.username}</span></p>
        <Field label="Reason">
          <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-2 py-1 rounded-sm border border-input bg-background" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-sm border border-input hover:bg-accent">Cancel</button>
          <button disabled={busy} type="submit"
            className={"h-9 px-4 rounded-sm flex items-center gap-2 disabled:opacity-50 " + (destructive ? "bg-danger text-danger-foreground" : "bg-primary text-primary-foreground")}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmModal({ title, message, onClose, onConfirm }: { title: string; message: string; onClose: () => void; onConfirm: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm">{message}</p>
      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onClose} className="h-9 px-3 rounded-sm border border-input hover:bg-accent text-sm">Cancel</button>
        <button disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-50">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
