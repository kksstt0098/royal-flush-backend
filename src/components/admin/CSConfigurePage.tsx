import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail as MailIcon,
  Send,
  Headphones,
  Link2,
} from "lucide-react";

type Channel =
  | "telegram"
  | "whatsapp"
  | "livechat"
  | "viber"
  | "messenger"
  | "line"
  | "wechat"
  | "email"
  | "phone"
  | "url";
type Audience = "all" | "players" | "staff";
type Position = "floating" | "header" | "footer" | "menu";

type CSRow = {
  id: string;
  channel: Channel;
  label: string;
  url: string;
  icon: string | null;
  color: string | null;
  bg_color: string | null;
  open_in_new_tab: boolean;
  audience: Audience;
  position: Position;
  display_order: number;
  enabled: boolean;
  remark: string | null;
  updated_at: string;
};

const CHANNELS: {
  key: Channel;
  label: string;
  icon: typeof MessageCircle;
  color: string;
  bg: string;
  urlHint: string;
}[] = [
  { key: "telegram", label: "Telegram", icon: Send, color: "#ffffff", bg: "#229ED9", urlHint: "https://t.me/yourhandle" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#ffffff", bg: "#25D366", urlHint: "https://wa.me/9591234567" },
  { key: "livechat", label: "Live Chat", icon: Headphones, color: "#ffffff", bg: "#6366f1", urlHint: "https://livechat.example.com" },
  { key: "viber", label: "Viber", icon: MessageCircle, color: "#ffffff", bg: "#7360F2", urlHint: "viber://chat?number=%2B95..." },
  { key: "messenger", label: "Messenger", icon: MessageCircle, color: "#ffffff", bg: "#0084FF", urlHint: "https://m.me/yourpage" },
  { key: "line", label: "LINE", icon: MessageCircle, color: "#ffffff", bg: "#06C755", urlHint: "https://line.me/ti/p/~yourid" },
  { key: "wechat", label: "WeChat", icon: MessageCircle, color: "#ffffff", bg: "#07C160", urlHint: "weixin://..." },
  { key: "email", label: "Email", icon: MailIcon, color: "#ffffff", bg: "#ef4444", urlHint: "mailto:support@example.com" },
  { key: "phone", label: "Phone", icon: Phone, color: "#ffffff", bg: "#22c55e", urlHint: "tel:+959..." },
  { key: "url", label: "Custom Link", icon: Link2, color: "#ffffff", bg: "#6b7280", urlHint: "https://..." },
];

const channelMeta = (c: Channel) => CHANNELS.find((x) => x.key === c)!;

const emptyRow = (): Omit<CSRow, "id" | "updated_at"> => ({
  channel: "telegram",
  label: "Telegram",
  url: "",
  icon: null,
  color: "#ffffff",
  bg_color: "#229ED9",
  open_in_new_tab: true,
  audience: "all",
  position: "floating",
  display_order: 0,
  enabled: true,
  remark: null,
});

const sb = supabase as unknown as {
  from: (t: string) => any;
};

export function CSConfigurePage() {
  const [rows, setRows] = useState<CSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<CSRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("cs_configs")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) setErr(error.message);
    else setRows((data ?? []) as CSRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.enabled).length,
      floating: rows.filter((r) => r.position === "floating" && r.enabled).length,
    }),
    [rows],
  );

  const toggleEnabled = async (r: CSRow) => {
    const { error } = await sb
      .from("cs_configs")
      .update({ enabled: !r.enabled })
      .eq("id", r.id);
    if (error) alert(error.message);
    else load();
  };

  const move = async (r: CSRow, dir: -1 | 1) => {
    const idx = rows.findIndex((x) => x.id === r.id);
    const target = rows[idx + dir];
    if (!target) return;
    await sb.from("cs_configs").update({ display_order: target.display_order }).eq("id", r.id);
    await sb.from("cs_configs").update({ display_order: r.display_order }).eq("id", target.id);
    load();
  };

  const remove = async (r: CSRow) => {
    if (!confirm(`Delete "${r.label}"?`)) return;
    const { error } = await sb.from("cs_configs").delete().eq("id", r.id);
    if (error) alert(error.message);
    else load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Customer Service Configure</h2>
          <p className="text-xs text-muted-foreground">
            Manage the CS buttons and links shown on the player frontend (floating widget, header, footer, or menu).
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-9 px-3 rounded-sm bg-primary text-primary-foreground text-sm flex items-center gap-1 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Add CS Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} tone="success" />
        <StatCard label="Floating Widget" value={stats.floating} tone="info" />
      </div>

      {/* Live Preview */}
      <div className="bg-panel border border-panel-border rounded-md p-4">
        <div className="text-xs text-muted-foreground mb-2">Live Preview (floating widget)</div>
        <div className="relative min-h-[120px] rounded-sm border border-dashed border-panel-border bg-background/40">
          <div className="absolute bottom-3 right-3 flex flex-col gap-2">
            {rows
              .filter((r) => r.enabled && r.position === "floating")
              .map((r) => {
                const meta = channelMeta(r.channel);
                const Icon = meta.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    title={r.label}
                    className="w-11 h-11 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                    style={{
                      background: r.bg_color ?? meta.bg,
                      color: r.color ?? meta.color,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            {rows.filter((r) => r.enabled && r.position === "floating").length === 0 && (
              <div className="text-[11px] text-muted-foreground">No floating buttons enabled</div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 w-14">Order</th>
                <th className="text-left px-3 py-2">Channel</th>
                <th className="text-left px-3 py-2">Label</th>
                <th className="text-left px-3 py-2">URL</th>
                <th className="text-left px-3 py-2">Position</th>
                <th className="text-left px-3 py-2">Audience</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2 w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    No CS links configured yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const meta = channelMeta(r.channel);
                  const Icon = meta.icon;
                  return (
                    <tr key={r.id} className="border-t border-panel-border">
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => move(r, -1)}
                            disabled={i === 0}
                            className="disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => move(r, 1)}
                            disabled={i === rows.length - 1}
                            className="disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              background: r.bg_color ?? meta.bg,
                              color: r.color ?? meta.color,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium">{r.label}</td>
                      <td className="px-3 py-2 max-w-[260px]">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info flex items-center gap-1 truncate hover:underline"
                        >
                          <span className="truncate">{r.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-2 capitalize">{r.position}</td>
                      <td className="px-3 py-2 capitalize">{r.audience}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => toggleEnabled(r)}
                          className={
                            "px-2 h-6 rounded-sm text-[11px] " +
                            (r.enabled
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {r.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditing(r)}
                            className="h-7 px-2 rounded-sm border border-input hover:bg-accent flex items-center gap-1 text-xs"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => remove(r)}
                            className="h-7 px-2 rounded-sm border border-input hover:bg-red-50 hover:text-red-600 flex items-center gap-1 text-xs"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {err && <div className="text-xs text-red-600">{err}</div>}

      {(editing || creating) && (
        <EditorModal
          initial={editing ?? { id: "", updated_at: "", ...emptyRow(), display_order: rows.length }}
          isNew={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "info";
}) {
  const color =
    tone === "success" ? "text-green-600" : tone === "info" ? "text-info" : "text-foreground";
  return (
    <div className="bg-panel border border-panel-border rounded-md p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"text-xl font-semibold " + color}>{value}</div>
    </div>
  );
}

function EditorModal({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: CSRow;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CSRow>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const meta = channelMeta(form.channel);
  const Icon = meta.icon;

  const set = <K extends keyof CSRow>(k: K, v: CSRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pickChannel = (c: Channel) => {
    const m = channelMeta(c);
    setForm((f) => ({
      ...f,
      channel: c,
      label: isNew || f.label === channelMeta(f.channel).label ? m.label : f.label,
      color: f.color ?? m.color,
      bg_color: f.bg_color ?? m.bg,
    }));
  };

  const save = async () => {
    if (!form.label.trim() || !form.url.trim()) {
      setErr("Label and URL are required");
      return;
    }
    setSaving(true);
    setErr("");
    const payload = {
      channel: form.channel,
      label: form.label.trim(),
      url: form.url.trim(),
      icon: form.icon,
      color: form.color,
      bg_color: form.bg_color,
      open_in_new_tab: form.open_in_new_tab,
      audience: form.audience,
      position: form.position,
      display_order: form.display_order,
      enabled: form.enabled,
      remark: form.remark,
    };
    const q = isNew
      ? sb.from("cs_configs").insert(payload)
      : sb.from("cs_configs").update(payload).eq("id", form.id);
    const { error } = await q;
    setSaving(false);
    if (error) setErr(error.message);
    else onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 h-11 border-b border-panel-border">
          <div className="text-sm font-semibold">{isNew ? "Add CS Link" : "Edit CS Link"}</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Channel picker */}
          <div>
            <label className="text-xs text-muted-foreground">Channel</label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {CHANNELS.map((c) => {
                const CIcon = c.icon;
                const active = form.channel === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => pickChannel(c.key)}
                    className={
                      "h-14 rounded-sm border flex flex-col items-center justify-center gap-1 text-[11px] " +
                      (active
                        ? "border-info bg-info/5 text-info"
                        : "border-input hover:bg-accent")
                    }
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: c.bg, color: c.color }}
                    >
                      <CIcon className="w-3 h-3" />
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Label</label>
              <input
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                className="w-full h-9 px-2 mt-1 rounded-sm border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">URL</label>
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder={meta.urlHint}
                className="w-full h-9 px-2 mt-1 rounded-sm border border-input bg-background text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Position</label>
              <select
                value={form.position}
                onChange={(e) => set("position", e.target.value as Position)}
                className="w-full h-9 px-2 mt-1 rounded-sm border border-input bg-background text-sm"
              >
                <option value="floating">Floating widget</option>
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="menu">Menu</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Audience</label>
              <select
                value={form.audience}
                onChange={(e) => set("audience", e.target.value as Audience)}
                className="w-full h-9 px-2 mt-1 rounded-sm border border-input bg-background text-sm"
              >
                <option value="all">All visitors</option>
                <option value="players">Signed-in players</option>
                <option value="staff">Staff only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Display order</label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => set("display_order", Number(e.target.value))}
                className="w-full h-9 px-2 mt-1 rounded-sm border border-input bg-background text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Icon color</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={form.color ?? "#ffffff"}
                  onChange={(e) => set("color", e.target.value)}
                  className="h-9 w-12 rounded-sm border border-input bg-background"
                />
                <input
                  value={form.color ?? ""}
                  onChange={(e) => set("color", e.target.value)}
                  className="flex-1 h-9 px-2 rounded-sm border border-input bg-background text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Background color</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={form.bg_color ?? "#000000"}
                  onChange={(e) => set("bg_color", e.target.value)}
                  className="h-9 w-12 rounded-sm border border-input bg-background"
                />
                <input
                  value={form.bg_color ?? ""}
                  onChange={(e) => set("bg_color", e.target.value)}
                  className="flex-1 h-9 px-2 rounded-sm border border-input bg-background text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.open_in_new_tab}
                onChange={(e) => set("open_in_new_tab", e.target.checked)}
              />
              Open in new tab
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
              />
              Enabled
            </label>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Remark (internal)</label>
            <textarea
              value={form.remark ?? ""}
              onChange={(e) => set("remark", e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full px-2 py-2 mt-1 rounded-sm border border-input bg-background text-sm"
            />
          </div>

          {/* Preview */}
          <div className="border border-panel-border rounded-sm p-3 bg-background/40">
            <div className="text-[11px] text-muted-foreground mb-2">Preview</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-md"
                style={{
                  background: form.bg_color ?? meta.bg,
                  color: form.color ?? meta.color,
                }}
              >
                <Icon className="w-5 h-5" />
              </button>
              <div className="text-xs">
                <div className="font-medium">{form.label || "(no label)"}</div>
                <div className="text-muted-foreground font-mono truncate max-w-[280px]">
                  {form.url || "(no url)"}
                </div>
              </div>
            </div>
          </div>

          {err && <div className="text-xs text-red-600">{err}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 h-12 border-t border-panel-border">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-sm border border-input text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}