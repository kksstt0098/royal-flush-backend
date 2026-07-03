import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { RichEditor } from "./RichEditor";

type Banner = {
  id: string;
  name: string;
  image_url: string;
  content_html: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  category_id: string | null;
};

type FormState = {
  id?: string;
  name: string;
  image_url: string;
  content_html: string;
  sort_order: number;
  active: boolean;
  category_id: string | null;
};

const emptyForm: FormState = {
  name: "",
  image_url: "",
  content_html: "",
  sort_order: 0,
  active: true,
  category_id: null,
};

const db = supabase.from("promo_banners" as never) as any;
const catDb = supabase.from("ads_categories") as any;

type CategoryOption = { id: string; name: string; active: boolean };

export function PromoBannerPage() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, catRes] = await Promise.all([
      db
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
      catDb
      .select("id,name,active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    ]);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Banner[]);
    if (!catRes.error) setCategories((catRes.data ?? []) as CategoryOption[]);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 1 });
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm({
      id: b.id,
      name: b.name,
      image_url: b.image_url,
      content_html: b.content_html ?? "",
      sort_order: b.sort_order,
      active: b.active,
      category_id: b.category_id ?? null,
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
      const path = `hero/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("promo-banners")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("promo-banners")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, image_url: signed.data.signedUrl }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.image_url) return toast.error("Hero image is required");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      image_url: form.image_url,
      content_html: form.content_html,
      sort_order: form.sort_order,
      active: form.active,
      category_id: form.category_id,
    };
    const q = form.id
      ? await db.update(payload).eq("id", form.id)
      : await db.insert(payload);
    setSaving(false);
    if (q.error) return toast.error(q.error.message);
    toast.success(form.id ? "Promo banner updated" : "Promo banner created");
    close();
    load();
  };

  const remove = async (b: Banner) => {
    if (!confirm(`Delete promo banner "${b.name}"?`)) return;
    const { error } = await db.delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const move = async (b: Banner, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === b.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    const a = await db.update({ sort_order: swap.sort_order }).eq("id", b.id);
    const c = await db.update({ sort_order: b.sort_order }).eq("id", swap.id);
    if (a.error || c.error) return toast.error((a.error ?? c.error).message);
    load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await db.update({ active: !b.active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-panel-border rounded-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Promo Banner</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage promotional banners with rich content (tables, images, colors, formatting).
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Promo
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left p-2 w-16">Order</th>
              <th className="text-left p-2 w-28">Preview</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2 w-40">Category</th>
              <th className="text-left p-2 w-20">Status</th>
              <th className="text-right p-2 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No promo banners yet. Click “New Promo” to add one.
                </td>
              </tr>
            ) : (
              rows.map((b, i) => (
                <tr key={b.id} className="border-t border-panel-border">
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-center">{b.sort_order}</span>
                      <div className="flex flex-col">
                        <button
                          disabled={i === 0}
                          onClick={() => move(b, -1)}
                          className="disabled:opacity-30 hover:text-primary"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={i === rows.length - 1}
                          onClick={() => move(b, 1)}
                          className="disabled:opacity-30 hover:text-primary"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    <img
                      src={b.image_url}
                      alt={b.name}
                      className="w-24 h-12 object-cover rounded-sm border border-panel-border bg-muted"
                    />
                  </td>
                  <td className="p-2 font-medium">{b.name}</td>
                  <td className="p-2 text-muted-foreground">
                    {categories.find((c) => c.id === b.category_id)?.name ?? (
                      <span className="text-xs italic">Uncategorized</span>
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => toggleActive(b)}
                      className={`px-2 py-0.5 text-xs rounded-sm border ${
                        b.active
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-panel-border"
                      }`}
                    >
                      {b.active ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-panel-border hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => remove(b)}
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
                {form.id ? "Edit Promo Banner" : "New Promo Banner"}
              </h3>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 rounded-sm bg-background border border-panel-border"
                    placeholder="e.g. Weekend cashback"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Sort order
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full px-2 py-1.5 rounded-sm bg-background border border-panel-border"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Hero image
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {form.image_url ? (
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="w-40 h-20 object-cover rounded-sm border border-panel-border bg-muted"
                    />
                  ) : (
                    <div className="w-40 h-20 rounded-sm border border-dashed border-panel-border flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-panel-border hover:bg-muted disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {form.image_url ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Content
                </label>
                <div className="mt-1">
                  <RichEditor
                    value={form.content_html}
                    onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tip: use the toolbar to insert tables, images, and change colors. Hover the
                  color icons to open the palette.
                </p>
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span>Active (visible to players)</span>
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
