import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, ShieldCheck, Eye, EyeOff, Wrench } from "lucide-react";
import {
  listCustomRoles,
  getRolePermissions,
  saveRolePermissions,
} from "@/lib/roles.functions";
import {
  PERMISSION_GROUPS,
  ACCESS_ORDER,
  accessLabel,
  accessColor,
  type AccessLevel,
} from "@/lib/permissions-catalog";

export function PermissionMgmtPage() {
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ["custom_roles"], queryFn: () => listCustomRoles() });
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!selected && roles.data?.length) setSelected(roles.data[0].id);
  }, [roles.data, selected]);

  const perms = useQuery({
    queryKey: ["role_permissions", selected],
    queryFn: () => getRolePermissions({ data: { role_id: selected! } }),
    enabled: !!selected,
  });

  const [draft, setDraft] = useState<Record<string, AccessLevel>>({});
  useEffect(() => {
    if (perms.data) setDraft({ ...perms.data.access });
  }, [perms.data]);

  const dirty = useMemo(() => {
    if (!perms.data) return [];
    const rows: { permission_key: string; access: AccessLevel }[] = [];
    for (const k of Object.keys(draft)) {
      if (draft[k] !== perms.data.access[k])
        rows.push({ permission_key: k, access: draft[k] });
    }
    return rows;
  }, [draft, perms.data]);

  const selectedRole = roles.data?.find((r) => r.id === selected);
  const isSuper = selectedRole?.code === "super_admin";
  const [saving, setSaving] = useState(false);

  const setAll = (groupKeys: string[], access: AccessLevel) => {
    if (isSuper) return;
    setDraft((d) => {
      const n = { ...d };
      for (const k of groupKeys) n[k] = access;
      return n;
    });
  };

  const save = async () => {
    if (!selected || !dirty.length) return;
    try {
      setSaving(true);
      await saveRolePermissions({ data: { role_id: selected, changes: dirty } });
      toast.success(`Saved ${dirty.length} change${dirty.length > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["role_permissions", selected] });
      qc.invalidateQueries({ queryKey: ["custom_roles"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (perms.data) setDraft({ ...perms.data.access });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-info" /> Permission Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure per-module access for each role. <b>Hidden</b> removes the section from the
            sidebar. <b>View only</b> allows read but blocks writes. <b>Manage</b> grants full
            control.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            disabled={!dirty.length || saving}
            className="h-9 px-3 rounded-sm border border-input bg-background text-sm inline-flex items-center gap-2 hover:bg-accent disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={save}
            disabled={!dirty.length || saving || isSuper}
            className="h-9 px-3 rounded-sm bg-primary text-primary-foreground text-sm inline-flex items-center gap-2 hover:bg-primary/90 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save {dirty.length ? `(${dirty.length})` : ""}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Roles list */}
        <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
          <div className="px-3 py-2 border-b border-panel-border text-xs font-semibold uppercase text-muted-foreground">
            Roles
          </div>
          {roles.isLoading && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading…
            </div>
          )}
          {roles.data?.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={
                "w-full text-left px-3 py-2 border-b border-panel-border/50 hover:bg-accent/40 " +
                (selected === r.id ? "bg-info/10 text-info" : "")
              }
            >
              <div className="text-sm font-medium flex items-center gap-2">
                {r.name}
                {r.is_system && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-info/15 text-info border border-info/30">
                    System
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">{r.code}</div>
            </button>
          ))}
        </div>

        {/* Matrix */}
        <div className="bg-panel border border-panel-border rounded-md">
          {!selectedRole ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Select a role to configure permissions.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-panel-border flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{selectedRole.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedRole.description || "—"}</div>
                </div>
                {isSuper && (
                  <span className="text-[11px] px-2 py-1 rounded bg-warning/15 text-warning border border-warning/30">
                    Super Admin has full access and cannot be modified
                  </span>
                )}
              </div>

              {perms.isLoading && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading permissions…
                </div>
              )}

              {perms.data && (
                <div className="divide-y divide-panel-border">
                  {PERMISSION_GROUPS.map((g) => {
                    const keys = g.items.map((i) => i.key);
                    return (
                      <div key={g.key} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-semibold uppercase text-muted-foreground">
                            {g.label}
                          </div>
                          <div className="flex gap-1 text-[11px]">
                            <button
                              disabled={isSuper}
                              onClick={() => setAll(keys, "none")}
                              className="h-6 px-2 rounded border border-panel-border hover:bg-accent disabled:opacity-40"
                            >
                              All Hidden
                            </button>
                            <button
                              disabled={isSuper}
                              onClick={() => setAll(keys, "view")}
                              className="h-6 px-2 rounded border border-panel-border hover:bg-accent disabled:opacity-40"
                            >
                              All View
                            </button>
                            <button
                              disabled={isSuper}
                              onClick={() => setAll(keys, "manage")}
                              className="h-6 px-2 rounded border border-panel-border hover:bg-accent disabled:opacity-40"
                            >
                              All Manage
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {g.items.map((item) => {
                            const current = draft[item.key] ?? "none";
                            const original = perms.data!.access[item.key] ?? "none";
                            const changed = current !== original;
                            const meta = perms.data!.meta[item.key];
                            return (
                              <div
                                key={item.key}
                                className={
                                  "flex items-center justify-between gap-3 px-3 py-2 rounded-sm border " +
                                  (changed
                                    ? "border-warning/40 bg-warning/5"
                                    : "border-panel-border bg-background/40")
                                }
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{item.label}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                                    {item.key}
                                    {meta?.updated_by_name && (
                                      <span className="ml-2">· by {meta.updated_by_name}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex rounded-sm overflow-hidden border border-panel-border">
                                  {ACCESS_ORDER.map((lvl) => {
                                    const active = current === lvl;
                                    const Icon =
                                      lvl === "manage" ? Wrench : lvl === "view" ? Eye : EyeOff;
                                    return (
                                      <button
                                        key={lvl}
                                        disabled={isSuper}
                                        onClick={() =>
                                          setDraft((d) => ({ ...d, [item.key]: lvl }))
                                        }
                                        className={
                                          "h-7 px-2 text-[11px] inline-flex items-center gap-1 border-l first:border-l-0 border-panel-border transition-colors " +
                                          (active
                                            ? accessColor(lvl)
                                            : "bg-background text-muted-foreground hover:bg-accent") +
                                          (isSuper ? " opacity-60 cursor-not-allowed" : "")
                                        }
                                        title={accessLabel(lvl)}
                                      >
                                        <Icon className="w-3 h-3" />
                                        {accessLabel(lvl)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}