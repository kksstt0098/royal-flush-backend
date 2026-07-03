import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";

type Category = {
  id: string;
  name: string;
  icon_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

type FormState = {
  id?: string;
  name: string;
  icon_url: string;
  sort_order: number;
  active: boolean;
};

const emptyForm: FormState = { name: "", icon_url: "", sort_order: 0, active: true };

const db = supabase.from("ads_categories") as any;

export function AdsCategoryPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Category[]);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 1 });
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setForm({
      id: c.id,
      name: c.name,
      icon_url: c.icon_url ?? "",
      sort_order: c.sort_order,
      active: c.active,
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setForm(emptyForm);
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `category-icons/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("promo-banners")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("promo-banners")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, icon_url: signed.data.signedUrl }));
      toast.success("Icon uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      icon_url: form.icon_url || null,
      sort_order: form.sort_order,
      active: form.active,
    };
    const q = form.id
      ? await db.update(payload).eq("id", form.id)
      : await db.insert(payload);
    setSaving(false);
    if (q.error) return toast.error(q.error.message);
    toast.success(form.id ? "Category updated" : "Category created");
    close();
    load();
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const { error } = await db.delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const move = async (c: Category, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === c.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    const a = await db.update({ sort_order: swap.sort_order }).eq("id", c.id);
    const b = await db.update({ sort_order: c.sort_order }).eq("id", swap.id);
    if (a.error || b.error) return toast.error((a.error ?? b.error).message);
    load();
  };

  const toggleActive = async (c: Category) => {
    const { error } = await db.update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-panel-border rounded-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Ads Category</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Categories act as sidebar buttons in the frontend promo section. Each promo banner
            can be assigned to a category.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left p-2 w-16">Order</th>
              <th className="text-left p-2 w-16">Icon</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2 w-20">Status</th>
              <th className="text-right p-2 w-48">Actions</th>
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
                  No categories yet. Click “New Category” to add one.
                </td>
              </tr>
            ) : (
              rows.map((c, i) => (
                <tr key={c.id} className="border-t border-panel-border">
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-center">{c.sort_order}</span>
                      <div className="flex flex-col">
                        <button
                          disabled={i === 0}
                          onClick={() => move(c, -1)}
                          className="disabled:opacity-30 hover:text-primary"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={i === rows.length - 1}
                          onClick={() => move(c, 1)}
                          className="disabled:opacity-30 hover:text-primary"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    {c.icon_url ? (
                      <img
                        src={c.icon_url}
                        alt={c.name}
                        className="w-8 h-8 object-cover rounded-sm border border-panel-border bg-muted"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-sm border border-dashed border-panel-border flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </td>
                  <td className="p-2 font-medium">{c.name}</td>
                  <td className="p-2">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`px-2 py-0.5 text-xs rounded-sm border ${
                        c.active
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-panel-border"
                      }`}
                    >
                      {c.active ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-panel-border hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => remove(c)}
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-panel border border-panel-border rounded-sm w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-panel-border">
              <h3 className="text-sm font-semibold">
                {form.id ? "Edit Category" : "New Category"}
              </h3>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-sm bg-background border border-panel-border"
                  placeholder="e.g. Daily Bonus"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Icon (small image shown before the button label)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {form.icon_url ? (
                    <img
                      src={form.icon_url}
                      alt="icon"
                      className="w-12 h-12 object-cover rounded-sm border border-panel-border bg-muted"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-sm border border-dashed border-panel-border flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-panel-border hover:bg-muted disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {form.icon_url ? "Replace" : "Upload"}
                  </button>
                  {form.icon_url && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, icon_url: "" }))}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sort order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                  className="mt-1 w-full px-2 py-1.5 rounded-sm bg-background border border-panel-border"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span>Active (visible in frontend sidebar)</span>
              </label>
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
                disabled={saving || uploading}
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