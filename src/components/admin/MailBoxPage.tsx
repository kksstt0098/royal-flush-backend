import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Users,
  User,
  ListOrdered,
  FileText,
  Zap,
  ClipboardList,
} from "lucide-react";

// -------------------- shared types --------------------
type CampaignStatus =
  | "draft"
  | "scheduled"
  | "dispatching"
  | "sent"
  | "expired"
  | "cancelled"
  | "failed";
type RecipientType = "all_users" | "single_user" | "bulk_users" | "event";
type EventKind =
  | "user_registered"
  | "deposit_approved"
  | "withdrawal_approved"
  | "withdrawal_rejected";

type Campaign = {
  id: string;
  recipient_type: RecipientType;
  subject: string;
  body_html: string;
  send_time: string;
  end_time: string | null;
  status: CampaignStatus;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_by_name: string | null;
  event_kind: EventKind | null;
  created_at: string;
};

type Template = {
  id: string;
  code: string;
  name: string;
  subject: string;
  body_html: string;
  active: boolean;
};

type Rule = {
  id: string;
  event_kind: EventKind;
  template_id: string;
  active: boolean;
  priority: number;
};

type AuditRow = {
  id: number;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

const sb = supabase as any;

const statusColor: Record<CampaignStatus, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  scheduled: "bg-amber-500/20 text-amber-300",
  dispatching: "bg-blue-500/20 text-blue-300",
  sent: "bg-emerald-500/20 text-emerald-300",
  expired: "bg-zinc-500/20 text-zinc-300",
  cancelled: "bg-rose-500/20 text-rose-300",
  failed: "bg-rose-600/30 text-rose-200",
};

const eventKinds: EventKind[] = [
  "user_registered",
  "deposit_approved",
  "withdrawal_approved",
  "withdrawal_rejected",
];

// -------------------- root --------------------
type Tab = "compose" | "history" | "templates" | "rules" | "audit";

export function MailBoxPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "compose", label: "Compose", icon: Send },
    { id: "history", label: "History", icon: ListOrdered },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "rules", label: "Auto Rules", icon: Zap },
    { id: "audit", label: "Audit Log", icon: ClipboardList },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-panel-border rounded-md p-4">
        <h2 className="text-base font-semibold mb-1">Mail Box</h2>
        <p className="text-xs text-muted-foreground">
          Broadcast, targeted, scheduled & event-triggered in-game mail.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-panel-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition " +
                (active
                  ? "border-primary text-foreground bg-panel"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "compose" && <ComposeTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

// -------------------- Compose --------------------
function ComposeTab() {
  const [recipientType, setRecipientType] = useState<RecipientType>("all_users");
  const [singleUser, setSingleUser] = useState<{ id: string; nick: string } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Array<{ id: string; nick: string | null; email: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<{ valid: string[]; invalid: string[] } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendTime, setSendTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    sb.from("mail_templates")
      .select("id,code,name,subject,body_html,active")
      .eq("active", true)
      .order("name")
      .then(({ data }: any) => setTemplates((data ?? []) as Template[]));
  }, []);

  // debounce user search
  useEffect(() => {
    if (recipientType !== "single_user" || !userSearch.trim()) {
      setUserResults([]);
      return;
    }
    const q = userSearch.trim();
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await sb
        .from("profiles")
        .select("id,nick,email")
        .or(`nick.ilike.%${q}%,email.ilike.%${q}%,id.eq.${uuidLike(q) ? q : "00000000-0000-0000-0000-000000000000"}`)
        .limit(15);
      setSearching(false);
      setUserResults((data ?? []) as any[]);
    }, 250);
    return () => clearTimeout(t);
  }, [userSearch, recipientType]);

  const validateBulk = () => {
    const ids = bulkText
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(ids));
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const id of uniq) (uuidLike(id) ? valid : invalid).push(id);
    setBulkPreview({ valid, invalid });
  };

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body_html);
    }
  };

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    let ids: string[] | null = null;
    if (recipientType === "single_user") {
      if (!singleUser) return toast.error("Pick a user first");
      ids = [singleUser.id];
    } else if (recipientType === "bulk_users") {
      if (!bulkPreview?.valid.length) return toast.error("Validate the ID list first");
      ids = bulkPreview.valid;
    }

    setSending(true);
    const { data, error } = await sb.rpc("mail_create_campaign", {
      _recipient_type: recipientType,
      _recipient_ids: ids,
      _template_id: templateId || null,
      _subject: subject,
      _body_html: body,
      _template_data: {},
      _send_time: sendTime ? new Date(sendTime).toISOString() : new Date().toISOString(),
      _end_time: endTime ? new Date(endTime).toISOString() : null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Campaign queued (${data})`);
    setSubject("");
    setBody("");
    setSingleUser(null);
    setBulkText("");
    setBulkPreview(null);
    setSendTime("");
    setEndTime("");
    setTemplateId("");
  };

  return (
    <div className="bg-panel border border-panel-border rounded-md p-4 space-y-4">
      {/* Recipient selector */}
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Recipients
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <RecipientRadio
            selected={recipientType === "all_users"}
            onClick={() => setRecipientType("all_users")}
            icon={Users}
            title="Broadcast"
            hint="All players"
          />
          <RecipientRadio
            selected={recipientType === "single_user"}
            onClick={() => setRecipientType("single_user")}
            icon={User}
            title="Single User"
            hint="Search by name / id"
          />
          <RecipientRadio
            selected={recipientType === "bulk_users"}
            onClick={() => setRecipientType("bulk_users")}
            icon={ListOrdered}
            title="Bulk"
            hint="Paste user IDs"
          />
        </div>
      </div>

      {recipientType === "single_user" && (
        <div>
          <label className="text-xs text-muted-foreground">Search player</label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Nick, email, or user id"
              className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-panel-border rounded"
            />
            {searching && (
              <Loader2 className="w-4 h-4 absolute right-2 top-2.5 animate-spin text-muted-foreground" />
            )}
          </div>
          {singleUser ? (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
              <User className="w-3 h-3" />
              {singleUser.nick} · {singleUser.id.slice(0, 8)}…
              <button onClick={() => setSingleUser(null)}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            userResults.length > 0 && (
              <div className="mt-1 border border-panel-border rounded max-h-48 overflow-auto">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSingleUser({ id: u.id, nick: u.nick ?? u.email ?? u.id });
                      setUserResults([]);
                      setUserSearch("");
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-panel-border/40 flex justify-between"
                  >
                    <span>{u.nick ?? "—"}</span>
                    <span className="text-muted-foreground">{u.email ?? u.id.slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {recipientType === "bulk_users" && (
        <div>
          <label className="text-xs text-muted-foreground">
            Paste user IDs (comma / space / newline separated, max 100k)
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              setBulkPreview(null);
            }}
            rows={4}
            className="w-full mt-1 px-2 py-1.5 text-xs font-mono bg-background border border-panel-border rounded"
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={validateBulk}
              className="px-2 py-1 text-xs border border-panel-border rounded hover:bg-panel-border/40"
            >
              Validate
            </button>
            {bulkPreview && (
              <span className="text-xs text-muted-foreground">
                ✓ {bulkPreview.valid.length} valid · ✗ {bulkPreview.invalid.length} invalid
              </span>
            )}
          </div>
        </div>
      )}

      {/* Template picker */}
      <div>
        <label className="text-xs text-muted-foreground">Template (optional)</label>
        <select
          value={templateId}
          onChange={(e) => pickTemplate(e.target.value)}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
        >
          <option value="">— Free-form —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code})
            </option>
          ))}
        </select>
      </div>

      {/* Subject + body */}
      <div>
        <label className="text-xs text-muted-foreground">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Body (HTML supported)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
        />
      </div>

      {/* Schedule + expiry */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Send at (optional)</label>
          <input
            type="datetime-local"
            value={sendTime}
            onChange={(e) => setSendTime(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Expires at (optional)</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-panel-border pt-3">
        <button
          onClick={send}
          disabled={sending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sendTime ? "Schedule" : "Send now"}
        </button>
      </div>
    </div>
  );
}

function RecipientRadio({
  selected,
  onClick,
  icon: Icon,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "text-left border rounded-md p-3 transition " +
        (selected
          ? "border-primary bg-primary/10"
          : "border-panel-border hover:border-primary/40")
      }
    >
      <Icon className="w-4 h-4 mb-1" />
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </button>
  );
}

// -------------------- History --------------------
function HistoryTab() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    let query = sb
      .from("mail_campaigns")
      .select(
        "id,recipient_type,subject,body_html,send_time,end_time,status,total_recipients,delivered_count,read_count,failed_count,created_by_name,event_kind,created_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("subject", `%${q}%`);
    if (from) query = query.gte("created_at", new Date(from).toISOString());
    if (to) query = query.lte("created_at", new Date(to).toISOString());
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Campaign[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const del = async (id: string) => {
    if (!confirm("Soft-delete this campaign?")) return;
    const { error } = await sb.rpc("mail_soft_delete_campaign", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="bg-panel border border-panel-border rounded-md p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Search subject</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="block mt-1 px-2 py-1 text-sm bg-background border border-panel-border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="block mt-1 px-2 py-1 text-sm bg-background border border-panel-border rounded"
          >
            <option value="">All</option>
            <option>scheduled</option>
            <option>dispatching</option>
            <option>sent</option>
            <option>expired</option>
            <option>cancelled</option>
            <option>failed</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block mt-1 px-2 py-1 text-sm bg-background border border-panel-border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block mt-1 px-2 py-1 text-sm bg-background border border-panel-border rounded"
          />
        </div>
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-panel-border rounded hover:bg-panel-border/40"
        >
          <RefreshCw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      <div className="overflow-auto border border-panel-border rounded">
        <table className="w-full text-xs">
          <thead className="bg-panel-border/40">
            <tr>
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Subject</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Recipients</th>
              <th className="text-right p-2">Read</th>
              <th className="text-left p-2">Sender</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const readRate = r.total_recipients
                ? Math.round((r.read_count / r.total_recipients) * 100)
                : 0;
              return (
                <tr key={r.id} className="border-t border-panel-border/60">
                  <td className="p-2 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 max-w-xs truncate">{r.subject}</td>
                  <td className="p-2">
                    {r.event_kind ? (
                      <span className="text-blue-300">event · {r.event_kind}</span>
                    ) : (
                      r.recipient_type
                    )}
                  </td>
                  <td className="p-2">
                    <span className={"px-1.5 py-0.5 rounded text-[10px] " + statusColor[r.status]}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.total_recipients}</td>
                  <td className="p-2 text-right tabular-nums">
                    {r.read_count}
                    <span className="text-muted-foreground"> ({readRate}%)</span>
                  </td>
                  <td className="p-2">{r.created_by_name ?? "—"}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => del(r.id)}
                      className="text-rose-400 hover:text-rose-300"
                      title="Soft-delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No campaigns yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------- Templates --------------------
function TemplatesTab() {
  const [rows, setRows] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await sb
      .from("mail_templates")
      .select("*")
      .order("name");
    setRows((data ?? []) as Template[]);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.code || !editing?.name || !editing?.subject || !editing?.body_html) {
      toast.error("All fields required");
      return;
    }
    setSaving(true);
    const payload = {
      code: editing.code,
      name: editing.name,
      subject: editing.subject,
      body_html: editing.body_html,
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await sb.from("mail_templates").update(payload).eq("id", editing.id)
      : await sb.from("mail_templates").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete template?")) return;
    const { error } = await sb.from("mail_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="bg-panel border border-panel-border rounded-md p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Templates</div>
        <button
          onClick={() =>
            setEditing({ code: "", name: "", subject: "", body_html: "", active: true })
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      <div className="overflow-auto border border-panel-border rounded">
        <table className="w-full text-xs">
          <thead className="bg-panel-border/40">
            <tr>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Subject</th>
              <th className="text-left p-2">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-panel-border/60">
                <td className="p-2 font-mono">{r.code}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-muted-foreground truncate max-w-xs">{r.subject}</td>
                <td className="p-2">{r.active ? "✓" : "—"}</td>
                <td className="p-2 text-right space-x-3">
                  <button
                    onClick={() => setEditing(r)}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button onClick={() => del(r.id)} className="text-rose-400">
                    <Trash2 className="w-3.5 h-3.5 inline" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No templates
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-panel border border-panel-border rounded-md w-full max-w-lg p-4 space-y-3">
            <div className="text-sm font-semibold">
              {editing.id ? "Edit Template" : "New Template"}
            </div>
            <input
              placeholder="code (unique)"
              value={editing.code ?? ""}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              className="w-full px-2 py-1.5 text-sm bg-background border border-panel-border rounded font-mono"
            />
            <input
              placeholder="name"
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
            />
            <input
              placeholder="subject — supports {{variable}}"
              value={editing.subject ?? ""}
              onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              className="w-full px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
            />
            <textarea
              placeholder="body (HTML) — supports {{variable}}"
              value={editing.body_html ?? ""}
              onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
              rows={8}
              className="w-full px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={editing.active ?? true}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-panel-border">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 text-xs border border-panel-border rounded"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- Rules --------------------
function RulesTab() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [event, setEvent] = useState<EventKind>("user_registered");
  const [templateId, setTemplateId] = useState<string>("");

  const load = async () => {
    const [{ data: r }, { data: t }] = await Promise.all([
      sb.from("mail_event_rules").select("*").order("event_kind"),
      sb.from("mail_templates").select("id,code,name,subject,body_html,active"),
    ]);
    setRows((r ?? []) as Rule[]);
    setTemplates((t ?? []) as Template[]);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!templateId) return toast.error("Pick a template");
    const { error } = await sb.from("mail_event_rules").insert({
      event_kind: event,
      template_id: templateId,
      active: true,
      priority: 0,
    });
    if (error) return toast.error(error.message);
    load();
  };
  const toggle = async (id: string, active: boolean) => {
    await sb.from("mail_event_rules").update({ active }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await sb.from("mail_event_rules").delete().eq("id", id);
    load();
  };

  const tmap = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates]);

  return (
    <div className="bg-panel border border-panel-border rounded-md p-4 space-y-3">
      <div className="text-sm font-medium">Auto-mail on events</div>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Event</label>
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value as EventKind)}
            className="block mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
          >
            {eventKinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-muted-foreground">Template</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="block w-full mt-1 px-2 py-1.5 text-sm bg-background border border-panel-border rounded"
          >
            <option value="">— pick template —</option>
            {templates
              .filter((t) => t.active)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>
        <button
          onClick={add}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded"
        >
          <Plus className="w-3.5 h-3.5" /> Add rule
        </button>
      </div>

      <div className="overflow-auto border border-panel-border rounded">
        <table className="w-full text-xs">
          <thead className="bg-panel-border/40">
            <tr>
              <th className="text-left p-2">Event</th>
              <th className="text-left p-2">Template</th>
              <th className="text-left p-2">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-panel-border/60">
                <td className="p-2 font-mono">{r.event_kind}</td>
                <td className="p-2">{tmap[r.template_id]?.name ?? "—"}</td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={(e) => toggle(r.id, e.target.checked)}
                  />
                </td>
                <td className="p-2 text-right">
                  <button onClick={() => remove(r.id)} className="text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No rules yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">
        DB triggers on user registration, deposit approval, and withdrawal approval/rejection
        will fan out through these rules automatically. Wire the triggers in Phase D.
      </div>
    </div>
  );
}

// -------------------- Audit --------------------
function AuditTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("mail_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as AuditRow[]);
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-panel border border-panel-border rounded-md p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Admin audit log</div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-panel-border rounded"
        >
          <RefreshCw className={"w-3 h-3 " + (loading ? "animate-spin" : "")} /> Refresh
        </button>
      </div>
      <div className="overflow-auto border border-panel-border rounded">
        <table className="w-full text-xs">
          <thead className="bg-panel-border/40">
            <tr>
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Actor</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Target</th>
              <th className="text-left p-2">Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-panel-border/60 align-top">
                <td className="p-2 whitespace-nowrap text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-2">{r.actor_name ?? "—"}</td>
                <td className="p-2 font-mono">{r.action}</td>
                <td className="p-2 text-muted-foreground">
                  {r.target_type}
                  {r.target_id ? ` · ${r.target_id.slice(0, 8)}…` : ""}
                </td>
                <td className="p-2 font-mono text-[10px] text-muted-foreground max-w-md truncate">
                  {JSON.stringify(r.meta)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No activity yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function uuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}