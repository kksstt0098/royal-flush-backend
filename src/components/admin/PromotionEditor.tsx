import type {
  PromotionDraft,
  BonusConfig,
  WageringConfig,
  GameContribution,
  Targeting,
} from "./promotion-types";

type Props = {
  value: PromotionDraft;
  onChange: (v: PromotionDraft) => void;
  compact?: boolean;
};

const inputCls =
  "w-full px-2 py-1.5 rounded-sm bg-background border border-panel-border text-sm";
const labelCls = "text-[11px] uppercase tracking-wide text-muted-foreground";

function toDatetimeLocal(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromotionEditor({ value, onChange, compact }: Props) {
  const set = <K extends keyof PromotionDraft>(k: K, v: PromotionDraft[K]) =>
    onChange({ ...value, [k]: v });
  const setBonus = (b: BonusConfig) => set("bonus_config", { ...value.bonus_config, ...b });
  const setWager = (w: WageringConfig) =>
    set("wagering_config", { ...value.wagering_config, ...w });
  const setGame = (g: GameContribution) =>
    set("game_contribution", { ...value.game_contribution, ...g });
  const setTarget = (t: Targeting) => set("targeting", { ...value.targeting, ...t });

  const bonus = value.bonus_config;
  const wager = value.wagering_config;
  const game = value.game_contribution;
  const target = value.targeting;

  const csv = (arr?: string[]) => (arr ?? []).join(", ");
  const parseCsv = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Basic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Promotion name</label>
          <input
            className={inputCls + " mt-1"}
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Welcome 100% up to 5000"
          />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select
            className={inputCls + " mt-1"}
            value={value.promo_type}
            onChange={(e) => set("promo_type", e.target.value as PromotionDraft["promo_type"])}
          >
            <option value="deposit_bonus">Deposit bonus</option>
            <option value="cashback">Cashback</option>
            <option value="vip_reward">VIP reward</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Status</label>
          <select
            className={inputCls + " mt-1"}
            value={value.status}
            onChange={(e) => set("status", e.target.value as PromotionDraft["status"])}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Start date</label>
          <input
            type="datetime-local"
            className={inputCls + " mt-1"}
            value={toDatetimeLocal(value.start_date)}
            onChange={(e) =>
              set("start_date", e.target.value ? new Date(e.target.value).toISOString() : null)
            }
          />
        </div>
        <div>
          <label className={labelCls}>End date</label>
          <input
            type="datetime-local"
            className={inputCls + " mt-1"}
            value={toDatetimeLocal(value.end_date)}
            onChange={(e) =>
              set("end_date", e.target.value ? new Date(e.target.value).toISOString() : null)
            }
          />
        </div>
      </div>

      {/* Bonus rule (only meaningful for deposit_bonus but shown for all) */}
      <fieldset className="border border-panel-border rounded-sm p-3">
        <legend className="px-1 text-xs font-semibold">Bonus rule</legend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Trigger</label>
            <select
              className={inputCls + " mt-1"}
              value={bonus.trigger ?? "first_deposit"}
              onChange={(e) => setBonus({ trigger: e.target.value as BonusConfig["trigger"] })}
            >
              <option value="first_deposit">First deposit</option>
              <option value="second_deposit">Second deposit</option>
              <option value="nth_deposit">Nth deposit</option>
              <option value="deposit_amount_based">Deposit amount based</option>
            </select>
          </div>
          {bonus.trigger === "nth_deposit" && (
            <div>
              <label className={labelCls}>N</label>
              <input
                type="number"
                className={inputCls + " mt-1"}
                value={bonus.n ?? 3}
                onChange={(e) => setBonus({ n: Number(e.target.value) || 0 })}
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Min deposit</label>
            <input
              type="number"
              className={inputCls + " mt-1"}
              value={bonus.min_deposit ?? 0}
              onChange={(e) => setBonus({ min_deposit: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelCls}>Bonus type</label>
            <select
              className={inputCls + " mt-1"}
              value={bonus.bonus_type ?? "percent"}
              onChange={(e) =>
                setBonus({ bonus_type: e.target.value as BonusConfig["bonus_type"] })
              }
            >
              <option value="percent">Percent (e.g. 100%)</option>
              <option value="fixed">Fixed amount</option>
              <option value="tiered">Tiered</option>
              <option value="hybrid">Hybrid (percent + fixed)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {(bonus.bonus_type === "percent" ||
            bonus.bonus_type === "hybrid" ||
            !bonus.bonus_type) && (
            <>
              <div>
                <label className={labelCls}>Percent</label>
                <input
                  type="number"
                  className={inputCls + " mt-1"}
                  value={bonus.percent ?? 0}
                  onChange={(e) => setBonus({ percent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className={labelCls}>Max bonus</label>
                <input
                  type="number"
                  className={inputCls + " mt-1"}
                  value={bonus.max_bonus ?? 0}
                  onChange={(e) => setBonus({ max_bonus: Number(e.target.value) || 0 })}
                />
              </div>
            </>
          )}
          {(bonus.bonus_type === "fixed" || bonus.bonus_type === "hybrid") && (
            <div>
              <label className={labelCls}>Fixed bonus</label>
              <input
                type="number"
                className={inputCls + " mt-1"}
                value={bonus.fixed ?? 0}
                onChange={(e) => setBonus({ fixed: Number(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>

        {bonus.bonus_type === "tiered" && (
          <div className="mt-3">
            <label className={labelCls}>Tiers (JSON)</label>
            <textarea
              className={inputCls + " mt-1 font-mono text-xs"}
              rows={4}
              value={JSON.stringify(bonus.tiers ?? [], null, 2)}
              onChange={(e) => {
                try {
                  setBonus({ tiers: JSON.parse(e.target.value) });
                } catch {
                  /* keep typing */
                }
              }}
              placeholder='[{"min":1000,"max":5000,"percent":100},{"min":5001,"percent":150,"max":20000}]'
            />
          </div>
        )}
      </fieldset>

      {/* Wagering */}
      <fieldset className="border border-panel-border rounded-sm p-3">
        <legend className="px-1 text-xs font-semibold">Wagering</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Multiplier (x)</label>
            <input
              type="number"
              className={inputCls + " mt-1"}
              value={wager.multiplier ?? 0}
              onChange={(e) => setWager({ multiplier: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelCls}>Base</label>
            <select
              className={inputCls + " mt-1"}
              value={wager.base ?? "deposit_plus_bonus"}
              onChange={(e) => setWager({ base: e.target.value as WageringConfig["base"] })}
            >
              <option value="deposit_only">Deposit only</option>
              <option value="bonus_only">Bonus only</option>
              <option value="deposit_plus_bonus">Deposit + Bonus</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Game contribution */}
      <fieldset className="border border-panel-border rounded-sm p-3">
        <legend className="px-1 text-xs font-semibold">Game contribution</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Allowed categories (comma separated)</label>
            <input
              className={inputCls + " mt-1"}
              value={csv(game.allowed_categories)}
              onChange={(e) => setGame({ allowed_categories: parseCsv(e.target.value) })}
              placeholder="slots, live, table"
            />
          </div>
          <div>
            <label className={labelCls}>Allowed providers</label>
            <input
              className={inputCls + " mt-1"}
              value={csv(game.allowed_providers)}
              onChange={(e) => setGame({ allowed_providers: parseCsv(e.target.value) })}
              placeholder="pragmatic, evolution"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Blocked games</label>
            <input
              className={inputCls + " mt-1"}
              value={csv(game.blocked_games)}
              onChange={(e) => setGame({ blocked_games: parseCsv(e.target.value) })}
              placeholder="game_code_1, game_code_2"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Contribution rates % (JSON)</label>
            <textarea
              className={inputCls + " mt-1 font-mono text-xs"}
              rows={3}
              value={JSON.stringify(game.rates ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  setGame({ rates: JSON.parse(e.target.value) });
                } catch {
                  /* keep typing */
                }
              }}
              placeholder='{"slots":100,"live":10,"table":20}'
            />
          </div>
        </div>
      </fieldset>

      {/* Targeting */}
      <fieldset className="border border-panel-border rounded-sm p-3">
        <legend className="px-1 text-xs font-semibold">Display / targeting rules</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>User scope</label>
            <select
              className={inputCls + " mt-1"}
              value={target.user_scope ?? "all"}
              onChange={(e) =>
                setTarget({ user_scope: e.target.value as Targeting["user_scope"] })
              }
            >
              <option value="all">All users</option>
              <option value="new">New users only</option>
              <option value="existing">Existing users only</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Min deposit</label>
            <input
              type="number"
              className={inputCls + " mt-1"}
              value={target.min_deposit ?? 0}
              onChange={(e) => setTarget({ min_deposit: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelCls}>Login streak (days)</label>
            <input
              type="number"
              className={inputCls + " mt-1"}
              value={target.login_streak ?? 0}
              onChange={(e) => setTarget({ login_streak: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelCls}>VIP levels (comma-separated numbers)</label>
            <input
              className={inputCls + " mt-1"}
              value={(target.vip_levels ?? []).join(", ")}
              onChange={(e) =>
                setTarget({
                  vip_levels: e.target.value
                    .split(",")
                    .map((x) => Number(x.trim()))
                    .filter((n) => !Number.isNaN(n)),
                })
              }
              placeholder="1, 2, 3"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Country restriction (ISO codes)</label>
            <input
              className={inputCls + " mt-1"}
              value={csv(target.countries)}
              onChange={(e) => setTarget({ countries: parseCsv(e.target.value).map((c) => c.toUpperCase()) })}
              placeholder="MM, TH, VN"
            />
          </div>
        </div>
      </fieldset>

      {/* Link action */}
      <fieldset className="border border-panel-border rounded-sm p-3">
        <legend className="px-1 text-xs font-semibold">Link action</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>On click</label>
            <select
              className={inputCls + " mt-1"}
              value={value.link_action}
              onChange={(e) => set("link_action", e.target.value as PromotionDraft["link_action"])}
            >
              <option value="open_promotion_page">Open promotion page</option>
              <option value="apply_bonus_direct">Apply bonus directly</option>
              <option value="redirect_url">Redirect to URL</option>
            </select>
          </div>
          {value.link_action === "redirect_url" && (
            <div>
              <label className={labelCls}>Redirect URL</label>
              <input
                className={inputCls + " mt-1"}
                value={value.redirect_url ?? ""}
                onChange={(e) => set("redirect_url", e.target.value || null)}
                placeholder="https://…"
              />
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}