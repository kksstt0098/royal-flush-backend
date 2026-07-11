import { useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Layers,
  CalendarRange,
  Users,
  Gift,
  Wallet,
  ShieldCheck,
  History,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Download,
  Crown,
} from "lucide-react";

type SectionKey =
  | "dashboard"
  | "levels"
  | "rules"
  | "users"
  | "claims"
  | "limits"
  | "operators"
  | "activity";

const sections: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "levels", label: "VIP Levels", icon: Layers },
  { key: "rules", label: "Weekly & Monthly Rules", icon: CalendarRange },
  { key: "users", label: "Users", icon: Users },
  { key: "claims", label: "Bonus Claims", icon: Gift },
  { key: "limits", label: "Withdrawal Limits", icon: Wallet },
  { key: "operators", label: "Operators", icon: ShieldCheck },
  { key: "activity", label: "Activity Log", icon: History },
];

// ---------- Mock data ----------
type Level = {
  id: string;
  levelNumber: number;
  name: string;
  iconUrl?: string;
  minDeposit: number;
  minTurnover: number;
  upgradeReward: number;
  dailyWithdrawLimit: number | null;
  monthlyWithdrawLimit: number | null;
  turnoverMultiplier: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

const MOCK_LEVELS: Level[] = [
  { id: "l1", levelNumber: 1, name: "VIP 1", minDeposit: 0, minTurnover: 0, upgradeReward: 0, dailyWithdrawLimit: 50000, monthlyWithdrawLimit: 500000, turnoverMultiplier: 1, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "l2", levelNumber: 2, name: "VIP 2", minDeposit: 50000, minTurnover: 100000, upgradeReward: 500, dailyWithdrawLimit: 100000, monthlyWithdrawLimit: 1000000, turnoverMultiplier: 1, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "l3", levelNumber: 3, name: "VIP 3", minDeposit: 200000, minTurnover: 500000, upgradeReward: 2500, dailyWithdrawLimit: 250000, monthlyWithdrawLimit: 2500000, turnoverMultiplier: 1.2, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "l4", levelNumber: 4, name: "VIP 4", minDeposit: 1000000, minTurnover: 2000000, upgradeReward: 10000, dailyWithdrawLimit: 500000, monthlyWithdrawLimit: 5000000, turnoverMultiplier: 1.5, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "l5", levelNumber: 5, name: "VIP 5", minDeposit: 5000000, minTurnover: 10000000, upgradeReward: 50000, dailyWithdrawLimit: 1000000, monthlyWithdrawLimit: 10000000, turnoverMultiplier: 2, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
];

type Rule = {
  id: string;
  levelId: string;
  period: "weekly" | "monthly";
  requiredDeposit: number;
  requiredTurnover: number;
  reward: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
};

const MOCK_RULES: Rule[] = [
  { id: "r1", levelId: "l2", period: "weekly", requiredDeposit: 20000, requiredTurnover: 50000, reward: 200, isActive: true, updatedAt: "2026-06-10", updatedBy: "vyy" },
  { id: "r2", levelId: "l2", period: "monthly", requiredDeposit: 100000, requiredTurnover: 250000, reward: 1000, isActive: true, updatedAt: "2026-06-10", updatedBy: "vyy" },
  { id: "r3", levelId: "l3", period: "weekly", requiredDeposit: 50000, requiredTurnover: 150000, reward: 800, isActive: true, updatedAt: "2026-06-10", updatedBy: "vyy" },
  { id: "r4", levelId: "l3", period: "monthly", requiredDeposit: 250000, requiredTurnover: 750000, reward: 4000, isActive: true, updatedAt: "2026-06-10", updatedBy: "vyy" },
  { id: "r5", levelId: "l4", period: "weekly", requiredDeposit: 150000, requiredTurnover: 500000, reward: 3000, isActive: true, updatedAt: "2026-06-10", updatedBy: "vyy" },
  { id: "r6", levelId: "l4", period: "monthly", requiredDeposit: 700000, requiredTurnover: 2000000, reward: 15000, isActive: true, updatedAt: "2026-06-10", updatedBy: "vyy" },
];

type VipUser = {
  id: string;
  nick: string;
  levelId: string;
  totalDeposit: number;
  totalTurnover: number;
  weekDeposit: number;
  weekTurnover: number;
  monthDeposit: number;
  monthTurnover: number;
  lastLevelUpAt: string;
};

const MOCK_USERS: VipUser[] = [
  { id: "u1", nick: "aungaung",   levelId: "l3", totalDeposit: 320000,  totalTurnover: 780000,   weekDeposit: 42000, weekTurnover: 110000, monthDeposit: 180000, monthTurnover: 520000, lastLevelUpAt: "2026-05-14" },
  { id: "u2", nick: "moe_lay",    levelId: "l2", totalDeposit: 80000,   totalTurnover: 140000,   weekDeposit: 8000,  weekTurnover: 22000,  monthDeposit: 45000,  monthTurnover: 120000, lastLevelUpAt: "2026-04-02" },
  { id: "u3", nick: "highroller", levelId: "l5", totalDeposit: 7200000, totalTurnover: 15000000, weekDeposit: 250000, weekTurnover: 900000, monthDeposit: 1200000, monthTurnover: 4500000, lastLevelUpAt: "2026-03-18" },
  { id: "u4", nick: "kyaw88",     levelId: "l4", totalDeposit: 1250000, totalTurnover: 2400000,  weekDeposit: 120000, weekTurnover: 380000, monthDeposit: 620000,  monthTurnover: 1800000, lastLevelUpAt: "2026-05-30" },
  { id: "u5", nick: "newbie",     levelId: "l1", totalDeposit: 15000,   totalTurnover: 30000,    weekDeposit: 5000,  weekTurnover: 12000,  monthDeposit: 15000,   monthTurnover: 30000,   lastLevelUpAt: "2026-06-20" },
];

type Claim = {
  id: string;
  userId: string;
  type: "upgrade" | "weekly" | "monthly";
  levelId: string;
  amount: number;
  status: "pending" | "claimed" | "rejected";
  createdAt: string;
};

const MOCK_CLAIMS: Claim[] = [
  { id: "c1", userId: "u1", type: "weekly",  levelId: "l3", amount: 800,   status: "pending",  createdAt: "2026-07-08 10:12" },
  { id: "c2", userId: "u3", type: "monthly", levelId: "l5", amount: 60000, status: "pending",  createdAt: "2026-07-08 09:04" },
  { id: "c3", userId: "u4", type: "upgrade", levelId: "l4", amount: 10000, status: "claimed",  createdAt: "2026-05-30 14:22" },
  { id: "c4", userId: "u2", type: "weekly",  levelId: "l2", amount: 200,   status: "rejected", createdAt: "2026-07-01 08:00" },
  { id: "c5", userId: "u4", type: "weekly",  levelId: "l4", amount: 3000,  status: "pending",  createdAt: "2026-07-08 11:31" },
];

type Operator = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "vip_manager" | "viewer";
  createdAt: string;
};

const MOCK_OPERATORS: Operator[] = [
  { id: "o1", name: "vyy",    email: "vyy@royal.local",   role: "super_admin", createdAt: "2026-01-01" },
  { id: "o2", name: "khine",  email: "khine@royal.local", role: "vip_manager", createdAt: "2026-02-15" },
  { id: "o3", name: "hla",    email: "hla@royal.local",   role: "viewer",      createdAt: "2026-03-20" },
];

type ActivityEntry = {
  id: string;
  operator: string;
  action: string;
  target: string;
  createdAt: string;
  ip: string;
};

const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: "a1", operator: "vyy",   action: "update_level",       target: "VIP 3",  createdAt: "2026-07-08 10:20", ip: "10.0.0.5" },
  { id: "a2", operator: "khine", action: "approve_claim",      target: "c3",     createdAt: "2026-05-30 14:22", ip: "10.0.0.9" },
  { id: "a3", operator: "vyy",   action: "create_level",       target: "VIP 5",  createdAt: "2026-01-05 09:00", ip: "10.0.0.5" },
  { id: "a4", operator: "khine", action: "update_rule",        target: "VIP 3 weekly", createdAt: "2026-06-10 16:44", ip: "10.0.0.9" },
  { id: "a5", operator: "vyy",   action: "override_user_vip",  target: "u4 → VIP 4",   createdAt: "2026-05-30 14:00", ip: "10.0.0.5" },
];

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString();

// ---------- Page ----------
export function VipConfigPage() {
  const [section, setSection] = useState<SectionKey>("dashboard");

  return (
    <div className="flex gap-3 min-h-[calc(100vh-140px)]">
      {/* Sub sidebar */}
      <aside className="w-52 shrink-0 bg-panel border border-panel-border rounded-md overflow-hidden">
        <div className="h-10 px-3 flex items-center gap-2 border-b border-panel-border bg-muted/40 text-[13px] font-semibold">
          <Crown className="w-4 h-4 text-warning" /> VIP Config
        </div>
        <nav className="py-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={
                  "w-full flex items-center gap-2 px-3 h-9 text-[12.5px] text-left " +
                  (active
                    ? "bg-info/10 text-info border-l-2 border-info"
                    : "text-foreground/80 hover:bg-muted/40 border-l-2 border-transparent")
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="flex-1 min-w-0 bg-panel border border-panel-border rounded-md">
        {section === "dashboard" && <DashboardView />}
        {section === "levels" && <LevelsView />}
        {section === "rules" && <RulesView />}
        {section === "users" && <UsersView />}
        {section === "claims" && <ClaimsView />}
        {section === "limits" && <LimitsView />}
        {section === "operators" && <OperatorsView />}
        {section === "activity" && <ActivityView />}
      </section>
    </div>
  );
}

// ---------- Building blocks ----------
function Header({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background border border-panel-border rounded-md p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "success" | "warning" | "danger" | "info" }) {
  const map: Record<string, string> = {
    muted: "bg-muted text-foreground/70",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    info: "bg-info/15 text-info",
  };
  return (
    <span className={"inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] " + map[tone]}>
      {children}
    </span>
  );
}

function IconBtn({ title, onClick, tone = "muted", children }: { title: string; onClick?: () => void; tone?: "muted" | "danger" | "success"; children: ReactNode }) {
  const map: Record<string, string> = {
    muted: "hover:bg-muted/60 text-foreground/70",
    danger: "hover:bg-danger/10 text-danger",
    success: "hover:bg-success/10 text-success",
  };
  return (
    <button title={title} onClick={onClick} className={"h-7 w-7 inline-flex items-center justify-center rounded-sm " + map[tone]}>
      {children}
    </button>
  );
}

// ---------- Sections ----------
function DashboardView() {
  const bonusesThisMonth = MOCK_CLAIMS.filter(c => c.status === "claimed").reduce((s, c) => s + c.amount, 0);
  const pending = MOCK_CLAIMS.filter(c => c.status === "pending").length;
  const usersPerTier = MOCK_LEVELS.map(l => ({ level: l.name, count: MOCK_USERS.filter(u => u.levelId === l.id).length }));
  const top = [...MOCK_LEVELS].map(l => ({
    level: l.name,
    turnover: MOCK_USERS.filter(u => u.levelId === l.id).reduce((s, u) => s + u.totalTurnover, 0),
  })).sort((a, b) => b.turnover - a.turnover)[0];

  return (
    <>
      <Header title="VIP Dashboard" />
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active levels" value={String(MOCK_LEVELS.filter(l => l.isActive).length)} hint={`${MOCK_LEVELS.length} total`} />
        <StatCard label="VIP users" value={String(MOCK_USERS.length)} />
        <StatCard label="Bonuses paid" value={fmt(bonusesThisMonth)} hint="This month" />
        <StatCard label="Pending claims" value={String(pending)} hint="Awaiting approval" />
      </div>
      <div className="px-4 pb-4 grid md:grid-cols-2 gap-3">
        <div className="bg-background border border-panel-border rounded-md p-3">
          <div className="text-[12px] font-semibold mb-2">Users per tier</div>
          <div className="space-y-1.5">
            {usersPerTier.map((r) => {
              const max = Math.max(...usersPerTier.map(x => x.count), 1);
              return (
                <div key={r.level} className="flex items-center gap-2 text-[12px]">
                  <div className="w-14 text-muted-foreground">{r.level}</div>
                  <div className="flex-1 h-2 rounded-sm bg-muted overflow-hidden">
                    <div className="h-full bg-info" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <div className="w-8 text-right tabular-nums">{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-background border border-panel-border rounded-md p-3">
          <div className="text-[12px] font-semibold mb-2">Top tier by turnover</div>
          {top && (
            <div className="text-lg font-semibold">{top.level}</div>
          )}
          <div className="text-[12px] text-muted-foreground">Turnover: {fmt(top?.turnover ?? 0)}</div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Live figures will replace mock data once backend wiring lands.
          </div>
        </div>
      </div>
    </>
  );
}

function LevelsView() {
  const [levels, setLevels] = useState(MOCK_LEVELS);
  const [editing, setEditing] = useState<Level | null>(null);
  const [creating, setCreating] = useState(false);

  const toggleActive = (id: string) =>
    setLevels((ls) => ls.map(l => l.id === id ? { ...l, isActive: !l.isActive, updatedAt: new Date().toISOString().slice(0, 10), updatedBy: "vyy" } : l));

  return (
    <>
      <Header
        title="VIP Levels"
        actions={
          <button
            onClick={() => setCreating(true)}
            className="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[12px] flex items-center gap-1 hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" /> New level
          </button>
        }
      />
      <div className="overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>
              {["#", "Name", "Min Deposit", "Min Turnover", "Upgrade Reward", "Daily WD", "Monthly WD", "Multiplier", "Status", "Created", "Updated", ""].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.sort((a, b) => a.levelNumber - b.levelNumber).map(l => (
              <tr key={l.id} className="border-t border-panel-border hover:bg-muted/20">
                <td className="px-3 py-2 tabular-nums">{l.levelNumber}</td>
                <td className="px-3 py-2 font-medium">{l.name}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.minDeposit)}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.minTurnover)}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.upgradeReward)}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.dailyWithdrawLimit)}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.monthlyWithdrawLimit)}</td>
                <td className="px-3 py-2 tabular-nums">×{l.turnoverMultiplier}</td>
                <td className="px-3 py-2">
                  {l.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
                </td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{l.createdBy} · {l.createdAt}</td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{l.updatedBy} · {l.updatedAt}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <IconBtn title="Edit" onClick={() => setEditing(l)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                    <IconBtn title={l.isActive ? "Deactivate" : "Activate"} tone={l.isActive ? "danger" : "success"} onClick={() => toggleActive(l.id)}>
                      {l.isActive ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(editing || creating) && (
        <LevelEditor
          level={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(l) => {
            if (editing) {
              setLevels(ls => ls.map(x => x.id === l.id ? l : x));
            } else {
              setLevels(ls => [...ls, { ...l, id: "l" + (ls.length + 1) }]);
            }
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </>
  );
}

function LevelEditor({ level, onClose, onSave }: { level: Level | null; onClose: () => void; onSave: (l: Level) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<Level>(level ?? {
    id: "", levelNumber: 6, name: "", minDeposit: 0, minTurnover: 0, upgradeReward: 0,
    dailyWithdrawLimit: null, monthlyWithdrawLimit: null, turnoverMultiplier: 1, isActive: true,
    createdAt: today, createdBy: "vyy", updatedAt: today, updatedBy: "vyy",
  });

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30">
          <div className="text-[13px] font-semibold">{level ? `Edit ${level.name}` : "New VIP level"}</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 text-[12.5px]">
          <Field label="Level number">
            <input type="number" value={f.levelNumber} onChange={e => setF({ ...f, levelNumber: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Name">
            <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="VIP 6" />
          </Field>
          <Field label="Min deposit to reach">
            <input type="number" value={f.minDeposit} onChange={e => setF({ ...f, minDeposit: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Min turnover to reach">
            <input type="number" value={f.minTurnover} onChange={e => setF({ ...f, minTurnover: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Upgrade reward (one-time)">
            <input type="number" value={f.upgradeReward} onChange={e => setF({ ...f, upgradeReward: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Turnover multiplier for withdraw">
            <input type="number" step="0.1" value={f.turnoverMultiplier} onChange={e => setF({ ...f, turnoverMultiplier: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Daily withdrawal limit">
            <input type="number" value={f.dailyWithdrawLimit ?? ""} onChange={e => setF({ ...f, dailyWithdrawLimit: e.target.value === "" ? null : num(e.target.value) })} className={inputCls} placeholder="unlimited" />
          </Field>
          <Field label="Monthly withdrawal limit">
            <input type="number" value={f.monthlyWithdrawLimit ?? ""} onChange={e => setF({ ...f, monthlyWithdrawLimit: e.target.value === "" ? null : num(e.target.value) })} className={inputCls} placeholder="unlimited" />
          </Field>
          <Field label="Icon URL">
            <input value={f.iconUrl ?? ""} onChange={e => setF({ ...f, iconUrl: e.target.value })} className={inputCls} placeholder="https://…" />
          </Field>
          <Field label="Status">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={f.isActive} onChange={e => setF({ ...f, isActive: e.target.checked })} />
              <span>{f.isActive ? "Active" : "Inactive"}</span>
            </label>
          </Field>
        </div>
        <div className="px-4 py-3 border-t border-panel-border flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 rounded-sm border border-panel-border text-[12.5px] hover:bg-muted/40">Cancel</button>
          <button
            onClick={() => onSave({ ...f, updatedAt: today, updatedBy: "vyy" })}
            className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-[12.5px] hover:bg-primary/90"
          >Save</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full h-8 px-2 rounded-sm border border-panel-border bg-background text-[12.5px] focus:outline-none focus:border-info";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function RulesView() {
  const [rules, setRules] = useState(MOCK_RULES);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "weekly" | "monthly">("all");
  const [editing, setEditing] = useState<Rule | null>(null);

  const filtered = rules.filter(r =>
    (levelFilter === "all" || r.levelId === levelFilter) &&
    (periodFilter === "all" || r.period === periodFilter),
  );

  const levelName = (id: string) => MOCK_LEVELS.find(l => l.id === id)?.name ?? id;

  return (
    <>
      <Header
        title="Weekly & Monthly Reward Rules"
        actions={
          <>
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All levels</option>
              {MOCK_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value as "all" | "weekly" | "monthly")} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All periods</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </>
        }
      />
      <div className="p-4 grid gap-3">
        {filtered.length === 0 && (
          <div className="text-[12px] text-muted-foreground text-center py-6">No rules match this filter.</div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="bg-background border border-panel-border rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge tone="info">{levelName(r.levelId)}</Badge>
                <Badge tone={r.period === "weekly" ? "warning" : "success"}>{r.period}</Badge>
                {r.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <IconBtn title="Edit" onClick={() => setEditing(r)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn title="Delete" tone="danger" onClick={() => setRules(rs => rs.filter(x => x.id !== r.id))}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[12.5px]">
              <div>
                <div className="text-[11px] text-muted-foreground">Required deposit / {r.period === "weekly" ? "week" : "month"}</div>
                <div className="font-semibold tabular-nums">{fmt(r.requiredDeposit)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Required turnover / {r.period === "weekly" ? "week" : "month"}</div>
                <div className="font-semibold tabular-nums">{fmt(r.requiredTurnover)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Reward</div>
                <div className="font-semibold tabular-nums text-success">{fmt(r.reward)}</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Users at {levelName(r.levelId)} must deposit {fmt(r.requiredDeposit)} and wager {fmt(r.requiredTurnover)} during that {r.period === "weekly" ? "week (Mon–Sun)" : "month (1st–last)"} to earn {fmt(r.reward)}.
              <span className="ml-2">Last edit: {r.updatedBy} · {r.updatedAt}</span>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <RuleEditor
          rule={editing}
          onClose={() => setEditing(null)}
          onSave={(r) => { setRules(rs => rs.map(x => x.id === r.id ? r : x)); setEditing(null); }}
        />
      )}
    </>
  );
}

function RuleEditor({ rule, onClose, onSave }: { rule: Rule; onClose: () => void; onSave: (r: Rule) => void }) {
  const [f, setF] = useState(rule);
  const num = (v: string) => (v === "" ? 0 : Number(v));
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30">
          <div className="text-[13px] font-semibold">Edit reward rule</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <Field label="Level">
            <select value={f.levelId} onChange={e => setF({ ...f, levelId: e.target.value })} className={inputCls}>
              {MOCK_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Period">
            <select value={f.period} onChange={e => setF({ ...f, period: e.target.value as "weekly" | "monthly" })} className={inputCls}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <Field label="Required deposit"><input type="number" value={f.requiredDeposit} onChange={e => setF({ ...f, requiredDeposit: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Required turnover"><input type="number" value={f.requiredTurnover} onChange={e => setF({ ...f, requiredTurnover: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Reward amount"><input type="number" value={f.reward} onChange={e => setF({ ...f, reward: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Status">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={f.isActive} onChange={e => setF({ ...f, isActive: e.target.checked })} />
              <span>{f.isActive ? "Active" : "Inactive"}</span>
            </label>
          </Field>
        </div>
        <div className="px-4 py-3 border-t border-panel-border flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 rounded-sm border border-panel-border text-[12.5px] hover:bg-muted/40">Cancel</button>
          <button onClick={() => onSave({ ...f, updatedAt: new Date().toISOString().slice(0, 10), updatedBy: "vyy" })} className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-[12.5px] hover:bg-primary/90">Save</button>
        </div>
      </div>
    </div>
  );
}

function UsersView() {
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selected, setSelected] = useState<VipUser | null>(null);

  const filtered = MOCK_USERS.filter(u =>
    (levelFilter === "all" || u.levelId === levelFilter) &&
    (!q || u.nick.toLowerCase().includes(q.toLowerCase())),
  );

  const levelName = (id: string) => MOCK_LEVELS.find(l => l.id === id)?.name ?? id;
  const nextLevel = (id: string) => MOCK_LEVELS.find(l => l.levelNumber === (MOCK_LEVELS.find(x => x.id === id)?.levelNumber ?? 0) + 1);

  return (
    <>
      <Header
        title="User VIP Overview"
        actions={
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search user" className="h-8 pl-7 pr-2 rounded-sm border border-panel-border bg-background text-[12px]" />
            </div>
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All levels</option>
              {MOCK_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </>
        }
      />
      <div className="overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>
              {["User", "Current level", "Total deposit", "Total turnover", "Progress to next", "Last level-up", ""].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const nl = nextLevel(u.levelId);
              const pct = nl ? Math.min(100, (u.totalDeposit / Math.max(nl.minDeposit, 1)) * 100) : 100;
              return (
                <tr key={u.id} className="border-t border-panel-border hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(u)}>
                  <td className="px-3 py-2 font-medium">{u.nick}</td>
                  <td className="px-3 py-2"><Badge tone="info">{levelName(u.levelId)}</Badge></td>
                  <td className="px-3 py-2 tabular-nums">{fmt(u.totalDeposit)}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(u.totalTurnover)}</td>
                  <td className="px-3 py-2">
                    {nl ? (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-1.5 bg-muted rounded-sm overflow-hidden">
                          <div className="h-full bg-info" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">→ {nl.name}</span>
                      </div>
                    ) : <Badge tone="warning">Max tier</Badge>}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{u.lastLevelUpAt}</td>
                  <td className="px-3 py-2">
                    <button className="text-[11px] text-info hover:underline" onClick={(e) => { e.stopPropagation(); setSelected(u); }}>View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && <UserDetail user={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function UserDetail({ user, onClose }: { user: VipUser; onClose: () => void }) {
  const level = MOCK_LEVELS.find(l => l.id === user.levelId);
  const weekly = MOCK_RULES.find(r => r.levelId === user.levelId && r.period === "weekly" && r.isActive);
  const monthly = MOCK_RULES.find(r => r.levelId === user.levelId && r.period === "monthly" && r.isActive);
  const claims = MOCK_CLAIMS.filter(c => c.userId === user.id);

  const bar = (cur: number, req: number) => Math.min(100, (cur / Math.max(req, 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-panel-border rounded-md w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30">
          <div className="text-[13px] font-semibold">{user.nick} — {level?.name}</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total deposit" value={fmt(user.totalDeposit)} />
            <StatCard label="Total turnover" value={fmt(user.totalTurnover)} />
            <StatCard label="Last level-up" value={user.lastLevelUpAt} />
          </div>

          {weekly && (
            <div className="bg-background border border-panel-border rounded-md p-3">
              <div className="text-[12px] font-semibold mb-2">This week's progress</div>
              <ProgressRow label="Deposit" cur={user.weekDeposit} req={weekly.requiredDeposit} />
              <ProgressRow label="Turnover" cur={user.weekTurnover} req={weekly.requiredTurnover} />
              <div className="text-[11px] text-muted-foreground mt-2">Reward if met: {fmt(weekly.reward)}</div>
            </div>
          )}
          {monthly && (
            <div className="bg-background border border-panel-border rounded-md p-3">
              <div className="text-[12px] font-semibold mb-2">This month's progress</div>
              <ProgressRow label="Deposit" cur={user.monthDeposit} req={monthly.requiredDeposit} />
              <ProgressRow label="Turnover" cur={user.monthTurnover} req={monthly.requiredTurnover} />
              <div className="text-[11px] text-muted-foreground mt-2">Reward if met: {fmt(monthly.reward)}</div>
            </div>
          )}

          <div className="bg-background border border-panel-border rounded-md">
            <div className="px-3 py-2 text-[12px] font-semibold border-b border-panel-border">Claim history</div>
            <table className="w-full text-[12px]">
              <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground">
                <tr>{["When", "Type", "Amount", "Status"].map(h => <th key={h} className="text-left px-3 py-1.5">{h}</th>)}</tr>
              </thead>
              <tbody>
                {claims.length === 0 && <tr><td colSpan={4} className="text-center text-muted-foreground py-4">No claims</td></tr>}
                {claims.map(c => (
                  <tr key={c.id} className="border-t border-panel-border">
                    <td className="px-3 py-1.5">{c.createdAt}</td>
                    <td className="px-3 py-1.5"><Badge tone="info">{c.type}</Badge></td>
                    <td className="px-3 py-1.5 tabular-nums">{fmt(c.amount)}</td>
                    <td className="px-3 py-1.5">
                      <Badge tone={c.status === "claimed" ? "success" : c.status === "rejected" ? "danger" : "warning"}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-background border border-panel-border rounded-md p-3">
            <div className="text-[12px] font-semibold mb-2">Manual override</div>
            <div className="flex items-end gap-2">
              <Field label="Set level">
                <select className={inputCls} defaultValue={user.levelId}>
                  {MOCK_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
              <Field label="Reason (required)">
                <input className={inputCls} placeholder="Compensation for outage on 2026-07-05" />
              </Field>
              <button className="h-8 px-3 rounded-sm bg-warning text-warning-foreground text-[12px] hover:bg-warning/90">Apply override</button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Every override is written to the operator activity log.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, cur, req }: { label: string; cur: number; req: number }) {
  const pct = Math.min(100, (cur / Math.max(req, 1)) * 100);
  return (
    <div className="flex items-center gap-2 text-[12px] mb-1">
      <div className="w-16 text-muted-foreground">{label}</div>
      <div className="flex-1 h-2 rounded-sm bg-muted overflow-hidden">
        <div className={"h-full " + (pct >= 100 ? "bg-success" : "bg-info")} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-40 text-right tabular-nums text-[11px]">{fmt(cur)} / {fmt(req)}</div>
    </div>
  );
}

function ClaimsView() {
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const [status, setStatus] = useState<"all" | Claim["status"]>("pending");
  const [type, setType] = useState<"all" | Claim["type"]>("all");
  const [autoPayout, setAutoPayout] = useState({ upgrade: true, weekly: false, monthly: false });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = claims.filter(c =>
    (status === "all" || c.status === status) &&
    (type === "all" || c.type === type),
  );

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const act = (ids: string[], next: Claim["status"]) =>
    setClaims(cs => cs.map(c => ids.includes(c.id) ? { ...c, status: next } : c));

  const nick = (id: string) => MOCK_USERS.find(u => u.id === id)?.nick ?? id;

  return (
    <>
      <Header
        title="Bonus Claims"
        actions={
          <>
            <select value={type} onChange={e => setType(e.target.value as "all" | Claim["type"])} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All types</option>
              <option value="upgrade">Upgrade</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <select value={status} onChange={e => setStatus(e.target.value as "all" | Claim["status"])} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="claimed">Claimed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              disabled={selected.size === 0}
              onClick={() => { act([...selected], "claimed"); setSelected(new Set()); }}
              className="h-8 px-3 rounded-sm bg-success text-success-foreground text-[12px] disabled:opacity-40"
            >Bulk approve ({selected.size})</button>
          </>
        }
      />

      <div className="px-4 pt-3 flex flex-wrap gap-3 text-[12px]">
        <span className="text-muted-foreground">Auto-payout:</span>
        {(["upgrade", "weekly", "monthly"] as const).map(k => (
          <label key={k} className="inline-flex items-center gap-1">
            <input type="checkbox" checked={autoPayout[k]} onChange={e => setAutoPayout(a => ({ ...a, [k]: e.target.checked }))} />
            <span className="capitalize">{k}</span>
          </label>
        ))}
      </div>

      <div className="p-4 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              {["When", "User", "Type", "Level", "Amount", "Status", "Action"].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-6">No claims</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-panel-border hover:bg-muted/20">
                <td className="px-3 py-2">
                  {c.status === "pending" && (
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  )}
                </td>
                <td className="px-3 py-2 text-[11.5px] text-muted-foreground">{c.createdAt}</td>
                <td className="px-3 py-2 font-medium">{nick(c.userId)}</td>
                <td className="px-3 py-2"><Badge tone="info">{c.type}</Badge></td>
                <td className="px-3 py-2">{MOCK_LEVELS.find(l => l.id === c.levelId)?.name}</td>
                <td className="px-3 py-2 tabular-nums font-semibold">{fmt(c.amount)}</td>
                <td className="px-3 py-2">
                  <Badge tone={c.status === "claimed" ? "success" : c.status === "rejected" ? "danger" : "warning"}>{c.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  {c.status === "pending" ? (
                    <div className="flex items-center gap-1">
                      <IconBtn title="Approve" tone="success" onClick={() => act([c.id], "claimed")}><Check className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Reject" tone="danger" onClick={() => act([c.id], "rejected")}><X className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  ) : <span className="text-[11px] text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LimitsView() {
  return (
    <>
      <Header title="Withdrawal Limits by Tier" />
      <div className="p-4 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>{["Level", "Daily limit", "Monthly limit", "Turnover ×", "Notes"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {MOCK_LEVELS.map(l => (
              <tr key={l.id} className="border-t border-panel-border">
                <td className="px-3 py-2 font-medium">{l.name}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.dailyWithdrawLimit)}</td>
                <td className="px-3 py-2 tabular-nums">{fmt(l.monthlyWithdrawLimit)}</td>
                <td className="px-3 py-2 tabular-nums">×{l.turnoverMultiplier}</td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground">
                  Requests above the limit are auto-flagged for auditor review.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Limits are edited from the VIP Levels section — this view is a read-only summary.
        </div>
      </div>
    </>
  );
}

function OperatorsView() {
  const [ops, setOps] = useState(MOCK_OPERATORS);
  const setRole = (id: string, role: Operator["role"]) => setOps(o => o.map(x => x.id === id ? { ...x, role } : x));
  return (
    <>
      <Header
        title="Operators & Roles"
        actions={
          <button className="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[12px] flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add operator</button>
        }
      />
      <div className="p-4 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>{["Name", "Email", "Role", "Created", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {ops.map(o => (
              <tr key={o.id} className="border-t border-panel-border">
                <td className="px-3 py-2 font-medium">{o.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{o.email}</td>
                <td className="px-3 py-2">
                  <select value={o.role} onChange={e => setRole(o.id, e.target.value as Operator["role"])} className="h-7 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
                    <option value="super_admin">super_admin</option>
                    <option value="vip_manager">vip_manager</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground">{o.createdAt}</td>
                <td className="px-3 py-2">
                  <IconBtn title="Remove" tone="danger" onClick={() => setOps(list => list.filter(x => x.id !== o.id))}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Role permissions:
          <span className="ml-2"><Badge tone="danger">super_admin</Badge> full access</span>
          <span className="ml-2"><Badge tone="info">vip_manager</Badge> edit rules & approve claims</span>
          <span className="ml-2"><Badge tone="muted">viewer</Badge> read-only</span>
        </div>
      </div>
    </>
  );
}

function ActivityView() {
  const [q, setQ] = useState("");
  const [opFilter, setOpFilter] = useState("all");
  const [actFilter, setActFilter] = useState("all");

  const actions = useMemo(() => Array.from(new Set(MOCK_ACTIVITY.map(a => a.action))), []);
  const operators = useMemo(() => Array.from(new Set(MOCK_ACTIVITY.map(a => a.operator))), []);

  const rows = MOCK_ACTIVITY.filter(a =>
    (opFilter === "all" || a.operator === opFilter) &&
    (actFilter === "all" || a.action === actFilter) &&
    (!q || a.target.toLowerCase().includes(q.toLowerCase())),
  );

  const exportCsv = () => {
    const header = "when,operator,action,target,ip";
    const body = rows.map(r => [r.createdAt, r.operator, r.action, r.target, r.ip].join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vip_activity_log.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header
        title="Activity Log"
        actions={
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search target" className="h-8 pl-7 pr-2 rounded-sm border border-panel-border bg-background text-[12px]" />
            </div>
            <select value={opFilter} onChange={e => setOpFilter(e.target.value)} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All operators</option>
              {operators.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={actFilter} onChange={e => setActFilter(e.target.value)} className="h-8 px-2 rounded-sm border border-panel-border bg-background text-[12px]">
              <option value="all">All actions</option>
              {actions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={exportCsv} className="h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] flex items-center gap-1 hover:bg-info/90">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </>
        }
      />
      <div className="p-4 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>{["When", "Operator", "Action", "Target", "IP"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No entries</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-panel-border">
                <td className="px-3 py-2 text-[11.5px]">{r.createdAt}</td>
                <td className="px-3 py-2 font-medium">{r.operator}</td>
                <td className="px-3 py-2"><Badge tone="info">{r.action}</Badge></td>
                <td className="px-3 py-2">{r.target}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}