import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { PromotionEditor } from "./PromotionEditor";
import {
  emptyPromotionDraft,
  type Promotion,
  type PromotionDraft,
} from "./promotion-types";

const db = supabase.from("promotions" as never) as any;

export function PromotionsPage() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromotionDraft>(emptyPromotionDraft);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Promotion[]);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyPromotionDraft);
    setOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setDraft({
      name: p.name,
      promo_type: p.promo_type,
      status: p.status,
      start_date: p.start_date,
      end_date: p.end_date,
      bonus_config: p.bonus_config ?? {},
      wagering_config: p.wagering_config ?? {},
      game_contribution: p.game_contribution ?? {},
      targeting: p.targeting ?? {},
      link_action: p.link_action,
      redirect_url: p.redirect_url,
    });
    setOpen(true);
  };

  const close = () => setOpen(false);

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = { ...draft, name: draft.name.trim() };
    const q = editingId
      ? await db.update(payload).eq("id", editingId)
      : await db.insert(payload);
    setSaving(false);
    if (q.error) return toast.error(q.error.message);
    toast.success(editingId ? "Promotion updated" : "Promotion created");
    setOpen(false);
    load();
  };

  const remove = async (p: Promotion) => {
    if (!confirm(`Delete promotion "${p.name}"?`)) return;
    const { error } = await db.delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-panel-border rounded-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Promotions</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configurable bonus + wagering + targeting rules. Attach to a banner from Promo
            Banner.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2 w-32">Type</th>
              <th className="text-left p-2 w-24">Status</th>
              <th className="text-left p-2 w-44">Window</th>
              <th className="text-right p-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No promotions yet.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-panel-border">
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2 text-muted-foreground">{p.promo_type}</td>
                  <td className="p-2">
                    <span
                      className={
                        "px-2 py-0.5 text-xs rounded-sm border " +
                        (p.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-panel-border")
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : "—"}
                    {" → "}
                    {p.end_date ? new Date(p.end_date).toLocaleDateString() : "∞"}
                  </td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-panel-border hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-panel-border text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-panel border border-panel-border rounded-sm w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-panel-border">
              <h3 className="text-sm font-semibold">
                {editingId ? "Edit Promotion" : "New Promotion"}
              </h3>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <PromotionEditor value={draft} onChange={setDraft} />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-panel-border">
              <button
                onClick={close}
                className="px-3 py-1.5 text-sm rounded-sm border border-panel-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}