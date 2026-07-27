import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  RotateCcw,
  RefreshCw,
  MoreHorizontal,
  User,
  Wallet as WalletIcon,
  History,
  LogIn,
  Mail,
  Gift,
  MessageSquare,
  Ban,
  PowerOff,
  X,
} from "lucide-react";

type Row = {
  playerID: string;
  username: string;
  vip: number;
  level: string;
  balance: number;
  currentGame: string;
  provider: string;
  device: string;
  platform: string;
  country: string;
  loginIp: string;
  loginTime: string; // ISO
  lastActivity: string; // ISO
  status: "online" | "idle";
};

type Filters = {
  playerID: string;
  username: string;
  vipFrom: string;
  vipTo: string;
  provider: string;
  currentGame: string;
  device: string;
  platform: string;
  country: string;
  status: "" | "online" | "idle";
  loginFrom: string;
  loginTo: string;
};

const emptyFilters: Filters = {
  playerID: "",
  username: "",
  vipFrom: "",
  vipTo: "",
  provider: "",
  currentGame: "",
  device: "",
  platform: "",
  country: "",
  status: "",
  loginFrom: "",
  loginTo: "",
};

const ONLINE_WINDOW_MIN = 15;
const IDLE_WINDOW_MIN = 60;
const inputCls =
  "w-full h-9 px-2.5 text-[12px] rounded-md border border-panel-border bg-background focus:outline-none focus:border-info placeholder:text-muted-foreground/60";

function classify(lastLogin: string | null): "online" | "idle" | "offline" {
  if (!lastLogin) return "offline";
  const mins = (Date.now() - new Date(lastLogin).getTime()) / 60000;
  if (mins <= ONLINE_WINDOW_MIN) return "online";
  if (mins <= IDLE_WINDOW_MIN) return "idle";
  return "offline";
}

function fmtDur(fromIso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtRel(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function fmtDt(iso: string) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OnlinePlayerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<keyof Row>("loginTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tick, setTick] = useState(0);
  const [actionFor, setActionFor] = useState<Row | null>(null);
  const [detailFor, setDetailFor] = useState<Row | null>(null);
  const [remarkFor, setRemarkFor] = useState<Row | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [bonusFor, setBonusFor] = useState<Row | null>(null);
  const [bonusAmt, setBonusAmt] = useState("");
  const [mailFor, setMailFor] = useState<Row | null>(null);
  const [mailSubj, setMailSubj] = useState("");
  const [mailBody, setMailBody] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - IDLE_WINDOW_MIN * 60000).toISOString();
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,nick,vip,level,device_type,login_ip,login_country,last_login")
      .gte("last_login", since)
      .order("last_login", { ascending: false })
      .limit(1000);
    const ids = (profs ?? []).map((p) => p.id as string);
    const wmap: Record<string, number> = {};
    if (ids.length) {
      const { data: wals } = await supabase.from("wallets").select("user_id,coins").in("user_id", ids);
      (wals ?? []).forEach((w) => {
        wmap[w.user_id as string] = Number(w.coins ?? 0);
      });
    }
    const mapped: Row[] = (profs ?? [])
      .map((p) => {
        const cls = classify(p.last_login as string | null);
        if (cls === "offline") return null;
        const device = ((p.device_type as string) ?? "").toLowerCase();
        const platform = device === "ios" || device === "android" ? "Mobile" : device === "web" ? "Web" : "—";
        return {
          playerID: p.id as string,
          username: (p.nick as string) ?? "",
          vip: Number(p.vip ?? 0),
          level: (p.level as string) ?? "",
          balance: wmap[p.id as string] ?? 0,
          currentGame: "—",
          provider: "—",
          device: device || "—",
          platform,
          country: (p.login_country as string) ?? "—",
          loginIp: (p.login_ip as string) ?? "—",
          loginTime: (p.last_login as string) ?? new Date().toISOString(),
          lastActivity: (p.last_login as string) ?? new Date().toISOString(),
          status: cls,
        } as Row;
      })
      .filter(Boolean) as Row[];
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Re-evaluate statuses on tick without refetch
  const liveRows = useMemo(() => {
    void tick;
    return rows
      .map((r) => ({ ...r, status: classify(r.lastActivity) as Row["status"] | "offline" }))
      .filter((r) => r.status !== "offline") as Row[];
  }, [rows, tick]);

  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const f = applied;
    return liveRows.filter((r) => {
      if (f.playerID && !r.playerID.includes(f.playerID.trim())) return false;
      if (f.username && !r.username.toLowerCase().includes(f.username.trim().toLowerCase())) return false;
      if (f.vipFrom && r.vip < Number(f.vipFrom)) return false;
      if (f.vipTo && r.vip > Number(f.vipTo)) return false;
      if (f.provider && r.provider !== f.provider) return false;
      if (f.currentGame && !r.currentGame.toLowerCase().includes(f.currentGame.trim().toLowerCase())) return false;
      if (f.device && r.device !== f.device) return false;
      if (f.platform && r.platform !== f.platform) return false;
      if (f.country && !r.country.toLowerCase().includes(f.country.trim().toLowerCase())) return false;
      if (f.status && r.status !== f.status) return false;
      const t = new Date(r.loginTime).getTime();
      if (f.loginFrom && t < new Date(f.loginFrom).getTime()) return false;
      if (f.loginTo && t > new Date(f.loginTo + "T23:59:59").getTime()) return false;
      return true;
    });
  }, [liveRows, applied]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey] as unknown as number | string;
      const bv = b[sortKey] as unknown as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currPage - 1) * pageSize, currPage * pageSize);

  const toggleSort = (k: keyof Row) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const doFreeze = async (r: Row) => {
    const { error } = await supabase.from("profiles").update({ status: "disabled" }).eq("id", r.playerID);
    if (error) toast.error(error.message);
    else toast.success(`${r.username || r.playerID} frozen`);
    setActionFor(null);
  };
  const doForceLogout = (r: Row) => {
    toast.info("Force logout requested", { description: r.username || r.playerID });
    setActionFor(null);
  };
  const doSendMail = async () => {
    if (!mailFor) return;
    const { error } = await supabase.rpc("send_mail", {
      _player_id: mailFor.playerID,
      _subject: mailSubj,
      _body: mailBody,
    });
    if (error) toast.error(error.message);
    else toast.success("Mail sent");
    setMailFor(null);
    setMailSubj("");
    setMailBody("");
  };
  const doSendBonus = async () => {
    if (!bonusFor) return;
    const amt = Number(bonusAmt);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid bonus amount");
      return;
    }
    const { error } = await supabase.rpc("admin_credit_player", {
      _player_id: bonusFor.playerID,
      _amount: amt,
      _credit_type: "Bonus",
      _remark: "Online panel bonus",
    });
    if (error) toast.error(error.message);
    else toast.success(`Bonus ${amt} credited`);
    setBonusFor(null);
    setBonusAmt("");
  };
  const doAddRemark = async () => {
    if (!remarkFor) return;
    const { error } = await supabase
      .from("profiles")
      .update({ remark: remarkText })
      .eq("id", remarkFor.playerID);
    if (error) toast.error(error.message);
    else toast.success("Remark saved");
    setRemarkFor(null);
    setRemarkText("");
  };

  const providerOpts = useMemo(
    () => Array.from(new Set(liveRows.map((r) => r.provider).filter((v) => v && v !== "—"))),
    [liveRows],
  );
  const countryOpts = useMemo(
    () => Array.from(new Set(liveRows.map((r) => r.country).filter((v) => v && v !== "—"))),
    [liveRows],
  );

  const onlineTotal = liveRows.filter((r) => r.status === "online").length;
  const idleTotal = liveRows.filter((r) => r.status === "idle").length;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <section
        className="bg-panel border border-panel-border p-4"
        style={{ borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
              <span className="text-foreground/80">Online</span>
              <span className="font-semibold tabular-nums">{onlineTotal}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-foreground/80">Idle</span>
              <span className="font-semibold tabular-nums">{idleTotal}</span>
            </span>
            <span className="text-muted-foreground">Total: {liveRows.length}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <input className={inputCls} placeholder="Player ID" value={filters.playerID} onChange={(e) => setF("playerID", e.target.value)} />
          <input className={inputCls} placeholder="Username" value={filters.username} onChange={(e) => setF("username", e.target.value)} />
          <div className="flex items-center gap-1.5">
            <input type="number" min={0} className={inputCls} placeholder="VIP from" value={filters.vipFrom} onChange={(e) => setF("vipFrom", e.target.value)} />
            <span className="text-muted-foreground text-[12px]">to</span>
            <input type="number" min={0} className={inputCls} placeholder="VIP to" value={filters.vipTo} onChange={(e) => setF("vipTo", e.target.value)} />
          </div>
          <select className={inputCls} value={filters.provider} onChange={(e) => setF("provider", e.target.value)}>
            <option value="">All Providers</option>
            {providerOpts.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Current Game" value={filters.currentGame} onChange={(e) => setF("currentGame", e.target.value)} />
          <select className={inputCls} value={filters.device} onChange={(e) => setF("device", e.target.value)}>
            <option value="">All Devices</option>
            <option value="android">Android</option>
            <option value="ios">iOS</option>
            <option value="web">Web</option>
          </select>
          <select className={inputCls} value={filters.platform} onChange={(e) => setF("platform", e.target.value)}>
            <option value="">All Platforms</option>
            <option value="Mobile">Mobile</option>
            <option value="Web">Web</option>
          </select>
          <select className={inputCls} value={filters.country} onChange={(e) => setF("country", e.target.value)}>
            <option value="">All Countries</option>
            {countryOpts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className={inputCls} value={filters.status} onChange={(e) => setF("status", e.target.value as Filters["status"])}>
            <option value="">All Status</option>
            <option value="online">Online</option>
            <option value="idle">Idle</option>
          </select>
          <input type="date" className={inputCls} value={filters.loginFrom} onChange={(e) => setF("loginFrom", e.target.value)} />
          <input type="date" className={inputCls} value={filters.loginTo} onChange={(e) => setF("loginTo", e.target.value)} />
          <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-2 xl:justify-end">
            <button
              onClick={() => { setApplied({ ...filters }); setPage(1); }}
              className="h-9 px-3 rounded-md bg-info text-info-foreground text-[12px] font-medium hover:bg-info/90 inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button
              onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); }}
              className="h-9 px-3 rounded-md border border-panel-border bg-background text-[12px] hover:bg-accent inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={() => void load()}
              className="h-9 px-3 rounded-md border border-panel-border bg-background text-[12px] hover:bg-accent inline-flex items-center gap-1.5"
            >
              <RefreshCw className={"w-3.5 h-3.5 " + (loading ? "animate-spin" : "")} /> Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section
        className="bg-panel border border-panel-border overflow-hidden"
        style={{ borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      >
        <div className="max-h-[calc(100vh-320px)] overflow-auto relative">
          <table className="min-w-[1600px] w-full text-[12px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-panel">
              <tr className="text-left text-foreground/70">
                {[
                  { k: "status", l: "Status", w: "w-[90px]", sticky: true },
                  { k: "playerID", l: "Player ID", w: "min-w-[220px]" },
                  { k: "username", l: "Username", w: "min-w-[140px]" },
                  { k: "vip", l: "VIP", w: "w-[70px]" },
                  { k: "balance", l: "Balance", w: "min-w-[120px]" },
                  { k: "currentGame", l: "Current Game", w: "min-w-[140px]" },
                  { k: "provider", l: "Provider", w: "min-w-[120px]" },
                  { k: "device", l: "Device", w: "w-[90px]" },
                  { k: "platform", l: "Platform", w: "w-[100px]" },
                  { k: "loginTime", l: "Login Time", w: "min-w-[140px]" },
                  { k: "loginTime", l: "Online Duration", w: "min-w-[130px]", noSort: true },
                  { k: "lastActivity", l: "Last Activity", w: "min-w-[130px]" },
                  { k: "loginIp", l: "Login IP", w: "min-w-[130px]" },
                  { k: "country", l: "Country", w: "min-w-[110px]" },
                  { k: "action", l: "Action", w: "w-[80px]", noSort: true },
                ].map((c, i) => (
                  <th
                    key={i}
                    className={
                      "px-3 h-10 border-b border-panel-border font-medium " +
                      c.w +
                      (c.sticky ? " sticky left-0 z-30 bg-panel" : "") +
                      (!c.noSort ? " cursor-pointer select-none hover:text-foreground" : "")
                    }
                    onClick={() => !c.noSort && toggleSort(c.k as keyof Row)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.l}
                      {sortKey === c.k && !c.noSort && (
                        <span className="text-info">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center text-muted-foreground py-16">
                    {loading ? "Loading…" : "No online players in the last hour"}
                  </td>
                </tr>
              )}
              {pageRows.map((r) => (
                <tr key={r.playerID} className="hover:bg-accent/40 group">
                  <td className="px-3 h-11 border-b border-panel-border sticky left-0 z-10 bg-panel group-hover:bg-accent/40">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[11px] font-medium border " +
                        (r.status === "online"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/30")
                      }
                    >
                      <span
                        className={
                          "w-1.5 h-1.5 rounded-full " +
                          (r.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500")
                        }
                      />
                      {r.status === "online" ? "Online" : "Idle"}
                    </span>
                  </td>
                  <td className="px-3 h-11 border-b border-panel-border font-mono text-[11px] text-foreground/80">
                    {r.playerID}
                  </td>
                  <td className="px-3 h-11 border-b border-panel-border font-medium">{r.username || "—"}</td>
                  <td className="px-3 h-11 border-b border-panel-border">
                    <span className="inline-flex items-center px-1.5 h-5 rounded bg-amber-500/15 text-amber-500 text-[11px] font-semibold">
                      V{r.vip}
                    </span>
                  </td>
                  <td className="px-3 h-11 border-b border-panel-border tabular-nums">{fmtMoney(r.balance)}</td>
                  <td className="px-3 h-11 border-b border-panel-border text-foreground/80">{r.currentGame}</td>
                  <td className="px-3 h-11 border-b border-panel-border text-foreground/80">{r.provider}</td>
                  <td className="px-3 h-11 border-b border-panel-border capitalize">{r.device}</td>
                  <td className="px-3 h-11 border-b border-panel-border">{r.platform}</td>
                  <td className="px-3 h-11 border-b border-panel-border text-foreground/80">{fmtDt(r.loginTime)}</td>
                  <td className="px-3 h-11 border-b border-panel-border tabular-nums">{fmtDur(r.loginTime)}</td>
                  <td className="px-3 h-11 border-b border-panel-border text-foreground/80">{fmtRel(r.lastActivity)}</td>
                  <td className="px-3 h-11 border-b border-panel-border font-mono text-[11px]">{r.loginIp}</td>
                  <td className="px-3 h-11 border-b border-panel-border">{r.country}</td>
                  <td className="px-3 h-11 border-b border-panel-border">
                    <button
                      onClick={() => setActionFor(r)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-panel-border hover:bg-accent"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 h-11 border-t border-panel-border text-[12px] flex-wrap gap-2">
          <div className="text-muted-foreground">
            Showing {(currPage - 1) * pageSize + 1}–{Math.min(currPage * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-8 px-2 rounded-md border border-panel-border bg-background text-[12px]"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currPage <= 1}
              className="h-8 px-2 rounded-md border border-panel-border bg-background hover:bg-accent disabled:opacity-50"
            >
              Prev
            </button>
            <span className="tabular-nums">
              {currPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currPage >= totalPages}
              className="h-8 px-2 rounded-md border border-panel-border bg-background hover:bg-accent disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Action menu */}
      {actionFor && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setActionFor(null)}
        >
          <div
            ref={menuRef}
            className="bg-panel border border-panel-border rounded-[10px] w-full max-w-sm p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-panel-border flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold">{actionFor.username || "Player"}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{actionFor.playerID}</div>
              </div>
              <button onClick={() => setActionFor(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {[
              { icon: User, label: "View Profile", onClick: () => { setDetailFor(actionFor); setActionFor(null); } },
              { icon: WalletIcon, label: "Wallet", onClick: () => { toast.info(`Balance: ${fmtMoney(actionFor.balance)}`); setActionFor(null); } },
              { icon: History, label: "Bet History", onClick: () => { toast.info("Open bet history"); setActionFor(null); } },
              { icon: LogIn, label: "Login History", onClick: () => { toast.info("Open login history"); setActionFor(null); } },
              { icon: Mail, label: "Send Mail", onClick: () => { setMailFor(actionFor); setActionFor(null); } },
              { icon: Gift, label: "Send Bonus", onClick: () => { setBonusFor(actionFor); setActionFor(null); } },
              { icon: MessageSquare, label: "Add Remark", onClick: () => { setRemarkFor(actionFor); setRemarkText(""); setActionFor(null); } },
              { icon: Ban, label: "Freeze Account", danger: true, onClick: () => void doFreeze(actionFor) },
              { icon: PowerOff, label: "Force Logout", danger: true, onClick: () => doForceLogout(actionFor) },
            ].map((it, i) => (
              <button
                key={i}
                onClick={it.onClick}
                className={
                  "w-full flex items-center gap-2.5 px-3 h-9 rounded-md text-[12px] hover:bg-accent " +
                  (it.danger ? "text-danger" : "")
                }
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {detailFor && (
        <Modal title="Player Profile" onClose={() => setDetailFor(null)}>
          <ProfileRows r={detailFor} />
        </Modal>
      )}
      {mailFor && (
        <Modal title={`Send Mail — ${mailFor.username || mailFor.playerID}`} onClose={() => setMailFor(null)}>
          <div className="space-y-2">
            <input className={inputCls + " h-10"} placeholder="Subject" value={mailSubj} onChange={(e) => setMailSubj(e.target.value)} />
            <textarea
              className="w-full rounded-md border border-panel-border bg-background p-2 text-[12px] min-h-[120px]"
              placeholder="Message body"
              value={mailBody}
              onChange={(e) => setMailBody(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setMailFor(null)} className="h-9 px-3 rounded-md border border-panel-border text-[12px] hover:bg-accent">Cancel</button>
              <button onClick={() => void doSendMail()} className="h-9 px-3 rounded-md bg-info text-info-foreground text-[12px] font-medium hover:bg-info/90">Send</button>
            </div>
          </div>
        </Modal>
      )}
      {bonusFor && (
        <Modal title={`Send Bonus — ${bonusFor.username || bonusFor.playerID}`} onClose={() => setBonusFor(null)}>
          <div className="space-y-2">
            <input type="number" className={inputCls + " h-10"} placeholder="Amount" value={bonusAmt} onChange={(e) => setBonusAmt(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBonusFor(null)} className="h-9 px-3 rounded-md border border-panel-border text-[12px] hover:bg-accent">Cancel</button>
              <button onClick={() => void doSendBonus()} className="h-9 px-3 rounded-md bg-emerald-500 text-white text-[12px] font-medium hover:bg-emerald-600">Credit</button>
            </div>
          </div>
        </Modal>
      )}
      {remarkFor && (
        <Modal title={`Remark — ${remarkFor.username || remarkFor.playerID}`} onClose={() => setRemarkFor(null)}>
          <div className="space-y-2">
            <textarea
              className="w-full rounded-md border border-panel-border bg-background p-2 text-[12px] min-h-[100px]"
              placeholder="Remark"
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRemarkFor(null)} className="h-9 px-3 rounded-md border border-panel-border text-[12px] hover:bg-accent">Cancel</button>
              <button onClick={() => void doAddRemark()} className="h-9 px-3 rounded-md bg-info text-info-foreground text-[12px] font-medium hover:bg-info/90">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-panel border border-panel-border rounded-[10px] w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-11 border-b border-panel-border">
          <div className="text-[13px] font-semibold">{title}</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ProfileRows({ r }: { r: Row }) {
  const items: Array<[string, string]> = [
    ["Player ID", r.playerID],
    ["Username", r.username || "—"],
    ["VIP", `V${r.vip}`],
    ["Level", r.level || "—"],
    ["Balance", r.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
    ["Device", r.device],
    ["Platform", r.platform],
    ["Login IP", r.loginIp],
    ["Country", r.country],
    ["Login Time", fmtDt(r.loginTime)],
    ["Online For", fmtDur(r.loginTime)],
  ];
  return (
    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[12px]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <div className="text-muted-foreground">{k}</div>
          <div className="text-foreground font-medium break-all">{v}</div>
        </div>
      ))}
    </div>
  );
}