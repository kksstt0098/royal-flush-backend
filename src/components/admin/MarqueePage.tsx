import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Pencil,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Megaphone,
  BarChart3,
  X,
} from "lucide-react";

type Position = "top" | "bottom" | "both";
type Audience = "all" | "players" | "vip" | "new_users" | "staff";

type MarqueeMessage = {
  id: string;
  content: string;
  link_url: string | null;
  position: Position;
  scroll_speed: number;
  priority: number;
  text_color: string;
  background_color: string;
  font_weight: string;
  icon: string | null;
  target_audience: Audience;
  start_at: string;
  end_at: string | null;
  is_active: boolean;
  is_pinned: boolean;
  display_count: number;
  click_count: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

const emptyDraft = (): Partial<MarqueeMessage> => ({
  content: "",
  link_url: "",
  position: "top",
  scroll_speed: 50,
  priority: 0,
  text_color: "#ffffff",
  background_color: "#1e293b",
  font_weight: "normal",
  icon: "",
  target_audience: "all",
  start_at: new Date().toISOString().slice(0, 16),
  end_at: "",
  is_active: true,
  is_pinned: false,
});

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MarqueePage() {
  const [rows, setRows] = useState<MarqueeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "scheduled" | "expired" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<MarqueeMessage> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("marquee_messages")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as MarqueeMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const now = new Date();
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.content.toLowerCase().includes(search.toLowerCase())) return false;
      const start = new Date(r.start_at);
      const end = r.end_at ? new Date(r.end_at) : null;
      const inWindow = start <= now && (!end || end > now);
      if (filter === "active") return r.is_active && inWindow;
      if (filter === "scheduled") return r.is_active && start > now;
      if (filter === "expired") return end && end <= now;
      if (filter === "inactive") return !r.is_active;
      return true;
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    let active = 0,
      scheduled = 0,
      expired = 0,
      totalDisplay = 0,
      totalClick = 0;
    rows.forEach((r) => {
      const start = new Date(r.start_at);
      const end = r.end_at ? new Date(r.end_at) : null;
      if (r.is_active && start <= now && (!end || end > now)) active++;
      else if (r.is_active && start > now) scheduled++;
      else if (end && end <= now) expired++;
      totalDisplay += r.display_count;
      totalClick += r.click_count;
    });
    return { active, scheduled, expired, totalDisplay, totalClick, total: rows.length };
  }, [rows]);

  const preview = useMemo(
    () =>
      rows
        .filter((r) => {
          const start = new Date(r.start_at);
          const end = r.end_at ? new Date(r.end_at) : null;
          return r.is_active && start <= now && (!end || end > now);
        })
        .slice(0, 5),
    [rows],
  );

  const toggle = async (id: string, field: "is_active" | "is_pinned", value: boolean) => {
    const { error } = await (supabase as any)
      .from("marquee_messages")
      .update({ [field]: value })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this marquee message?")) return;
    const { error } = await (supabase as any).from("marquee_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const save = async () => {
    if (!editing) return;
    const content = (editing.content ?? "").trim();
    if (!content) return toast.error("Content required");
    const payload: any = {
      content,
      link_url: editing.link_url?.trim() || null,
      position: editing.position,
      scroll_speed: Number(editing.scroll_speed) || 50,
      priority: Number(editing.priority) || 0,
      text_color: editing.text_color,
      background_color: editing.background_color,
      font_weight: editing.font_weight,
      icon: editing.icon?.trim() || null,
      target_audience: editing.target_audience,
      start_at: editing.start_at ? new Date(editing.start_at).toISOString() : new Date().toISOString(),
      end_at: editing.end_at ? new Date(editing.end_at).toISOString() : null,
      is_active: !!editing.is_active,
      is_pinned: !!editing.is_pinned,
    };
    if (payload.end_at && new Date(payload.end_at) <= new Date(payload.start_at)) {
      return toast.error("End time must be after start time");
    }
    let error;
    if (editing.id) {
      ({ error } = await (supabase as any).from("marquee_messages").update(payload).eq("id", editing.id));
    } else {
      const { data: u } = await supabase.auth.getUser();
      payload.created_by = u.user?.id ?? null;
      payload.created_by_name = u.user?.email?.split("@")[0] ?? "Staff";
      ({ error } = await (supabase as any).from("marquee_messages").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Updated" : "Created");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Marquee Announcements
          </h2>
          <p className="text-xs text-muted-foreground">
            Scheduled scrolling announcements shown across the app.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="h-9 px-3 rounded-sm border border-input bg-background text-sm hover:bg-accent inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setEditing(emptyDraft())}
            className="h-9 px-3 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Marquee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: "Total", v: stats.total },
          { l: "Active", v: stats.active, c: "text-green-500" },
          { l: "Scheduled", v: stats.scheduled, c: "text-blue-500" },
          { l: "Expired", v: stats.expired, c: "text-muted-foreground" },
          { l: "Impressions", v: stats.totalDisplay.toLocaleString() },
          { l: "Clicks", v: stats.totalClick.toLocaleString() },
        ].map((s) => (
          <div key={s.l} className="bg-panel border border-panel-border rounded-md p-3">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`text-xl font-semibold ${(s as any).c ?? ""}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      {preview.length > 0 && (
        <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-panel-border flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Live preview (currently visible)
          </div>
          {preview.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden whitespace-nowrap py-2 px-3 text-sm"
              style={{
                backgroundColor: m.background_color,
                color: m.text_color,
                fontWeight: m.font_weight as any,
              }}
            >
              <span
                className="inline-block"
                style={{
                  animation: `marquee-scroll ${Math.max(5, 120 - m.scroll_speed)}s linear infinite`,
                }}
              >
                {m.icon ? `${m.icon}  ` : ""}
                {m.content}
                <span className="inline-block w-20" />
                {m.content}
              </span>
            </div>
          ))}
          <style>{`@keyframes marquee-scroll { from { transform: translateX(100%); } to { transform: translateX(-100%); } }`}</style>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "active", "scheduled", "expired", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 px-3 rounded-sm text-xs border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"}`}
          >
            {f}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search content…"
          className="ml-auto h-8 px-3 rounded-sm border border-input bg-background text-sm w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-panel border border-panel-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Content</th>
                <th className="text-left px-3 py-2">Audience</th>
                <th className="text-left px-3 py-2">Position</th>
                <th className="text-left px-3 py-2">Window</th>
                <th className="text-right px-3 py-2">Priority</th>
                <th className="text-right px-3 py-2">Impr.</th>
                <th className="text-right px-3 py-2">Clicks</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    No marquee messages.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const start = new Date(r.start_at);
                  const end = r.end_at ? new Date(r.end_at) : null;
                  const inWindow = start <= now && (!end || end > now);
                  const status = !r.is_active
                    ? { l: "Inactive", c: "bg-muted text-muted-foreground" }
                    : start > now
                      ? { l: "Scheduled", c: "bg-blue-500/20 text-blue-500" }
                      : end && end <= now
                        ? { l: "Expired", c: "bg-muted text-muted-foreground" }
                        : { l: "Live", c: "bg-green-500/20 text-green-500" };
                  return (
                    <tr key={r.id} className="border-t border-panel-border hover:bg-muted/30">
                      <td className="px-3 py-2 max-w-md">
                        <div className="flex items-center gap-2">
                          {r.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs truncate max-w-[300px]"
                            style={{ backgroundColor: r.background_color, color: r.text_color }}
                            title={r.content}
                          >
                            {r.icon ? `${r.icon} ` : ""}
                            {r.content}
                          </span>
                        </div>
                        {r.link_url && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[300px]">
                            → {r.link_url}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{r.target_audience}</td>
                      <td className="px-3 py-2 text-xs">{r.position}</td>
                      <td className="px-3 py-2 text-xs">
                        <div>{start.toLocaleString()}</div>
                        <div className="text-muted-foreground">
                          {end ? end.toLocaleString() : "no end"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{r.priority}</td>
                      <td className="px-3 py-2 text-right">{r.display_count.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{r.click_count.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${status.c}`}>{status.l}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            title={r.is_pinned ? "Unpin" : "Pin"}
                            onClick={() => toggle(r.id, "is_pinned", !r.is_pinned)}
                            className="p-1.5 rounded hover:bg-accent"
                          >
                            {r.is_pinned ? (
                              <PinOff className="w-3.5 h-3.5" />
                            ) : (
                              <Pin className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            title={r.is_active ? "Disable" : "Enable"}
                            onClick={() => toggle(r.id, "is_active", !r.is_active)}
                            className="p-1.5 rounded hover:bg-accent"
                          >
                            {r.is_active ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            title="Edit"
                            onClick={() =>
                              setEditing({
                                ...r,
                                start_at: toLocalInput(r.start_at),
                                end_at: toLocalInput(r.end_at),
                              })
                            }
                            className="p-1.5 rounded hover:bg-accent"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => remove(r.id)}
                            className="p-1.5 rounded hover:bg-accent text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Editor modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-panel border border-panel-border rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
              <h3 className="font-semibold">{editing.id ? "Edit Marquee" : "New Marquee"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-accent rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Preview */}
              <div
                className="overflow-hidden whitespace-nowrap py-2 px-3 text-sm rounded border border-panel-border"
                style={{
                  backgroundColor: editing.background_color,
                  color: editing.text_color,
                  fontWeight: editing.font_weight as any,
                }}
              >
                {editing.icon ? `${editing.icon}  ` : ""}
                {editing.content || "Preview text here…"}
              </div>

              <Field label="Content *">
                <textarea
                  value={editing.content ?? ""}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm"
                  placeholder="🎉 New promotion: 100% welcome bonus…"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Link URL (optional)">
                  <input
                    value={editing.link_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                    className="w-full h-9 px-3 rounded-sm border border-input bg-background text-sm"
                    placeholder="/promotions/welcome"
                  />
                </Field>
                <Field label="Icon (emoji, optional)">
                  <input
                    value={editing.icon ?? ""}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    maxLength={4}
                    className="w-full h-9 px-3 rounded-sm border border-input bg-background text-sm"
                    placeholder="🎉"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Position">
                  <select
                    value={editing.position}
                    onChange={(e) => setEditing({ ...editing, position: e.target.value as Position })}
                    className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="both">Both</option>
                  </select>
                </Field>
                <Field label="Audience">
                  <select
                    value={editing.target_audience}
                    onChange={(e) =>
                      setEditing({ ...editing, target_audience: e.target.value as Audience })
                    }
                    className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
                  >
                    <option value="all">All</option>
                    <option value="players">Players</option>
                    <option value="vip">VIP only</option>
                    <option value="new_users">New users</option>
                    <option value="staff">Staff</option>
                  </select>
                </Field>
                <Field label="Font weight">
                  <select
                    value={editing.font_weight}
                    onChange={(e) => setEditing({ ...editing, font_weight: e.target.value })}
                    className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="500">Medium</option>
                    <option value="bold">Bold</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`Scroll speed (${editing.scroll_speed})`}>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    value={editing.scroll_speed}
                    onChange={(e) =>
                      setEditing({ ...editing, scroll_speed: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <Field label="Priority (higher shows first)">
                  <input
                    type="number"
                    value={editing.priority}
                    onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-sm border border-input bg-background text-sm"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Text color">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editing.text_color}
                      onChange={(e) => setEditing({ ...editing, text_color: e.target.value })}
                      className="h-9 w-14 rounded-sm border border-input bg-background"
                    />
                    <input
                      value={editing.text_color}
                      onChange={(e) => setEditing({ ...editing, text_color: e.target.value })}
                      className="flex-1 h-9 px-3 rounded-sm border border-input bg-background text-sm"
                    />
                  </div>
                </Field>
                <Field label="Background color">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editing.background_color}
                      onChange={(e) =>
                        setEditing({ ...editing, background_color: e.target.value })
                      }
                      className="h-9 w-14 rounded-sm border border-input bg-background"
                    />
                    <input
                      value={editing.background_color}
                      onChange={(e) =>
                        setEditing({ ...editing, background_color: e.target.value })
                      }
                      className="flex-1 h-9 px-3 rounded-sm border border-input bg-background text-sm"
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time">
                  <input
                    type="datetime-local"
                    value={editing.start_at as string}
                    onChange={(e) => setEditing({ ...editing, start_at: e.target.value })}
                    className="w-full h-9 px-3 rounded-sm border border-input bg-background text-sm"
                  />
                </Field>
                <Field label="End time (blank = no expiry)">
                  <input
                    type="datetime-local"
                    value={(editing.end_at as string) ?? ""}
                    onChange={(e) => setEditing({ ...editing, end_at: e.target.value })}
                    className="w-full h-9 px-3 rounded-sm border border-input bg-background text-sm"
                  />
                </Field>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.is_pinned}
                    onChange={(e) => setEditing({ ...editing, is_pinned: e.target.checked })}
                  />
                  Pin to top
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-panel-border">
              <button
                onClick={() => setEditing(null)}
                className="h-9 px-4 rounded-sm border border-input bg-background text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                {editing.id ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}