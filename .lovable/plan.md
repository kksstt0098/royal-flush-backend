
# Mail Box — Production-Level System Design

လက်ရှိ project က TanStack Start + Lovable Cloud (Postgres + RLS + pgmq + pg_cron) ပေါ်မှာ run နေတယ်။ Redis/RabbitMQ လိုမျိုး external infra မထည့်ဘဲ **Postgres-native queue (pgmq) + pg_cron worker** သုံးပြီး millions-scale mail system တစ်ခုကို build မယ်။ ဒါက Cloudflare Worker runtime နဲ့ကိုက်ညီပြီး ops overhead မရှိဘူး။

---

## 1. System Architecture

```text
                    ┌────────────────────────────────────────┐
                    │           ADMIN PANEL (React)          │
                    │  Compose · History · Templates · Rules │
                    └──────────────┬─────────────────────────┘
                                   │ createServerFn (RLS as admin)
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │                   APPLICATION LAYER                      │
        │  server fns:  send_broadcast · send_single · send_bulk   │
        │               list_history · get_stats · manage_rules    │
        └────────────┬─────────────────────────────────┬───────────┘
                     │ writes                          │ triggers
                     ▼                                 ▼
   ┌────────────────────────────┐        ┌──────────────────────────┐
   │       Postgres (RLS)       │        │  Event Bus (DB triggers) │
   │  mail_campaigns            │◄───────┤  auth.users insert       │
   │  mail_recipients (shards)  │        │  deposits status change  │
   │  mail_templates            │        │  withdrawals status chg  │
   │  mail_event_rules          │        └──────────┬───────────────┘
   │  mail_audit_logs           │                   │ enqueue
   └────────────┬───────────────┘                   ▼
                │                        ┌──────────────────────────┐
                │ enqueue                │       pgmq queues        │
                ├────────────────────────►  mail_dispatch (broadcast│
                │                        │  fan-out jobs)           │
                │                        │  mail_deliver (per-user) │
                │                        └──────────┬───────────────┘
                │                                   │
                ▼                                   ▼
   ┌────────────────────────────┐        ┌──────────────────────────┐
   │    Player Inbox (RLS)      │        │  pg_cron every 30s       │
   │  read via server fn        │◄───────┤  → /api/public/hooks/    │
   │  cached at edge, paginated │        │    mail-worker           │
   └────────────────────────────┘        │  batch=500, parallel=4   │
                                         └──────────────────────────┘
```

**Design choices**
- Campaigns နဲ့ recipient rows ကို ခွဲထား (fan-out on write). Player inbox query က `mail_recipients` တစ်ခုတည်း hit တာမို့ index-friendly, O(log n)။
- pgmq (Postgres-native queue) က Redis/BullMQ replacement — durability, visibility timeout, DLQ, retries built-in။
- Worker route က idempotent, stateless — Cloudflare Worker မှာ run လို့ရ။
- Templates က Mustache-style `{{var}}` interpolation, admin UI ကနေ configure။
- Event rules table က DB trigger → pgmq enqueue → worker က template render ပြီးပို့။

---

## 2. Database Schema

### 2.1 Enums
```sql
CREATE TYPE mail_recipient_type AS ENUM ('all_users','single_user','bulk_users','event');
CREATE TYPE mail_campaign_status AS ENUM ('draft','scheduled','dispatching','sent','expired','cancelled','failed');
CREATE TYPE mail_delivery_status AS ENUM ('pending','delivered','failed','expired','deleted');
CREATE TYPE mail_event_kind AS ENUM (
  'user_registered','deposit_approved','withdrawal_approved','withdrawal_rejected'
);
```

### 2.2 Core tables

**mail_templates** — reusable body + subject with variable schema.
```sql
CREATE TABLE public.mail_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,                 -- 'welcome', 'deposit_ok'
  name text NOT NULL,
  subject text NOT NULL,                     -- 'Welcome {{nick}}'
  body_html text NOT NULL,                   -- rich HTML
  variables jsonb NOT NULL DEFAULT '[]',     -- [{key:'nick',required:true}]
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**mail_campaigns** — one row per admin "send" action (broadcast / single / bulk / event).
```sql
CREATE TABLE public.mail_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type mail_recipient_type NOT NULL,
  recipient_filter jsonb NOT NULL DEFAULT '{}',   -- {vip_min:3, country:'MM'} etc.
  recipient_ids uuid[] NOT NULL DEFAULT '{}',     -- for single/bulk (empty for all)
  template_id uuid REFERENCES public.mail_templates(id),
  subject text NOT NULL,
  body_html text NOT NULL,                        -- rendered template snapshot
  template_data jsonb NOT NULL DEFAULT '{}',      -- variables for per-user render
  send_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,                           -- NULL = never expires
  status mail_campaign_status NOT NULL DEFAULT 'scheduled',
  total_recipients int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  read_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users,
  created_by_name text,
  event_kind mail_event_kind,                     -- non-null for auto mail
  event_ref uuid,                                 -- deposit_id / withdrawal_id etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX ON mail_campaigns (status, send_time) WHERE deleted_at IS NULL;
CREATE INDEX ON mail_campaigns (created_by, created_at DESC);
CREATE INDEX ON mail_campaigns (event_kind, event_ref);
```

**mail_recipients** — one row per (campaign, user). This is what the inbox reads. Partitioned by month for scale.
```sql
CREATE TABLE public.mail_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject text NOT NULL,                          -- per-user rendered
  body_html text NOT NULL,                        -- per-user rendered
  status mail_delivery_status NOT NULL DEFAULT 'pending',
  read_at timestamptz,
  end_time timestamptz,                           -- copied from campaign for fast filter
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Inbox query index: WHERE user_id=? AND status='delivered' AND (end_time IS NULL OR end_time>now())
CREATE INDEX ON mail_recipients (user_id, created_at DESC)
  WHERE status='delivered' AND deleted_at IS NULL;
CREATE INDEX ON mail_recipients (campaign_id);
CREATE UNIQUE INDEX ON mail_recipients (campaign_id, user_id, created_at);
```
Monthly partitions (`mail_recipients_2026_07` …) auto-created by pg_cron job. Old partitions can be detached/archived without table lock.

**mail_event_rules** — admin-configurable event → template mapping.
```sql
CREATE TABLE public.mail_event_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_kind mail_event_kind NOT NULL,
  template_id uuid NOT NULL REFERENCES public.mail_templates(id),
  active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  conditions jsonb NOT NULL DEFAULT '{}',         -- e.g. {min_amount:1000}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_kind, template_id)
);
```

**mail_audit_logs** — every admin action.
```sql
CREATE TABLE public.mail_audit_logs (
  id bigserial PRIMARY KEY,
  actor uuid NOT NULL REFERENCES auth.users,
  actor_name text,
  action text NOT NULL,                           -- 'send_broadcast','delete_campaign'…
  target_type text,                               -- 'campaign','template','rule'
  target_id uuid,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON mail_audit_logs (actor, created_at DESC);
```

### 2.3 RLS (must-have grants)
Every `CREATE TABLE` above ships with:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated;
GRANT ALL ON <table> TO service_role;
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
```
Policies:
- `mail_recipients` — player: `SELECT/UPDATE own row` where `user_id = auth.uid()` AND `deleted_at IS NULL` AND `(end_time IS NULL OR end_time > now())`. Staff (`is_staff`): read all.
- `mail_campaigns` / `mail_templates` / `mail_event_rules` — staff read; admin write (via SECURITY DEFINER RPCs only, direct writes revoked).
- `mail_audit_logs` — insert via SECURITY DEFINER only; admin read.

### 2.4 SECURITY DEFINER RPCs (business logic in DB)
- `mail_create_campaign(_type, _ids, _template, _subject, _body, _data, _send_time, _end_time)` — inserts campaign, enqueues `mail_dispatch` job, writes audit log.
- `mail_mark_read(_recipient_id)` — updates row + increments `read_count` on parent campaign atomically.
- `mail_soft_delete_campaign(_id)` — sets `deleted_at`, cascades soft delete to recipients.
- `mail_expire_due()` — cron helper: flips `sent → expired` for campaigns past `end_time`.
- `mail_enqueue_event(_kind, _user_id, _ref, _vars)` — called by DB triggers on domain tables.

Every RPC: `SET search_path = public`, `SECURITY DEFINER`, `REVOKE EXECUTE FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated`. Role enforcement via `has_role(auth.uid(),'admin')` inside.

---

## 3. Queue & Worker Design (pgmq + pg_cron)

Two queues (created by migration via `pgmq.create()`):
1. **`mail_dispatch`** — one message per campaign. Payload `{campaign_id}`. Worker expands recipient set (all users / bulk / single / event target) and inserts into `mail_recipients` in **batches of 1 000** using `INSERT … SELECT`.
2. **`mail_deliver`** — reserved for future push notification / email/SMS fan-out (channels beyond in-game inbox). Per-recipient message with retry.

**Worker route:** `src/routes/api/public/hooks/mail-worker.ts` (POST). Auth via `apikey` header (project anon key) — the same pattern used by existing email queue.

Worker loop per invocation (Cloudflare Worker CPU-friendly):
```text
1. read_batch('mail_dispatch', vt=60s, qty=10)
2. for each msg:
     campaign = SELECT ... FOR UPDATE SKIP LOCKED
     if campaign.status != 'scheduled' → archive msg
     if send_time > now() → set vt=send_time, continue
     resolve recipient user_ids:
        - all_users → SELECT id FROM auth.users WHERE ...filter
        - bulk / single → recipient_ids
        - event → recipient_ids[0]
     render subject/body per user (Mustache) in server fn
     INSERT INTO mail_recipients (...)  -- batched, 1k rows/statement
     UPDATE mail_campaigns SET status='sent', total_recipients=N, delivered_count=N
     pgmq.delete(msg_id)
3. mail_expire_due() → flip expired campaigns
4. exit (cron re-runs in 30 s)
```

**pg_cron schedule** (created via supabase insert tool with real project URL/anon key):
```sql
SELECT cron.schedule('mail-worker', '*/30 * * * * *',
  $$ SELECT net.http_post(
       url:='https://project--<id>.lovable.app/api/public/hooks/mail-worker',
       headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body:='{}'::jsonb) $$);
```

**Failure handling**
- Visibility timeout 60 s → auto-retry if worker crashes.
- Max 5 attempts → pgmq DLQ (`mail_dispatch_dlq`); campaign marked `failed`, admin surfaces alert.
- Large broadcasts (>50 k users) chunk into sub-messages: dispatcher enqueues N `mail_dispatch_chunk` msgs (offset/limit) so no single worker run exceeds 5 s CPU budget.

**Broadcast to millions**
- Fan-out uses `INSERT … SELECT` with pagination (`LIMIT 5000 OFFSET k`) — 1 M users ≈ 200 chunks, spread across cron ticks → <2 min total, no blocking.
- `mail_recipients` partitioned monthly → inserts land in current partition, indexes stay small.
- Player inbox query only touches the partial index; even 100 M lifetime rows read in <10 ms.

---

## 4. Trigger / Auto-Mail System

DB triggers on domain tables enqueue events:
```sql
-- example: withdrawal approved
CREATE OR REPLACE FUNCTION public.trg_withdrawal_mail() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='Successful' AND OLD.status IS DISTINCT FROM 'Successful' THEN
    PERFORM public.mail_enqueue_event(
      'withdrawal_approved', NEW.player_id, NEW.id,
      jsonb_build_object('amount', NEW.actual_amount, 'order_no', NEW.order_no));
  ELSIF NEW.status='Reject' AND OLD.status IS DISTINCT FROM 'Reject' THEN
    PERFORM public.mail_enqueue_event(
      'withdrawal_rejected', NEW.player_id, NEW.id,
      jsonb_build_object('order_no', NEW.order_no, 'reason', NEW.remark));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER withdrawal_mail AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION trg_withdrawal_mail();
```
Similar triggers: `auth.users` insert → `user_registered`, `deposits` status → `deposit_approved`.

`mail_enqueue_event(kind, user_id, ref, vars)` looks up all active `mail_event_rules` for that kind, and for each active rule creates a `mail_campaigns` row (`recipient_type='event'`, `event_kind`, `event_ref`) + pgmq message. Worker path is the same as manual campaigns → single code path, single retry story.

Admin UI: **Mail Box → Auto Rules** tab lists rules, lets admin toggle active, pick template, set conditions.

---

## 5. API Design (server functions)

All under `src/lib/mailbox.functions.ts`, `.middleware([requireSupabaseAuth])`, role check inside. REST-style names for clarity.

**Admin — campaigns**
- `mailListCampaigns({ page, pageSize, status?, q?, from?, to?, createdBy? })` → `{rows, total, stats}`
- `mailGetCampaign({ id })` → campaign + recipient sample
- `mailSendCampaign({ recipient_type, recipient_ids?, template_id?, subject?, body_html?, template_data?, send_time?, end_time? })` — validates with Zod; calls `mail_create_campaign` RPC.
- `mailCancelCampaign({ id })` — only if `status='scheduled'`.
- `mailDeleteCampaign({ id })` — soft delete.
- `mailResendFailed({ id })` — re-enqueue only failed recipients.

**Admin — templates & rules**
- `mailListTemplates`, `mailUpsertTemplate`, `mailToggleTemplate`
- `mailListRules`, `mailUpsertRule`, `mailToggleRule`

**Admin — analytics**
- `mailCampaignStats({ id })` → `{total, delivered, read, unread, failed, read_rate}`
- `mailOverview({ from, to })` → time-series for dashboard.

**Player — inbox** (already partly exists)
- `mailInboxList({ cursor, limit })` — uses keyset pagination on `(created_at, id)` for infinite scroll.
- `mailInboxRead({ recipient_id })` — RPC `mail_mark_read`.
- `mailInboxUnreadCount()` — cached in memory 5 s.

**Public / worker endpoint**
- `POST /api/public/hooks/mail-worker` — pgmq drain (see §3).

**User search for compose UI**
- `mailSearchUsers({ q, limit })` — LIKE on `profiles.nick`, `profiles.email`, `id::text`. Returns `{id, nick, vip}`.
- `mailValidateUserIds({ ids: string[] })` — bulk validate pasted IDs, returns `{valid, invalid, disabled}` for CSV import UX.

**Validation:** every input Zod-validated; `recipient_ids` capped at 100 000 per request; `send_time` must be within 1 year; `end_time > send_time`.

---

## 6. Frontend (Admin Mail Box)

Route: `_authenticated/admin` → sidebar "Ingame Mail → Mail Box". Tabs:

1. **Compose** — recipient type radio (Broadcast / Single / Bulk), user picker (typeahead uses `mailSearchUsers`), CSV/paste import for bulk with validation preview, template picker (or free-form via existing RichEditor), schedule datetime, expiry datetime. "Send now" or "Schedule".
2. **History** — TanStack Table with server pagination + filters (status, date range, sender, keyword). Row expands to show stats (delivered/read progress bars), recipient sample, resend/delete actions.
3. **Templates** — CRUD, live preview with sample variables.
4. **Auto Rules** — event × template mapping, toggle active.
5. **Audit Log** — read-only, filterable.

Data fetching: `useSuspenseQuery(queryOptions)` in components; loaders `ensureQueryData` for initial paint. Realtime channel on `mail_campaigns` for live progress bars while a broadcast fans out.

---

## 7. Scalability Strategy

| Concern | Strategy |
|---|---|
| Millions of users broadcast | Chunked fan-out (5 k/insert), monthly partitions, worker parallelism = 4 msgs/tick |
| Inbox latency | Partial index on `(user_id, created_at DESC) WHERE status='delivered' AND deleted_at IS NULL`; keyset pagination |
| Worker CPU (Cloudflare 10 ms wall) | Chunk campaigns into sub-jobs; each tick handles ≤10 msgs; heavy INSERT uses server-side `INSERT … SELECT` (DB does the work) |
| Duplicate delivery | `UNIQUE(campaign_id, user_id, created_at)`, worker uses `ON CONFLICT DO NOTHING` |
| Retry safety | pgmq visibility timeout + `FOR UPDATE SKIP LOCKED` on campaign row |
| Storage growth | Monthly partitions; nightly job detaches partitions >12 months, dumps to Storage bucket |
| Read count contention | Single-row UPDATE on campaign counter is fine up to ~1 k reads/s; beyond that, switch to periodic aggregation from `mail_recipients` |
| Template versioning | Snapshot `subject`/`body_html` into `mail_campaigns` when sending — template edits never mutate history |
| Auth & abuse | Role check in every RPC; per-admin rate limit (max 10 broadcasts/hour) enforced by counter table |
| Observability | `mail_audit_logs` + worker writes structured logs; admin dashboard shows queue depth via `pgmq.metrics('mail_dispatch')` |
| Future channels (email/SMS/push) | `mail_deliver` queue already provisioned; add worker branches without schema change |

---

## 8. Delivery Phases

**Phase A — Schema & RPCs (1 migration)**
Enums, tables, partitions, RLS, GRANTs, SECURITY DEFINER RPCs, pgmq queues.

**Phase B — Worker & cron**
Worker route + pg_cron schedule (via insert tool for env-specific URL).

**Phase C — Admin UI**
Replace placeholder `MailBoxPage.tsx` with the 5-tab UI + server fns.

**Phase D — Event triggers & auto rules**
DB triggers on `auth.users`, `deposits`, `withdrawals`; seed default rules mapped to seeded templates (welcome, deposit_ok, withdrawal_ok, withdrawal_reject).

**Phase E — Player inbox rewire**
Point existing `useMailbox` hook to `mail_recipients` (with backwards-compatible view over old `mails` table during cutover), realtime channel.

**Phase F — Analytics & audit UI**
Dashboard tiles + audit log viewer + partition maintenance cron.

---

## 9. Technical Notes / Non-Negotiables

- All money- or role-sensitive writes go through `SECURITY DEFINER` RPCs; direct table writes revoked from `anon` & `authenticated`.
- No `supabaseAdmin` at module scope in `.functions.ts`; load inside handler when truly needed.
- Templates render with a small, dependency-free Mustache implementation server-side; no `dangerouslySetInnerHTML` from user input.
- Worker route lives under `/api/public/*` (bypasses auth) and validates the `apikey` header before doing anything.
- Cloudflare-safe libs only — no Node-native queue clients, no `child_process`.
- Existing `mails` table stays read-only during migration; a view `mails` → `mail_recipients` join keeps the current player UI working until Phase E is deployed.

---

Approve လုပ်ရင် Phase A migration ကို ချက်ချင်း စမယ်။ တစ်ဆင့်ချင်း ship လုပ်ပြီး၊ phase တစ်ခုပြီးတိုင်း preview မှာ test လုပ်လို့ရအောင် ဖြစ်အောင်လုပ်မယ်။
