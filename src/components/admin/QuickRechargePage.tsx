import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { Search } from "lucide-react";

type PlayerInfo = {
  id: string;
  nick: string | null;
  email: string | null;
  coins: number;
  safe_coins: number;
  frozen: number;
};

export function QuickRechargePage() {
  const { t } = useT();
  const [playerId, setPlayerId] = useState("");
  const [info, setInfo] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [amount, setAmount] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const lookup = async () => {
    const id = playerId.trim();
    if (!id) return;
    setLoading(true);
    setLookupError("");
    setInfo(null);
    setMessage(null);
    const { data: wallet, error: wErr } = await supabase
      .from("wallets")
      .select("user_id,coins,safe_coins,frozen")
      .eq("user_id", id)
      .maybeSingle();
    if (wErr || !wallet) {
      setLoading(false);
      setLookupError(wErr?.message ?? "Player not found");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,nick,email")
      .eq("id", id)
      .maybeSingle();
    setInfo({
      id: wallet.user_id,
      nick: profile?.nick ?? null,
      email: profile?.email ?? null,
      coins: Number(wallet.coins),
      safe_coins: Number(wallet.safe_coins),
      frozen: Number(wallet.frozen),
    });
    setLoading(false);
  };

  const amountNum = Number(amount);
  const canSubmit =
    !!info && !submitting && Number.isFinite(amountNum) && amountNum !== 0;

  const submit = async () => {
    if (!canSubmit || !info) return;
    const action = amountNum > 0 ? "Add" : "Subtract";
    if (
      !confirm(
        `${action} ${Math.abs(amountNum).toLocaleString()} ${
          amountNum > 0 ? "to" : "from"
        } ${info.nick ?? info.id}?`,
      )
    )
      return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.rpc("admin_adjust_player", {
      _player_id: info.id,
      _amount: amountNum,
      _remark: remark || "",
    });
    if (error) {
      setMessage({ kind: "err", text: error.message });
    } else {
      setMessage({
        kind: "ok",
        text: `${action} ${Math.abs(amountNum).toLocaleString()} successful.`,
      });
      setAmount("");
      setRemark("");
      // refresh wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("coins,safe_coins,frozen")
        .eq("user_id", info.id)
        .maybeSingle();
      if (wallet) {
        setInfo({
          ...info,
          coins: Number(wallet.coins),
          safe_coins: Number(wallet.safe_coins),
          frozen: Number(wallet.frozen),
        });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-panel border border-panel-border rounded-md p-4 space-y-4">
        <h2 className="text-sm font-semibold">{t("quickRecharge")}</h2>

        {/* Lookup */}
        <div>
          <label className="text-xs text-muted-foreground">Player ID (UUID)</label>
          <div className="flex gap-2 mt-1">
            <input
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") lookup();
              }}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="flex-1 h-9 px-2 rounded-sm border border-input bg-background text-sm font-mono"
            />
            <button
              onClick={lookup}
              disabled={loading || !playerId.trim()}
              className="h-9 px-4 rounded-sm bg-info text-info-foreground text-sm flex items-center gap-1 hover:bg-info/90 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? "…" : "Search"}
            </button>
          </div>
          {lookupError && (
            <div className="text-xs text-red-600 mt-1">{lookupError}</div>
          )}
        </div>

        {/* Player info */}
        {info && (
          <div className="border border-panel-border rounded-sm bg-background p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {info.nick ?? "(no nick)"}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {info.id}
                </div>
                {info.email && (
                  <div className="text-[11px] text-muted-foreground">
                    {info.email}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Balance</div>
                <div className="text-lg font-semibold text-info">
                  {info.coins.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-panel-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Safe Coins</span>
                <span>{info.safe_coins.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frozen</span>
                <span>{info.frozen.toLocaleString()}</span>
              </div>
            </div>

            {/* Amount + remark */}
            <div className="pt-3 border-t border-panel-border space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Amount (use "-" to subtract, e.g. -500)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500 or -500"
                  className="w-full h-9 px-2 mt-1 rounded-sm border border-input bg-background text-sm"
                />
                {Number.isFinite(amountNum) && amountNum !== 0 && (
                  <div className="text-[11px] mt-1">
                    {amountNum > 0 ? (
                      <span className="text-green-600">
                        + {amountNum.toLocaleString()} (new balance ={" "}
                        {(info.coins + amountNum).toLocaleString()})
                      </span>
                    ) : (
                      <span className="text-red-600">
                        − {Math.abs(amountNum).toLocaleString()} (new balance ={" "}
                        {(info.coins + amountNum).toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("remark")}
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Optional note"
                  className="w-full px-2 py-2 mt-1 rounded-sm border border-input bg-background text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="h-9 px-4 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting
                    ? "Processing…"
                    : amountNum < 0
                      ? "Subtract from Balance"
                      : "Add to Balance"}
                </button>
                {message && (
                  <span
                    className={
                      message.kind === "ok"
                        ? "text-xs text-green-600"
                        : "text-xs text-red-600"
                    }
                  >
                    {message.text}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                All adjustments are recorded in Offline Recharge history.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}