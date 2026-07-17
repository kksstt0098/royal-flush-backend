import { useState, type ReactNode } from "react";
import { Plus, Pencil, Check, X, Layers, Trash2 } from "lucide-react";
import { levelColor, levelStore, useLevels, type StatusLevel } from "@/lib/level-store";
import { useOperatorName } from "@/hooks/use-auth";

const today = () => new Date().toISOString().slice(0, 10);

export function LevelConfigPage() {
  const levels = useLevels();
  const operator = useOperatorName();
  const [editing, setEditing] = useState<StatusLevel | null>(null);
  const [creating, setCreating] = useState(false);

  const remove = (id: string) => {
    if (!confirm("Delete this level?")) return;
    levelStore.remove(id);
  };

  return (
    <div className="bg-panel border border-panel-border rounded-md min-h-[calc(100vh-140px)]">
      <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30">
        <div className="text-[13px] font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-info" /> Level config
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[12px] flex items-center gap-1 hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" /> New level
        </button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>
              {["Name", "Description", "Restrictions", "Status", "Created", "Updated", "Operators", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => {
              const operators = Array.from(new Set([l.createdBy, l.updatedBy])).join(", ");
              const restrictions = [
                l.blockLogin && "No login",
                l.blockWithdraw && "No withdraw",
                l.blockBonus && "No bonus",
                l.blockDeposit && "No deposit",
              ].filter(Boolean) as string[];
              return (
                <tr key={l.id} className="border-t border-panel-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: levelColor(l) }} />
                      {l.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-foreground/80 max-w-[320px] truncate">{l.description || "—"}</td>
                  <td className="px-3 py-2">
                    {restrictions.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {restrictions.map((r) => (
                          <span key={r} className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] bg-danger/15 text-danger">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                      <span
                        className={
                          "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] " +
                          (l.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground/70")
                        }
                      >
                        {l.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                      {l.createdBy} · {l.createdAt}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                      {l.updatedBy} · {l.updatedAt}
                    </td>
                    <td className="px-3 py-2 text-[11px]">{operators}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit"
                          onClick={() => setEditing(l)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-muted/60 text-foreground/70"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title={l.isActive ? "Deactivate" : "Activate"}
                          onClick={() => levelStore.toggle(l.id, operator)}
                          className={
                            "h-7 w-7 inline-flex items-center justify-center rounded-sm " +
                            (l.isActive ? "hover:bg-danger/10 text-danger" : "hover:bg-success/10 text-success")
                          }
                        >
                          {l.isActive ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      <button
                        title="Delete"
                        onClick={() => remove(l.id)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-danger/10 text-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      </div>
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(editing || creating) && (
        <LevelEditor
          level={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(l) => {
            levelStore.upsert(l, operator);
            setEditing(null);
            setCreating(false);
          }}
          operator={operator}
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full h-8 px-2 rounded-sm border border-panel-border bg-background text-[12.5px] focus:outline-none focus:border-info";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function LevelEditor({
  level,
  onClose,
  onSave,
  operator,
}: {
  level: StatusLevel | null;
  onClose: () => void;
  onSave: (l: StatusLevel) => void;
  operator: string;
}) {
  const now = today();
  const [f, setF] = useState<StatusLevel>(
    level ?? {
      id: "",
      name: "",
      description: "",
      blockWithdraw: false,
      blockBonus: false,
      blockDeposit: false,
      blockLogin: false,
      isActive: true,
      createdAt: now,
      createdBy: operator,
      updatedAt: now,
      updatedBy: operator,
    },
  );

  const toggle = (k: keyof StatusLevel) => setF((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-panel border border-panel-border rounded-md w-full max-w-md max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30 sticky top-0">
          <div className="text-[13px] font-semibold">{level ? `Edit ${level.name}` : "New level"}</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
        </div>

        <div className="p-4 grid grid-cols-1 gap-3 text-[12.5px]">
          <Field label="Name">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="e.g. Withdrawal Block" />
          </Field>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls + " h-20 py-1.5"} placeholder="Short explanation shown to operators" />
          </Field>

          <div className="rounded-sm border border-panel-border p-2 space-y-1.5">
            <div className="text-[11.5px] text-muted-foreground mb-1">
              Restrictions <span className="opacity-70">(color is derived automatically)</span>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.blockLogin} onChange={() => toggle("blockLogin")} />
              <span>Block from entering the game</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.blockWithdraw} onChange={() => toggle("blockWithdraw")} />
              <span>Block withdrawals</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.blockBonus} onChange={() => toggle("blockBonus")} />
              <span>Block bonuses</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.blockDeposit} onChange={() => toggle("blockDeposit")} />
              <span>Block deposits</span>
            </label>
            <div className="flex items-center gap-2 pt-1 text-[11.5px] text-muted-foreground">
              Preview:
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: levelColor(f) }} />
              <span style={{ color: levelColor(f) }}>{f.name || "(unnamed)"}</span>
            </div>
          </div>

          <Field label="Status">
            <label className="inline-flex items-center gap-2 h-8">
              <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
              <span>{f.isActive ? "Active" : "Inactive"}</span>
            </label>
          </Field>
        </div>

        <div className="px-4 py-3 border-t border-panel-border flex justify-end gap-2 sticky bottom-0 bg-panel">
          <button onClick={onClose} className="h-8 px-4 rounded-sm border border-panel-border text-[12.5px] hover:bg-muted/40">
            Cancel
          </button>
          <button
            disabled={!f.name.trim()}
            onClick={() => onSave({ ...f, updatedAt: now, updatedBy: operator })}
            className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-[12.5px] hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
