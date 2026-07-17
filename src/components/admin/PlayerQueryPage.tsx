import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { type Player } from "@/lib/mock-players";
import { supabase } from "@/integrations/supabase/client";
import { levelColor, useLevels } from "@/lib/level-store";
import {
  Search,
  RotateCcw,
  Download,
  Power,
  PowerOff,
  ArrowUpDown,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="text-[12px] text-foreground/70 shrink-0 whitespace-nowrap">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full h-8 px-2 text-[12px] rounded-sm border border-panel-border bg-panel focus:outline-none focus:border-info placeholder:text-muted-foreground/60";

function DateInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Calendar className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="date"
        className={inputCls + " pl-7"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Convert "MM-DD HH:mm" (year 2025 assumed) to a Date for filtering
function parseTblDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(`2025-${m[1]}-${m[2]}T00:00:00`);
}

type Filters = {
  playerID: string;
  superiorID: string;
  deviceType: string;
  payed: "" | "yes" | "no";
  phone: string;
  email: string;
  ipAddr: string;
  level: string;
  channelCode: string;
  vipFrom: string;
  vipTo: string;
  bankAccount: string;
  status: "" | "active" | "disabled";
  regFrom: string;
  regTo: string;
  loginFrom: string;
  loginTo: string;
};

const emptyFilters: Filters = {
  playerID: "",
  superiorID: "",
  deviceType: "",
  payed: "",
  phone: "",
  email: "",
  ipAddr: "",
  level: "",
  channelCode: "",
  vipFrom: "",
  vipTo: "",
  bankAccount: "",
  status: "",
  regFrom: "",
  regTo: "",
  loginFrom: "",
  loginTo: "",
};

export function PlayerQueryPage() {
  const { t } = useT();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  // Map DB uuid -> user_id for updates
  const [idMap, setIdMap] = useState<Record<string, string>>({});

  const loadPlayers = async () => {
    setLoading(true);
    const [{ data: profs }, { data: wals }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("wallets").select("*"),
    ]);
    const wmap: Record<string, Record<string, unknown>> = {};
    (wals ?? []).forEach((w) => { wmap[w.user_id as string] = w as Record<string, unknown>; });
    const fmtDt = (s: string | null | undefined) =>
      s ? new Date(s).toISOString().slice(5, 16).replace("T", " ") : "";
    const mapped: Player[] = (profs ?? []).map((p) => {
      const w = (wmap[p.id as string] ?? {}) as Record<string, number | string | null>;
      const n = (k: string) => Number(w[k] ?? 0);
      return {
        playerID: p.id as string,
        nick: (p.nick as string) ?? "",
        superiorID: Number(p.superior_id ?? 0),
        deviceType: (p.device_type as string) ?? "",
        vip: Number(p.vip ?? 0),
        phone: (p.phone as string) ?? "",
        email: (p.email as string) ?? "",
        channelCode: (p.channel_code as string) ?? "",
        sourceChannel: (p.source_channel as string) ?? "",
        level: (p.level as string) ?? "",
        coins: n("coins"),
        totalPayed: n("total_payed"),
        totalWithdrawal: n("total_withdrawal"),
        totalBets: n("total_bets"),
        remainBets: n("remain_bets"),
        totalWin: n("total_win"),
        todayWin: n("today_win"),
        lastPayed: fmtDt(w.last_payed_at as string | null),
        createTime: fmtDt(p.created_at as string | null),
        lastLogin: fmtDt(p.last_login as string | null),
        remark: (p.remark as string) ?? "",
        status: (p.status as "active" | "disabled") ?? "active",
        safeCoins: n("safe_coins"),
        addr: (p.addr as string) ?? "",
        goldInTransfer: n("gold_in_transfer"),
        totalPayedTimes: n("total_payed_times"),
        totalWithdrawTimes: n("total_withdraw_times"),
        totalPayout: n("total_payout"),
        registerIp: (p.register_ip as string) ?? "",
        registerCountry: (p.register_country as string) ?? "",
        registerMac: (p.register_mac as string) ?? "",
        loginIp: (p.login_ip as string) ?? "",
        loginCountry: (p.login_country as string) ?? "",
      };
    });
    const im: Record<string, string> = {};
    mapped.forEach((m) => { im[m.playerID] = m.playerID; });
    setIdMap(im);
    setPlayers(mapped);
    setLoading(false);
  };

  useEffect(() => { loadPlayers(); }, []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [detailsFor, setDetailsFor] = useState<Player | null>(null);
  const [adjustFor, setAdjustFor] = useState<Player | null>(null);
  const [remarkOpen, setRemarkOpen] = useState(false);

  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const f = applied;
      if (f.playerID && !p.playerID.includes(f.playerID.trim())) return false;
      if (f.superiorID && String(p.superiorID) !== f.superiorID.trim()) return false;
      if (f.deviceType && p.deviceType !== f.deviceType) return false;
      if (f.payed === "yes" && p.totalPayed <= 0) return false;
      if (f.payed === "no" && p.totalPayed > 0) return false;
      if (f.phone && !p.phone.includes(f.phone.trim())) return false;
      if (f.email && !p.email.toLowerCase().includes(f.email.trim().toLowerCase())) return false;
      if (
        f.ipAddr &&
        !(
          (p.registerIp ?? "").includes(f.ipAddr.trim()) ||
          (p.loginIp ?? "").includes(f.ipAddr.trim())
        )
      )
        return false;
      if (f.level && p.level !== f.level) return false;
      if (f.channelCode && p.channelCode !== f.channelCode.trim()) return false;
      if (f.vipFrom && p.vip < Number(f.vipFrom)) return false;
      if (f.vipTo && p.vip > Number(f.vipTo)) return false;
      if (
        f.bankAccount &&
        !(p.addr ?? "").toLowerCase().includes(f.bankAccount.trim().toLowerCase())
      )
        return false;
      if (f.status && p.status !== f.status) return false;
      const created = parseTblDate(p.createTime);
      if (f.regFrom && created && created < new Date(f.regFrom)) return false;
      if (f.regTo && created && created > new Date(f.regTo + "T23:59:59")) return false;
      const login = parseTblDate(p.lastLogin);
      if (f.loginFrom && login && login < new Date(f.loginFrom)) return false;
      if (f.loginTo && login && login > new Date(f.loginTo + "T23:59:59")) return false;
      return true;
    });
  }, [players, applied]);

  const levelOptions = useMemo(
    () => Array.from(new Set(players.map((p) => p.level).filter(Boolean))).sort(),
    [players],
  );

  const allChecked = selected.size === filtered.length && filtered.length > 0;
  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(filtered.map((p) => p.playerID)));

  const applySearch = () => {
    setApplied({ ...filters });
    setSelected(new Set());
  };
  const resetFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setSelected(new Set());
  };

  const setStatus = async (ids: string[], status: "active" | "disabled") => {
    if (ids.length === 0) return;
    const uuids = ids.map((i) => idMap[i]).filter(Boolean);
    const { error } = await supabase.from("profiles").update({ status }).in("id", uuids);
    if (error) { alert(error.message); return; }
    setPlayers((prev) =>
      prev.map((p) => (ids.includes(p.playerID) ? { ...p, status } : p)),
    );
    setDetailsFor((d) => (d && ids.includes(d.playerID) ? { ...d, status } : d));
  };

  const bulkEnable = () => setStatus(Array.from(selected), "active");
  const bulkDisable = () => setStatus(Array.from(selected), "disabled");

  const exportCsv = () => {
    const header = [
      "playerID","nick","superiorID","deviceType","vip","phone","email",
      "channelCode","sourceChannel","level","coins","totalPayed","totalWithdrawal",
      "totalBets","remainBets","totalWin","todayWin","lastPayed","createTime","lastLogin","status",
    ];
    const rows = filtered.map((p) =>
      header.map((k) => String((p as unknown as Record<string, unknown>)[k] ?? "")).join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "players.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyRemark = async (text: string) => {
    const ids = Array.from(selected);
    const uuids = ids.map((i) => idMap[i]).filter(Boolean);
    const { error } = await supabase.from("profiles").update({ remark: text }).in("id", uuids);
    if (error) { alert(error.message); return; }
    setPlayers((prev) => prev.map((p) => (ids.includes(p.playerID) ? { ...p, remark: text } : p)));
    setRemarkOpen(false);
  };

  const saveRemainBets = (id: string, value: number) => {
    // wallets are not client-writable — local only for now
    setPlayers((prev) => prev.map((p) => (p.playerID === id ? { ...p, remainBets: value } : p)));
    setAdjustFor(null);
  };

  const columns = useMemo(
    () => [
      { key: "playerID", label: t("playerID"), sort: false },
      { key: "nick", label: t("nick"), sort: false },
      { key: "superiorID", label: t("superiorID"), sort: true },
      { key: "deviceType", label: t("deviceType"), sort: false },
      { key: "vip", label: "VIP", sort: true },
      { key: "phone", label: t("phone"), sort: false },
      { key: "email", label: t("email"), sort: false },
      { key: "channelCode", label: t("channelCode"), sort: false },
      { key: "sourceChannel", label: t("sourceChannel"), sort: false },
      { key: "level", label: t("level"), sort: false },
      { key: "coins", label: t("coins"), sort: true },
      { key: "totalPayed", label: t("totalPayed"), sort: true },
      { key: "totalWithdrawal", label: t("totalWithdrawal"), sort: true },
      { key: "totalBets", label: t("totalBets"), sort: true },
      { key: "remainBets", label: t("remainBets"), sort: true },
      { key: "totalWin", label: t("totalWin"), sort: true },
      { key: "todayWin", label: t("todayWin"), sort: true },
      { key: "lastPayed", label: t("lastPayed"), sort: true },
      { key: "createTime", label: t("createTime"), sort: true },
      { key: "lastLogin", label: t("lastLogin"), sort: true },
      { key: "remark", label: t("remark"), sort: false },
      { key: "action", label: t("action"), sort: false },
    ],
    [t],
  );

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      {/* Filter panel */}
      <section className="bg-panel border border-panel-border rounded-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-x-6 gap-y-3">
          <Field label={t("playerID")}>
            <input
              className={inputCls}
              value={filters.playerID}
              onChange={(e) => setF("playerID", e.target.value)}
            />
          </Field>
          <Field label={t("superiorID")}>
            <input
              className={inputCls}
              placeholder="Superior ID"
              value={filters.superiorID}
              onChange={(e) => setF("superiorID", e.target.value)}
            />
          </Field>
          <Field label={t("deviceType")}>
            <select
              className={inputCls}
              value={filters.deviceType}
              onChange={(e) => setF("deviceType", e.target.value)}
            >
              <option value="">{t("all")}</option>
              <option value="android">android</option>
              <option value="ios">ios</option>
              <option value="web">web</option>
            </select>
          </Field>
          <Field label={t("payed")}>
            <select
              className={inputCls}
              value={filters.payed}
              onChange={(e) => setF("payed", e.target.value as Filters["payed"])}
            >
              <option value="">{t("allPlayers")}</option>
              <option value="yes">{t("payedYes")}</option>
              <option value="no">{t("payedNo")}</option>
            </select>
          </Field>
          <Field label={t("phone")}>
            <input
              className={inputCls}
              placeholder={t("phone")}
              value={filters.phone}
              onChange={(e) => setF("phone", e.target.value)}
            />
          </Field>
          <Field label={t("email")}>
            <input
              className={inputCls}
              placeholder="email"
              value={filters.email}
              onChange={(e) => setF("email", e.target.value)}
            />
          </Field>
          <Field label={t("ipAddr")}>
            <input
              className={inputCls}
              placeholder="login/register ip"
              value={filters.ipAddr}
              onChange={(e) => setF("ipAddr", e.target.value)}
            />
          </Field>
          <Field label={t("level")}>
            <select
              className={inputCls}
              value={filters.level}
              onChange={(e) => setF("level", e.target.value)}
            >
              <option value="">{t("all")}</option>
              {levelOptions.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("channelCode")}>
            <input
              className={inputCls}
              placeholder="Channel code"
              value={filters.channelCode}
              onChange={(e) => setF("channelCode", e.target.value)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("vipLevel")}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={filters.vipFrom}
                  onChange={(e) => setF("vipFrom", e.target.value)}
                />
                <span className="text-muted-foreground text-[12px]">{t("to")}</span>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={filters.vipTo}
                  onChange={(e) => setF("vipTo", e.target.value)}
                />
              </div>
            </Field>
          </div>
          <Field label={t("bankAccount")}>
            <input
              className={inputCls}
              placeholder="Bank Account"
              value={filters.bankAccount}
              onChange={(e) => setF("bankAccount", e.target.value)}
            />
          </Field>
          <Field label={t("status")}>
            <select
              className={inputCls}
              value={filters.status}
              onChange={(e) => setF("status", e.target.value as Filters["status"])}
            >
              <option value="">{t("select")}</option>
              <option value="active">{t("active")}</option>
              <option value="disabled">{t("disabled")}</option>
            </select>
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label={t("registrationDate")}>
              <div className="flex items-center gap-2">
                <DateInput
                  placeholder={t("startDate")}
                  value={filters.regFrom}
                  onChange={(v) => setF("regFrom", v)}
                />
                <span className="text-muted-foreground text-[12px]">{t("to")}</span>
                <DateInput
                  placeholder={t("endDate")}
                  value={filters.regTo}
                  onChange={(v) => setF("regTo", v)}
                />
              </div>
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label={t("lastLogin")}>
              <div className="flex items-center gap-2">
                <DateInput
                  placeholder={t("startDate")}
                  value={filters.loginFrom}
                  onChange={(v) => setF("loginFrom", v)}
                />
                <span className="text-muted-foreground text-[12px]">{t("to")}</span>
                <DateInput
                  placeholder={t("endDate")}
                  value={filters.loginTo}
                  onChange={(v) => setF("loginTo", v)}
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={applySearch}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90"
          >
            <Search className="w-3.5 h-3.5" /> {t("search")}
          </button>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-warning text-warning-foreground text-[12px] hover:opacity-90"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t("reset")}
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px] hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" /> {t("export")}
          </button>
        </div>
      </section>

      {/* Bulk actions */}
      <section className="bg-panel border border-panel-border rounded-sm p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={bulkEnable}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-success text-success-foreground text-[12px] hover:opacity-90 disabled:opacity-40"
            disabled={selected.size === 0}
          >
            <Power className="w-3.5 h-3.5" /> {t("enable")}
          </button>
          <button
            onClick={bulkDisable}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px] hover:opacity-90 disabled:opacity-40"
            disabled={selected.size === 0}
          >
            <PowerOff className="w-3.5 h-3.5" /> {t("disable")}
          </button>
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90 disabled:opacity-40" disabled={selected.size === 0}>
            <ArrowUpDown className="w-3.5 h-3.5" /> {t("pullLevel")}
          </button>
          <button
            onClick={() => setRemarkOpen(true)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90 disabled:opacity-40"
            disabled={selected.size === 0}
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t("remark")}
          </button>
          {selected.size > 0 && (
            <span className="text-[12px] text-muted-foreground ml-2">{selected.size} selected</span>
          )}
        </div>
      </section>

      {/* Table */}
      <section className="bg-panel border border-panel-border rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-muted/60 text-foreground/80">
                <th className="p-2 border-b border-panel-border w-8">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="p-2 border-b border-panel-border text-center font-normal whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sort && <ArrowUpDown className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.playerID} className="hover:bg-muted/40">
                  <td className="p-2 border-b border-panel-border text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(p.playerID)}
                      onChange={() => toggle(p.playerID)}
                    />
                  </td>
                  <td
                    className="p-2 border-b border-panel-border text-center text-info cursor-pointer hover:underline"
                    onClick={() => setDetailsFor(p)}
                  >
                    {p.playerID}
                  </td>
                  <td
                    className={
                      "p-2 border-b border-panel-border text-center " +
                      (p.status === "disabled" ? "text-danger" : "")
                    }
                  >
                    {p.status === "disabled" ? t("accountDeactivation") : p.nick}
                  </td>
                  <td className="p-2 border-b border-panel-border text-center">{p.superiorID}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.deviceType}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.vip}</td>
                  <td className="p-2 border-b border-panel-border text-center whitespace-nowrap">{p.phone}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.email || "-"}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.channelCode}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.sourceChannel}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.level}</td>
                  <td className="p-2 border-b border-panel-border text-right">{fmt(p.coins)}</td>
                  <td className="p-2 border-b border-panel-border text-right">{fmt(p.totalPayed)}</td>
                  <td className="p-2 border-b border-panel-border text-right">{fmt(p.totalWithdrawal)}</td>
                  <td className="p-2 border-b border-panel-border text-right">{fmt(p.totalBets)}</td>
                  <td className="p-2 border-b border-panel-border text-right">{fmt(p.remainBets)}</td>
                  <td className="p-2 border-b border-panel-border text-right text-success">{fmt(p.totalWin)}</td>
                  <td className="p-2 border-b border-panel-border text-right text-success">{fmt(p.todayWin)}</td>
                  <td className="p-2 border-b border-panel-border text-center whitespace-nowrap">{p.lastPayed}</td>
                  <td className="p-2 border-b border-panel-border text-center whitespace-nowrap">{p.createTime}</td>
                  <td className="p-2 border-b border-panel-border text-center whitespace-nowrap">{p.lastLogin}</td>
                  <td className="p-2 border-b border-panel-border text-center">{p.remark || "-"}</td>
                  <td
                    className="p-2 border-b border-panel-border text-center text-danger cursor-pointer hover:underline whitespace-nowrap"
                    onClick={() => setAdjustFor(p)}
                  >
                    {t("betsAdjustment")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="p-6 text-center text-muted-foreground text-[12px]">
                    {loading ? "Loading…" : "No data"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-3 p-3 text-[12px] text-foreground/80">
          <span>
            {t("total")} {filtered.length}
          </span>
          <select className="h-7 px-1 rounded-sm border border-panel-border bg-panel">
            <option>10{t("perPage")}</option>
            <option>20{t("perPage")}</option>
            <option>50{t("perPage")}</option>
          </select>
          <button className="w-7 h-7 grid place-items-center rounded-sm border border-panel-border hover:border-info">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 grid place-items-center rounded-sm bg-info text-info-foreground">
            1
          </button>
          <button className="w-7 h-7 grid place-items-center rounded-sm border border-panel-border hover:border-info">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span>{t("goTo")}</span>
          <input className="w-10 h-7 text-center rounded-sm border border-panel-border" defaultValue={1} />
        </div>
      </section>

      {detailsFor && (
        <PlayerDetailsDialog
          player={detailsFor}
          onClose={() => setDetailsFor(null)}
          onToggleStatus={() =>
            setStatus([detailsFor.playerID], detailsFor.status === "active" ? "disabled" : "active")
          }
          onEditRemark={(text) => {
            const uid = idMap[detailsFor.playerID];
            supabase.from("profiles").update({ remark: text }).eq("id", uid).then(({ error }) => {
              if (error) { alert(error.message); return; }
              setPlayers((prev) =>
                prev.map((p) => (p.playerID === detailsFor.playerID ? { ...p, remark: text } : p)),
              );
              setDetailsFor({ ...detailsFor, remark: text });
            });
          }}
          onEditLevel={(lvl) => {
            const uid = idMap[detailsFor.playerID];
            const apply = () => {
              setPlayers((prev) =>
                prev.map((p) => (p.playerID === detailsFor.playerID ? { ...p, level: lvl } : p)),
              );
              setDetailsFor({ ...detailsFor, level: lvl });
            };
            if (!uid) { apply(); return; }
            supabase.from("profiles").update({ level: lvl }).eq("id", uid).then(({ error }) => {
              if (error) { alert(error.message); return; }
              apply();
            });
          }}
        />
      )}

      {adjustFor && (
        <BetsAdjustmentDialog
          player={adjustFor}
          onClose={() => setAdjustFor(null)}
          onSave={(v) => saveRemainBets(adjustFor.playerID, v)}
        />
      )}

      {remarkOpen && (
        <RemarkDialog
          count={selected.size}
          onClose={() => setRemarkOpen(false)}
          onSave={applyRemark}
        />
      )}
    </div>
  );
}

/* ---------- Player details dialog ---------- */

function PlayerDetailsDialog({
  player,
  onClose,
  onToggleStatus,
  onEditRemark,
  onEditLevel,
}: {
  player: Player;
  onClose: () => void;
  onToggleStatus: () => void;
  onEditRemark: (text: string) => void;
  onEditLevel: (level: string) => void;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"bank" | "payed" | "withdraw">("payed");
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState(player.remark);
  const levels = useLevels();
  const activeLevels = levels.filter((l) => l.isActive);
  const currentLevel = levels.find((l) => l.name === player.level);

  const disabled = player.status === "disabled";
  const grossProfit = player.totalPayed - player.totalWithdrawal;

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-1.5 text-[12px]">
      <div className="w-32 text-foreground/70 shrink-0">{label}</div>
      <div className="flex-1 min-w-0 break-words">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="bg-panel border border-panel-border rounded-sm shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border bg-muted/40">
          <div className="text-[13px] font-medium">{t("playerDetails")}</div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <button className="p-1 hover:text-foreground"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button className="p-1 hover:text-foreground" onClick={onClose}><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* Player info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[12px] font-medium">{t("playerInformation")}</div>
              <button className="h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]">{t("resetLoginPassword")}</button>
              <button className="h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]">{t("resetSafePassword")}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 border border-panel-border rounded-sm p-3">
              <div>
                <InfoRow label={t("playerID")}>{player.playerID}</InfoRow>
                <InfoRow label={t("deviceType")}>{player.deviceType}</InfoRow>
                <InfoRow label="VIP level">{player.vip}</InfoRow>
                <InfoRow label={t("currentAssets")}>
                  <span>{t("carriedCoins")}: {player.coins.toFixed(2)} | {t("safe")}:{(player.safeCoins ?? 0).toFixed(0)}</span>
                  <button className="ml-2 h-6 px-2 rounded-sm bg-danger text-danger-foreground text-[11px]">{t("insuranceTransfer")}</button>
                </InfoRow>
                <InfoRow label={t("phone")}>
                  <button className="mr-2 h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]">{t("edit")}</button>
                  {player.phone}
                </InfoRow>
                <InfoRow label={t("addr")}>{player.addr || "-"}</InfoRow>
                <InfoRow label={t("remark")}>
                  {editingRemark ? (
                    <span className="inline-flex items-center gap-2">
                      <input
                        className={inputCls + " max-w-[220px]"}
                        value={remarkDraft}
                        onChange={(e) => setRemarkDraft(e.target.value)}
                      />
                      <button
                        className="h-6 px-2 rounded-sm bg-success text-success-foreground text-[11px]"
                        onClick={() => {
                          onEditRemark(remarkDraft);
                          setEditingRemark(false);
                        }}
                      >
                        {t("save")}
                      </button>
                      <button
                        className="h-6 px-2 rounded-sm border border-panel-border text-[11px]"
                        onClick={() => {
                          setRemarkDraft(player.remark);
                          setEditingRemark(false);
                        }}
                      >
                        {t("cancel")}
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <button
                        className="h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]"
                        onClick={() => setEditingRemark(true)}
                      >
                        {t("edit")}
                      </button>
                      {player.remark || "-"}
                    </span>
                  )}
                </InfoRow>
              </div>
              <div>
                <InfoRow label={t("nick")}>{player.nick}</InfoRow>
                <InfoRow label={t("email")}>
                  <button className="mr-2 h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]">{t("edit")}</button>
                  {player.email || "-"}
                </InfoRow>
                <InfoRow label={t("channelCode")}>
                  <button className="mr-2 h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]">{t("edit")}</button>
                  {player.channelCode}
                </InfoRow>
                <InfoRow label={t("goldInTransfer")}>{player.goldInTransfer ?? 0}</InfoRow>
                <InfoRow label={t("level")}>
                  <button className="mr-2 h-6 px-2 rounded-sm bg-info text-info-foreground text-[11px]">{t("edit")}</button>
                  {player.level}
                </InfoRow>
                <InfoRow label={t("status")}>
                  <button
                    className={
                      "mr-2 h-6 px-2 rounded-sm text-[11px] " +
                      (disabled
                        ? "bg-success text-success-foreground"
                        : "bg-danger text-danger-foreground")
                    }
                    onClick={onToggleStatus}
                  >
                    {disabled ? t("enable") : t("disable")}
                  </button>
                  <span className={disabled ? "text-danger" : "text-success"}>
                    {disabled ? t("disabled") : "Enable"}
                  </span>
                </InfoRow>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div>
            <div className="text-[12px] font-medium mb-2">{t("statistics")}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 border border-panel-border rounded-sm p-3">
              <div>
                <InfoRow label={t("totalPayed")}>
                  amount: {player.totalPayed.toFixed(0)} | times: {player.totalPayedTimes ?? 0}
                </InfoRow>
                <InfoRow label={t("totalBets")}>
                  {player.totalBets.toFixed(1)} <span className="text-danger">( {(player.totalPayed > 0 ? player.totalBets / player.totalPayed : 0).toFixed(2)} x )</span>
                </InfoRow>
                <InfoRow label={t("grossProfit")}>{grossProfit.toFixed(0)}</InfoRow>
                <InfoRow label={t("totalWin")}>{player.totalWin.toFixed(2)}</InfoRow>
                <InfoRow label={t("createTime")}>{player.createTime}</InfoRow>
                <InfoRow label={t("lastLogin")}>{player.lastLogin}</InfoRow>
              </div>
              <div>
                <InfoRow label={t("totalWithdraw")}>
                  amount: {player.totalWithdrawal.toFixed(0)} | times: {player.totalWithdrawTimes ?? 0}
                </InfoRow>
                <InfoRow label={t("totalPayout")}>{(player.totalPayout ?? 0).toFixed(2)}</InfoRow>
                <InfoRow label={t("registerMac")}>
                  {player.registerMac || "-"} <span className="text-info">( 1 )</span>
                </InfoRow>
                <InfoRow label={t("todaysWinLoss")}>{player.todayWin.toFixed(1)}</InfoRow>
                <InfoRow label={t("registerIP")}>
                  {player.registerIp || "-"}{" "}
                  {player.registerCountry && (
                    <span className="text-danger">[{player.registerCountry}]</span>
                  )}
                </InfoRow>
                <InfoRow label={t("loginIp")}>
                  {player.loginIp || "-"}{" "}
                  {player.loginCountry && (
                    <span className="text-danger">[{player.loginCountry}]</span>
                  )}
                </InfoRow>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex items-center gap-4 border-b border-panel-border text-[12px]">
              {(
                [
                  ["bank", t("bankInformation")],
                  ["payed", t("payedRecords")],
                  ["withdraw", t("withdrawalRecords")],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={
                    "py-2 -mb-px border-b-2 " +
                    (tab === k
                      ? "border-info text-info"
                      : "border-transparent text-foreground/70 hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="pt-3">
              {tab === "payed" && (
                <RecordsTable rows={player.payedRecords ?? []} />
              )}
              {tab === "withdraw" && (
                <RecordsTable rows={player.withdrawalRecords ?? []} />
              )}
              {tab === "bank" && (
                <div className="text-[12px] text-muted-foreground p-3">No bank information</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-4 py-2 border-t border-panel-border bg-muted/40">
          <button
            className="h-7 px-3 rounded-sm border border-panel-border text-[12px] hover:border-info"
            onClick={onClose}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordsTable({
  rows,
}: {
  rows: { orderNo: string; time: string; amount: number; coins: number }[];
}) {
  const { t } = useT();
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead>
        <tr className="bg-muted/60 text-foreground/80">
          <th className="p-2 border-b border-panel-border text-center font-normal">{t("orderNo")}</th>
          <th className="p-2 border-b border-panel-border text-center font-normal">{t("creationTime")}</th>
          <th className="p-2 border-b border-panel-border text-center font-normal">{t("orderAmount")}</th>
          <th className="p-2 border-b border-panel-border text-center font-normal">{t("coins")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="p-6 text-center text-muted-foreground">
              No records
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.orderNo} className="hover:bg-muted/40">
              <td className="p-2 border-b border-panel-border text-center">{r.orderNo}</td>
              <td className="p-2 border-b border-panel-border text-center">{r.time}</td>
              <td className="p-2 border-b border-panel-border text-center">{r.amount}</td>
              <td className="p-2 border-b border-panel-border text-center">{r.coins}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/* ---------- Bets Adjustment dialog ---------- */

function BetsAdjustmentDialog({
  player,
  onClose,
  onSave,
}: {
  player: Player;
  onClose: () => void;
  onSave: (v: number) => void;
}) {
  const { t } = useT();
  const [value, setValue] = useState<string>(String(player.remainBets));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="bg-panel border border-panel-border rounded-sm shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border bg-muted/40">
          <div className="text-[13px] font-medium">{t("betsAdjustmentTitle")}</div>
          <button className="p-1 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-[12px]">
          <div className="flex justify-between">
            <span className="text-foreground/70">{t("playerID")}</span>
            <span>{player.playerID}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">{t("nick")}</span>
            <span>{player.nick}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">{t("currentRemainBets")}</span>
            <span>{player.remainBets.toFixed(2)}</span>
          </div>
          <div>
            <label className="block text-foreground/70 mb-1">{t("newRemainBets")}</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-2 border-t border-panel-border bg-muted/40">
          <button
            className="h-7 px-3 rounded-sm border border-panel-border text-[12px] hover:border-info"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className="h-7 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90"
            onClick={() => {
              const n = Number(value);
              if (!Number.isNaN(n) && n >= 0) onSave(n);
            }}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Remark bulk dialog ---------- */

function RemarkDialog({
  count,
  onClose,
  onSave,
}: {
  count: number;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const { t } = useT();
  const [text, setText] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="bg-panel border border-panel-border rounded-sm shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border bg-muted/40">
          <div className="text-[13px] font-medium">{t("remark")} ({count})</div>
          <button className="p-1 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            className="w-full h-24 p-2 text-[12px] rounded-sm border border-panel-border bg-panel focus:outline-none focus:border-info"
            placeholder={t("remark")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 px-4 py-2 border-t border-panel-border bg-muted/40">
          <button
            className="h-7 px-3 rounded-sm border border-panel-border text-[12px] hover:border-info"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className="h-7 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90"
            onClick={() => onSave(text)}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}