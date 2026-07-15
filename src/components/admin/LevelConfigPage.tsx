import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Plus, Pencil, Check, X, Upload, Layers } from "lucide-react";

type Level = {
  id: string;
  levelNumber: number;
  name: string;
  iconDataUrl?: string;
  minExperience: number;
  minTurnover: number;
  levelReward: number;
  dailyWithdraw: number | null;
  weeklyWithdraw: number | null;
  monthlyWithdraw: number | null;
  turnoverMultiplier: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

const MOCK_LEVELS: Level[] = [
  { id: "gl1", levelNumber: 1, name: "Bronze", minExperience: 0, minTurnover: 0, levelReward: 0, dailyWithdraw: 50000, weeklyWithdraw: 200000, monthlyWithdraw: 500000, turnoverMultiplier: 1, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "gl2", levelNumber: 2, name: "Silver", minExperience: 5000, minTurnover: 100000, levelReward: 500, dailyWithdraw: 100000, weeklyWithdraw: 400000, monthlyWithdraw: 1000000, turnoverMultiplier: 1, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "gl3", levelNumber: 3, name: "Gold", minExperience: 20000, minTurnover: 500000, levelReward: 2500, dailyWithdraw: 250000, weeklyWithdraw: 1000000, monthlyWithdraw: 2500000, turnoverMultiplier: 1.2, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "khine" },
];

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());

export function LevelConfigPage() {
  const [levels, setLevels] = useState(MOCK_LEVELS);
  const [editing, setEditing] = useState<Level | null>(null);
  const [creating, setCreating] = useState(false);

  const toggleActive = (id: string) =>
    setLevels((ls) =>
      ls.map((l) =>
        l.id === id
          ? { ...l, isActive: !l.isActive, updatedAt: new Date().toISOString().slice(0, 10), updatedBy: "vyy" }
          : l,
      ),
    );

  return (
    <div className="bg-panel border border-panel-border rounded-md min-h-[calc(100vh-140px)]">
      <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30">
        <div className="text-[13px] font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-info" /> Level config
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[12px] flex items-center gap-1 hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" /> New level
        </button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11.5px] uppercase text-muted-foreground">
            <tr>
              {[
                "#",
                "Name",
                "Min XP",
                "Min Turnover",
                "Level Reward",
                "Daily WD",
                "Weekly WD",
                "Monthly WD",
                "Multiplier",
                "Status",
                "Created",
                "Updated",
                "Operators",
                "",
              ].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...levels]
              .sort((a, b) => a.levelNumber - b.levelNumber)
              .map((l) => {
                const operators = Array.from(new Set([l.createdBy, l.updatedBy])).join(", ");
                return (
                  <tr key={l.id} className="border-t border-panel-border hover:bg-muted/20">
                    <td className="px-3 py-2 tabular-nums">{l.levelNumber}</td>
                    <td className="px-3 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        {l.iconDataUrl ? (
                          <img src={l.iconDataUrl} alt="" className="w-6 h-6 rounded-sm object-cover border border-panel-border" />
                        ) : (
                          <div className="w-6 h-6 rounded-sm bg-muted" />
                        )}
                        {l.name}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{fmt(l.minExperience)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(l.minTurnover)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(l.levelReward)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(l.dailyWithdraw)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(l.weeklyWithdraw)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(l.monthlyWithdraw)}</td>
                    <td className="px-3 py-2 tabular-nums">×{l.turnoverMultiplier}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] " +
                          (l.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground/70")
                        }
                      >
                        {l.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                      {l.createdBy} · {l.createdAt}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                      {l.updatedBy} · {l.updatedAt}
                    </td>
                    <td className="px-3 py-2 text-[11px]">{operators}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit"
                          onClick={() => setEditing(l)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-muted/60 text-foreground/70"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title={l.isActive ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(l.id)}
                          className={
                            "h-7 w-7 inline-flex items-center justify-center rounded-sm " +
                            (l.isActive ? "hover:bg-danger/10 text-danger" : "hover:bg-success/10 text-success")
                          }
                        >
                          {l.isActive ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {(editing || creating) && (
        <LevelEditor
          level={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(l) => {
            if (editing) setLevels((ls) => ls.map((x) => (x.id === l.id ? l : x)));
            else setLevels((ls) => [...ls, { ...l, id: "gl" + (ls.length + 1) }]);
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full h-8 px-2 rounded-sm border border-panel-border bg-background text-[12.5px] focus:outline-none focus:border-info";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function LevelEditor({
  level,
  onClose,
  onSave,
}: {
  level: Level | null;
  onClose: () => void;
  onSave: (l: Level) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<Level>(
    level ?? {
      id: "",
      levelNumber: 1,
      name: "",
      minExperience: 0,
      minTurnover: 0,
      levelReward: 0,
      dailyWithdraw: null,
      weeklyWithdraw: null,
      monthlyWithdraw: null,
      turnoverMultiplier: 1,
      isActive: true,
      createdAt: today,
      createdBy: "vyy",
      updatedAt: today,
      updatedBy: "vyy",
    },
  );
  const [iconError, setIconError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const num = (v: string) => (v === "" ? 0 : Number(v));

  const handleIcon = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setIconError("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        if (img.width !== 240 || img.height !== 240) {
          setIconError(`Image must be exactly 240×240 px (got ${img.width}×${img.height}).`);
          return;
        }
        setIconError(null);
        setF((prev) => ({ ...prev, iconDataUrl: dataUrl }));
      };
      img.onerror = () => setIconError("Could not read image.");
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-panel border border-panel-border rounded-md w-full max-w-3xl max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-11 px-4 flex items-center justify-between border-b border-panel-border bg-muted/30 sticky top-0">
          <div className="text-[13px] font-semibold">{level ? `Edit ${level.name}` : "New level config"}</div>
          <X className="w-4 h-4 cursor-pointer hover:text-danger" onClick={onClose} />
        </div>

        <div className="p-4 grid grid-cols-3 gap-4">
          {/* Icon uploader */}
          <div className="col-span-3 md:col-span-1 flex flex-col items-center gap-2">
            <div className="text-[11.5px] text-muted-foreground self-start">Icon (240 × 240 px)</div>
            <div className="w-[240px] h-[240px] rounded-md border border-dashed border-panel-border bg-background flex items-center justify-center overflow-hidden">
              {f.iconDataUrl ? (
                <img src={f.iconDataUrl} alt="icon" className="w-full h-full object-cover" />
              ) : (
                <div className="text-[11px] text-muted-foreground text-center px-2">
                  No icon yet.
                  <br />
                  Upload a 240×240 image.
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleIcon} className="hidden" />
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="h-8 px-3 rounded-sm border border-panel-border text-[12px] flex items-center gap-1 hover:bg-muted/40"
              >
                <Upload className="w-3.5 h-3.5" /> Upload icon
              </button>
              {f.iconDataUrl && (
                <button
                  onClick={() => setF({ ...f, iconDataUrl: undefined })}
                  className="h-8 px-3 rounded-sm border border-panel-border text-[12px] text-danger hover:bg-danger/10"
                >
                  Remove
                </button>
              )}
            </div>
            {iconError && <div className="text-[11px] text-danger text-center">{iconError}</div>}
          </div>

          {/* Fields */}
          <div className="col-span-3 md:col-span-2 grid grid-cols-2 gap-3 text-[12.5px]">
            <Field label="Level number">
              <input type="number" value={f.levelNumber} onChange={(e) => setF({ ...f, levelNumber: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Name">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="Gold" />
            </Field>
            <Field label="Min experience to reach">
              <input type="number" value={f.minExperience} onChange={(e) => setF({ ...f, minExperience: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Min turnover to reach">
              <input type="number" value={f.minTurnover} onChange={(e) => setF({ ...f, minTurnover: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Level reward (one-time)">
              <input type="number" value={f.levelReward} onChange={(e) => setF({ ...f, levelReward: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Turnover multiplier">
              <input type="number" step="0.1" value={f.turnoverMultiplier} onChange={(e) => setF({ ...f, turnoverMultiplier: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Daily WD">
              <input
                type="number"
                value={f.dailyWithdraw ?? ""}
                onChange={(e) => setF({ ...f, dailyWithdraw: e.target.value === "" ? null : num(e.target.value) })}
                className={inputCls}
                placeholder="unlimited"
              />
            </Field>
            <Field label="Weekly WD">
              <input
                type="number"
                value={f.weeklyWithdraw ?? ""}
                onChange={(e) => setF({ ...f, weeklyWithdraw: e.target.value === "" ? null : num(e.target.value) })}
                className={inputCls}
                placeholder="unlimited"
              />
            </Field>
            <Field label="Monthly WD">
              <input
                type="number"
                value={f.monthlyWithdraw ?? ""}
                onChange={(e) => setF({ ...f, monthlyWithdraw: e.target.value === "" ? null : num(e.target.value) })}
                className={inputCls}
                placeholder="unlimited"
              />
            </Field>
            <Field label="Status">
              <label className="inline-flex items-center gap-2 h-8">
                <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
                <span>{f.isActive ? "Active" : "Inactive"}</span>
              </label>
            </Field>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-panel-border flex justify-end gap-2 sticky bottom-0 bg-panel">
          <button onClick={onClose} className="h-8 px-4 rounded-sm border border-panel-border text-[12.5px] hover:bg-muted/40">
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...f, updatedAt: today, updatedBy: "vyy" })}
            className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-[12.5px] hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
