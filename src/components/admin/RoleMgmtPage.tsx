import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, ShieldCheck, Loader2, X } from "lucide-react";
import {
  listCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  listAssignableUsers,
  setUserRoleAssignments,
} from "@/lib/roles.functions";

type Role = Awaited<ReturnType<typeof listCustomRoles>>[number];

export function RoleMgmtPage() {
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ["custom_roles"], queryFn: () => listCustomRoles() });

  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<Role | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["custom_roles"] });
    qc.invalidateQueries({ queryKey: ["assignable_users"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteCustomRole({ data: { id } }),
    onSuccess: () => {
      toast.success("Role deleted");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-info" /> Role Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Define admin roles. Fine-grained permission control lives in the Permission page.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-9 px-3 rounded-sm bg-primary text-primary-foreground text-sm inline-flex items-center gap-2 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Role
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Code</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
              <th className="text-center px-4 py-2 font-medium">Permissions</th>
              <th className="text-center px-4 py-2 font-medium">Users</th>
              <th className="text-left px-4 py-2 font-medium">Last Updated By</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            )}
            {roles.data?.map((r) => (
              <tr key={r.id} className="border-t border-panel-border hover:bg-accent/30">
                <td className="px-4 py-3">
                  <div className="font-medium flex items-center gap-2">
                    {r.name}
                    {r.is_system && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info border border-info/30">
                        System
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.code}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-md truncate">
                  {r.description || "—"}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">{r.permission_count}</td>
                <td className="px-4 py-3 text-center tabular-nums">{r.user_count}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {r.updated_by_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setAssigning(r)}
                      className="h-7 px-2 rounded-sm text-xs border border-panel-border hover:bg-accent inline-flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" /> Assign
                    </button>
                    <button
                      onClick={() => setEditing(r)}
                      className="h-7 px-2 rounded-sm text-xs border border-panel-border hover:bg-accent inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      disabled={r.is_system || del.isPending}
                      onClick={() => {
                        if (confirm(`Delete role "${r.name}"? This removes it from all users.`))
                          del.mutate(r.id);
                      }}
                      className="h-7 px-2 rounded-sm text-xs border border-panel-border text-danger hover:bg-danger/10 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.data && roles.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">
                  No roles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <RoleEditor
          role={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}
      {assigning && (
        <AssignUsersModal role={assigning} onClose={() => setAssigning(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function RoleEditor({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(role?.code ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    try {
      setSaving(true);
      if (role) {
        await updateCustomRole({ data: { id: role.id, name, description } });
        toast.success("Role updated");
      } else {
        await createCustomRole({ data: { code, name, description } });
        toast.success("Role created");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <h2 className="text-sm font-semibold">{role ? "Edit Role" : "New Role"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Code (unique, lowercase)</label>
            <input
              disabled={!!role}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. payment_lead"
              className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Lead"
              className="mt-1 w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-2 py-1.5 rounded-sm border border-input bg-background text-sm"
            />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-panel-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-sm border border-input bg-background text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim() || (!role && !code.trim())}
            className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : role ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignUsersModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const users = useQuery({
    queryKey: ["assignable_users"],
    queryFn: () => listAssignableUsers(),
  });
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());

  const initialAssigned = useMemo(() => {
    const set = new Set<string>();
    for (const u of users.data ?? []) if (u.role_ids.includes(role.id)) set.add(u.id);
    return set;
  }, [users.data, role.id]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => setSelected(new Set(initialAssigned)), [initialAssigned]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const save = async () => {
    const toAdd = [...selected].filter((id) => !initialAssigned.has(id));
    const toRemove = [...initialAssigned].filter((id) => !selected.has(id));
    const changed = new Set<string>([...toAdd, ...toRemove]);
    if (!changed.size) {
      onClose();
      return;
    }
    setPending(changed);
    try {
      for (const uid of changed) {
        const u = users.data?.find((x) => x.id === uid);
        const nextRoles = new Set(u?.role_ids ?? []);
        if (selected.has(uid)) nextRoles.add(role.id);
        else nextRoles.delete(role.id);
        await setUserRoleAssignments({
          data: { user_id: uid, role_ids: [...nextRoles] },
        });
      }
      toast.success("Assignments saved");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setPending(new Set());
    }
  };

  const filtered = (users.data ?? []).filter(
    (u) =>
      !q.trim() ||
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      u.full_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <div>
            <h2 className="text-sm font-semibold">Assign users → {role.name}</h2>
            <p className="text-xs text-muted-foreground">
              Selected users receive this role in addition to any they already have.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username, email, name…"
            className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
          />
          <div className="max-h-80 overflow-auto border border-panel-border rounded-sm">
            {users.isLoading && (
              <div className="p-4 text-center text-muted-foreground text-xs">Loading…</div>
            )}
            {filtered.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-panel-border/50 last:border-b-0 hover:bg-accent/30 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {u.username}
                    {u.full_name && (
                      <span className="text-xs text-muted-foreground ml-2">({u.full_name})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                {pending.has(u.id) && <Loader2 className="w-4 h-4 animate-spin" />}
              </label>
            ))}
            {!users.isLoading && filtered.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-xs">No users match.</div>
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-panel-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-sm border border-input bg-background text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={pending.size > 0}
            className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}