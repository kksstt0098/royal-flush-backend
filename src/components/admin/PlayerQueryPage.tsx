import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { mockPlayers, type Player } from "@/lib/mock-players";
import { Search, RotateCcw, Download, Power, PowerOff, ArrowUpDown, MessageSquare, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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

function DateInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative">
      <Calendar className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input className={inputCls + " pl-7"} placeholder={placeholder} />
    </div>
  );
}

export function PlayerQueryPage() {
  const { t } = useT();
  const [players] = useState<Player[]>(mockPlayers);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = selected.size === players.length && players.length > 0;

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(players.map((p) => p.playerID)));

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

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      {/* Filter panel */}
      <section className="bg-panel border border-panel-border rounded-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-3">
          <Field label={t("playerID")}>
            <input className={inputCls} defaultValue="1075559" />
          </Field>
          <Field label={t("superiorID")}>
            <input className={inputCls} placeholder="Superior ID" />
          </Field>
          <Field label={t("deviceType")}>
            <select className={inputCls}><option>{t("all")}</option><option>android</option><option>ios</option><option>web</option></select>
          </Field>
          <Field label={t("payed")}>
            <select className={inputCls}><option>{t("allPlayers")}</option></select>
          </Field>
          <Field label={t("phone")}>
            <input className={inputCls} placeholder={t("phone")} />
          </Field>
          <Field label={t("email")}>
            <input className={inputCls} placeholder="email" />
          </Field>
          <Field label={t("ipAddr")}>
            <input className={inputCls} placeholder="login/register ip" />
          </Field>
          <Field label={t("level")}>
            <select className={inputCls}><option>{t("all")}</option></select>
          </Field>
          <Field label={t("channelCode")}>
            <input className={inputCls} placeholder="Channel code" />
          </Field>
          <Field label={t("vipLevel")}>
            <div className="flex items-center gap-2">
              <input className={inputCls} />
              <span className="text-muted-foreground text-[12px]">{t("to")}</span>
              <input className={inputCls} />
            </div>
          </Field>
          <Field label={t("bankAccount")}>
            <input className={inputCls} placeholder="Bank Account" />
          </Field>
          <Field label={t("status")}>
            <select className={inputCls}><option>{t("select")}</option></select>
          </Field>
          <Field label={t("registrationDate")}>
            <div className="flex items-center gap-2">
              <DateInput placeholder={t("startDate")} />
              <span className="text-muted-foreground text-[12px]">{t("to")}</span>
              <DateInput placeholder={t("endDate")} />
            </div>
          </Field>
          <Field label={t("lastLogin")}>
            <div className="flex items-center gap-2">
              <DateInput placeholder={t("startDate")} />
              <span className="text-muted-foreground text-[12px]">{t("to")}</span>
              <DateInput placeholder={t("endDate")} />
            </div>
          </Field>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90">
            <Search className="w-3.5 h-3.5" /> {t("search")}
          </button>
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-warning text-warning-foreground text-[12px] hover:opacity-90">
            <RotateCcw className="w-3.5 h-3.5" /> {t("reset")}
          </button>
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px] hover:opacity-90">
            <Download className="w-3.5 h-3.5" /> {t("export")}
          </button>
        </div>
      </section>

      {/* Bulk actions */}
      <section className="bg-panel border border-panel-border rounded-sm p-3">
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-success text-success-foreground text-[12px] hover:opacity-90">
            <Power className="w-3.5 h-3.5" /> {t("enable")}
          </button>
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-danger text-danger-foreground text-[12px] hover:opacity-90">
            <PowerOff className="w-3.5 h-3.5" /> {t("disable")}
          </button>
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90">
            <ArrowUpDown className="w-3.5 h-3.5" /> {t("pullLevel")}
          </button>
          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-sm bg-info text-info-foreground text-[12px] hover:opacity-90">
            <MessageSquare className="w-3.5 h-3.5" /> {t("remark")}
          </button>
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
                  <th key={c.key} className="p-2 border-b border-panel-border text-center font-normal whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sort && <ArrowUpDown className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.playerID} className="hover:bg-muted/40">
                  <td className="p-2 border-b border-panel-border text-center">
                    <input type="checkbox" checked={selected.has(p.playerID)} onChange={() => toggle(p.playerID)} />
                  </td>
                  <td className="p-2 border-b border-panel-border text-center text-info cursor-pointer hover:underline">{p.playerID}</td>
                  <td className={"p-2 border-b border-panel-border text-center " + (p.status === "disabled" ? "text-danger" : "")}>{p.nick}</td>
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
                  <td className="p-2 border-b border-panel-border text-center text-danger cursor-pointer hover:underline whitespace-nowrap">
                    {t("betsAdjustment")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-3 p-3 text-[12px] text-foreground/80">
          <span>{t("total")} {players.length}</span>
          <select className="h-7 px-1 rounded-sm border border-panel-border bg-panel">
            <option>10{t("perPage")}</option>
            <option>20{t("perPage")}</option>
            <option>50{t("perPage")}</option>
          </select>
          <button className="w-7 h-7 grid place-items-center rounded-sm border border-panel-border hover:border-info">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 grid place-items-center rounded-sm bg-info text-info-foreground">1</button>
          <button className="w-7 h-7 grid place-items-center rounded-sm border border-panel-border hover:border-info">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span>{t("goTo")}</span>
          <input className="w-10 h-7 text-center rounded-sm border border-panel-border" defaultValue={1} />
        </div>
      </section>
    </div>
  );
}