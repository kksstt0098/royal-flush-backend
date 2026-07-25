import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RangeSchema = z.enum([
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "last7",
  "last30",
  "last90",
]);
export type DashboardRange = z.infer<typeof RangeSchema>;

function windowFor(range: DashboardRange): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const startOfWeek = (d: Date) => {
    const s = startOfDay(d);
    const day = s.getDay(); // 0 = Sun
    return addDays(s, -day);
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  let start: Date;
  let end: Date;
  switch (range) {
    case "today":
      start = startOfDay(now);
      end = addDays(start, 1);
      break;
    case "yesterday":
      end = startOfDay(now);
      start = addDays(end, -1);
      break;
    case "thisWeek":
      start = startOfWeek(now);
      end = addDays(start, 7);
      break;
    case "lastWeek":
      end = startOfWeek(now);
      start = addDays(end, -7);
      break;
    case "thisMonth":
      start = startOfMonth(now);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case "lastMonth":
      end = startOfMonth(now);
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      break;
    case "last7":
      end = now;
      start = addDays(startOfDay(now), -6);
      break;
    case "last30":
      end = now;
      start = addDays(startOfDay(now), -29);
      break;
    case "last90":
      end = now;
      start = addDays(startOfDay(now), -89);
      break;
  }
  const span = end.getTime() - start.getTime();
  return { start, end, prevStart: new Date(start.getTime() - span), prevEnd: start };
}

export type DashboardStats = {
  range: DashboardRange;
  window: { start: string; end: string };
  players: {
    total: number;
    newRegister: number;
    referralRegister: number;
    firstDeposit: number;
    vip: number;
  };
  financial: {
    totalDeposit: number;
    totalWithdrawal: number;
    netDeposit: number;
    walletTotal: number;
  };
  gaming: {
    totalBet: number;
    totalPayout: number;
    playerWin: number;
    houseWin: number;
    ggr: number;
    rtp: number | null;
  };
  bonus: {
    totalBonus: number;
  };
  quick: {
    pendingWithdrawal: number;
    pendingDeposit: number;
  };
  topWinners: { id: string; user: string; game: string; win: number; time: string }[];
  topWallets: { user: string; vip: number; balance: number; last: string | null }[];
  deltas: {
    totalDeposit: number | null;
    totalWithdrawal: number | null;
    newRegister: number | null;
    totalBet: number | null;
  };
};

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export const getDashboardStats = createServerFn({ method: "POST" })
  .inputValidator((input: { range?: DashboardRange } | undefined) => ({
    range: RangeSchema.parse(input?.range ?? "today"),
  }))
  .handler(async ({ data }): Promise<DashboardStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { start, end, prevStart, prevEnd } = windowFor(data.range);
    const iso = (d: Date) => d.toISOString();

    const sumAmount = async (
      table: "deposits" | "withdrawals",
      field: string,
      from: Date,
      to: Date,
      status?: string,
    ) => {
      let q = (supabaseAdmin.from(table) as unknown as {
        select: (s: string) => {
          gte: (a: string, b: string) => {
            lt: (a: string, b: string) => {
              eq: (a: string, b: string) => Promise<{ data: Record<string, unknown>[] | null }>;
            } & Promise<{ data: Record<string, unknown>[] | null }>;
          };
        };
      })
        .select(field)
        .gte("created_at", iso(from))
        .lt("created_at", iso(to));
      if (status) q = q.eq("status", status) as never;
      const { data: rows } = await (q as unknown as Promise<{ data: Record<string, unknown>[] | null }>);
      return (rows ?? []).reduce((acc: number, r: Record<string, unknown>) => acc + Number(r[field] ?? 0), 0);
    };

    const countRows = async (
      table: string,
      opts: { from?: Date; to?: Date; column?: string; eq?: [string, unknown]; gt?: [string, number] } = {},
    ) => {
      let q = supabaseAdmin.from(table as never).select("*", { count: "exact", head: true });
      if (opts.from) q = q.gte(opts.column ?? "created_at", iso(opts.from));
      if (opts.to) q = q.lt(opts.column ?? "created_at", iso(opts.to));
      if (opts.eq) q = q.eq(opts.eq[0], opts.eq[1] as never);
      if (opts.gt) q = q.gt(opts.gt[0], opts.gt[1]);
      const { count } = await q;
      return count ?? 0;
    };

    const [
      totalPlayers,
      newRegister,
      newRegisterPrev,
      referralRegister,
      vipCount,
      firstDeposit,
      totalDeposit,
      totalDepositPrev,
      totalWithdrawal,
      totalWithdrawalPrev,
      totalBonus,
      pendingWithdrawal,
      pendingDeposit,
      betsRes,
      betsPrevRes,
      walletsRes,
      topWinnersRes,
      topWalletsRes,
    ] = await Promise.all([
      countRows("profiles"),
      countRows("profiles", { from: start, to: end }),
      countRows("profiles", { from: prevStart, to: prevEnd }),
      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", iso(start))
        .lt("created_at", iso(end))
        .not("superior_id", "is", null)
        .then((r) => r.count ?? 0),
      countRows("profiles", { gt: ["vip", 0] }),
      supabaseAdmin
        .from("deposits")
        .select("player_id", { head: false })
        .eq("status", "Successful")
        .gte("created_at", iso(start))
        .lt("created_at", iso(end))
        .then((r) => new Set((r.data ?? []).map((x: { player_id: string }) => x.player_id)).size),
      sumAmount("deposits", "amount", start, end, "Successful"),
      sumAmount("deposits", "amount", prevStart, prevEnd, "Successful"),
      sumAmount("withdrawals", "actual_amount", start, end, "Successful"),
      sumAmount("withdrawals", "actual_amount", prevStart, prevEnd, "Successful"),
      supabaseAdmin
        .from("deposits")
        .select("bonus_amount")
        .eq("status", "Successful")
        .gte("created_at", iso(start))
        .lt("created_at", iso(end))
        .then((r) => ((r.data ?? []) as Array<{ bonus_amount: number | null }>).reduce((a, x) => a + Number(x.bonus_amount ?? 0), 0)),
      countRows("withdrawals", { eq: ["status", "Pending"] }),
      countRows("deposits", { eq: ["status", "Pending"] }),
      supabaseAdmin
        .from("bets")
        .select("stake, win_amount")
        .gte("created_at", iso(start))
        .lt("created_at", iso(end)),
      supabaseAdmin
        .from("bets")
        .select("stake, win_amount")
        .gte("created_at", iso(prevStart))
        .lt("created_at", iso(prevEnd)),
      supabaseAdmin.from("wallets").select("coins"),
      supabaseAdmin
        .from("bets")
        .select("id, player_id, game, win_amount, created_at")
        .gte("created_at", iso(start))
        .lt("created_at", iso(end))
        .order("win_amount", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("wallets")
        .select("user_id, coins, updated_at")
        .order("coins", { ascending: false })
        .limit(5),
    ]);

    const betRows = ((betsRes as { data: Array<{ stake: number; win_amount: number }> | null }).data ?? []);
    const totalBet = betRows.reduce((a, r) => a + Number(r.stake ?? 0), 0);
    const totalPayout = betRows.reduce((a, r) => a + Number(r.win_amount ?? 0), 0);
    const prevBetRows = ((betsPrevRes as { data: Array<{ stake: number }> | null }).data ?? []);
    const totalBetPrev = prevBetRows.reduce((a, r) => a + Number(r.stake ?? 0), 0);
    const houseWin = totalBet - totalPayout;
    const rtp = totalBet > 0 ? (totalPayout / totalBet) * 100 : null;
    const walletTotal = (((walletsRes as { data: Array<{ coins: number }> | null }).data ?? [])).reduce(
      (a, r) => a + Number(r.coins ?? 0),
      0,
    );

    const winnerRows = (topWinnersRes.data ?? []) as {
      id: string;
      player_id: string;
      game: string;
      win_amount: number;
      created_at: string;
    }[];
    const winnerIds = [...new Set(winnerRows.map((r) => r.player_id))];
    const walletUserIds = [...new Set(((topWalletsRes.data ?? []) as { user_id: string }[]).map((r) => r.user_id))];
    const allUserIds = [...new Set([...winnerIds, ...walletUserIds])];
    const profilesRes =
      allUserIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, nick, vip").in("id", allUserIds)
        : { data: [] };
    const profileMap = new Map<string, { nick: string; vip: number }>();
    for (const p of (profilesRes.data ?? []) as { id: string; nick: string; vip: number }[]) {
      profileMap.set(p.id, { nick: p.nick, vip: p.vip });
    }

    return {
      range: data.range,
      window: { start: iso(start), end: iso(end) },
      players: {
        total: totalPlayers,
        newRegister,
        referralRegister,
        firstDeposit,
        vip: vipCount,
      },
      financial: {
        totalDeposit,
        totalWithdrawal,
        netDeposit: totalDeposit - totalWithdrawal,
        walletTotal,
      },
      gaming: {
        totalBet,
        totalPayout,
        playerWin: totalPayout,
        houseWin,
        ggr: houseWin,
        rtp,
      },
      bonus: {
        totalBonus,
      },
      quick: {
        pendingWithdrawal,
        pendingDeposit,
      },
      topWinners: winnerRows.map((r) => ({
        id: r.id,
        user: profileMap.get(r.player_id)?.nick ?? r.player_id.slice(0, 8),
        game: r.game,
        win: Number(r.win_amount ?? 0),
        time: new Date(r.created_at).toISOString().slice(11, 16),
      })),
      topWallets: ((topWalletsRes.data ?? []) as { user_id: string; coins: number; updated_at: string }[]).map((r) => ({
        user: profileMap.get(r.user_id)?.nick ?? r.user_id.slice(0, 8),
        vip: profileMap.get(r.user_id)?.vip ?? 0,
        balance: Number(r.coins ?? 0),
        last: r.updated_at,
      })),
      deltas: {
        totalDeposit: pctDelta(totalDeposit, totalDepositPrev),
        totalWithdrawal: pctDelta(totalWithdrawal, totalWithdrawalPrev),
        newRegister: pctDelta(newRegister, newRegisterPrev),
        totalBet: pctDelta(totalBet, totalBetPrev),
      },
    };
  });