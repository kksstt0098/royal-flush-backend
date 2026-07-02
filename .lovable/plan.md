
# Online Casino Backend — Full Plan

လက်ရှိ app က mock in-memory data တွေနဲ့ ပဲ အလုပ်လုပ်နေတယ်။ Cloudflare Workers (Lovable hosting) မှာ deploy လုပ်လို့ရတဲ့ ဒီ TanStack Start stack ကို အောက်ကအတိုင်း တကယ့် backend ဖြစ်အောင် ပြောင်းပါမယ်။ Lovable Cloud (Postgres + Auth + RLS) က backend infrastructure ဖြစ်ပြီး၊ business logic တွေက `createServerFn` (server functions) မှာ run မယ်။ mock stores တွေအားလုံးကို ဖြုတ်ပြီး database ကို ချိတ်ပါမယ်။

## Delivery in 4 phases (တဆင့်ချင်း ship လုပ်လို့ရအောင်)

### Phase 1 — Foundation (auth + schema + roles)

Database schema တွေဆောက်ပြီး admin/player auth ကို enable လုပ်မယ်။

Tables (all in `public`, RLS enabled, GRANTs included):
- `profiles` — `id uuid PK → auth.users`, `nick`, `phone`, `email`, `vip int`, `level text`, `channel_code`, `source_channel`, `device_type`, `superior_id`, `remark`, `status`, `register_ip`, `register_country`, `login_ip`, `login_country`, timestamps
- `wallets` — `user_id uuid PK`, `coins numeric`, `safe_coins numeric`, `gold_in_transfer numeric`, `total_payed`, `total_withdrawal`, `total_bets`, `remain_bets`, `total_win`, `today_win`, `total_payed_times`, `total_withdraw_times`, `last_payed_at`
- `user_roles` — `id`, `user_id`, `role app_role enum('admin','auditor','payer','player')`, unique(user_id, role)
- `withdrawals` — order_no, player_id, amount, fee, actual_amount, payout_mode, account_no, channel, out_trade_no, status enum, auditor, transferor, lock_user, lock_flag, first_withdrawal, timestamps, remark
- `deposits` (payed_records) — order_no, player_id, amount, coins, channel, status, timestamps
- `bets` — id, player_id, game, stake, win_amount, created_at (basic model for win/loss stats)
- `mails` — id, player_id, subject, body, sent_by (admin uid), read, created_at
- `audit_logs` — id, actor uid, action, target_type, target_id, before jsonb, after jsonb, created_at
- `withdrawal_status_history` — withdrawal_id, from_status, to_status, actor, remark, created_at

Enums: `app_role`, `withdrawal_status` (Pending/Audited/Reject/Freeze/PayingOut/Failed/Successful), `lock_flag`.

Functions/triggers:
- `has_role(uid, role)` SECURITY DEFINER — RLS ထဲ recursion မဖြစ်အောင်
- `handle_new_user()` trigger on `auth.users` insert → `profiles`+`wallets` row create ပြီး default `player` role assign
- `apply_withdrawal_approve/reject/risk_control` DB functions — atomic status change + wallet freeze/refund + status history entry
- `set_updated_at()` trigger

RLS policies (highlights):
- `profiles` — user reads own; admin/auditor read all; user updates own limited fields
- `wallets` — user reads own; admin all; writes only via SECURITY DEFINER functions
- `withdrawals` — player reads own; auditor/admin/payer read all; player insert (create withdrawal); status changes only via DB functions
- `mails` — player reads own; admin insert/read all
- `user_roles` — read own; only admin can insert/delete (via has_role)

Auth:
- Email/password for both admin and player (Google login ကို default အနေနဲ့ ထည့်မယ်, `supabase--configure_social_auth` google)
- Admin bootstrapping: first admin ကို seed migration နဲ့ ရော၊ Cloud UI ကနေရော ဖန်တီးလို့ရမယ်။ User signs up → admin promotes with a server fn

### Phase 2 — Server functions (business logic)

`src/lib/*.functions.ts` files၊ အားလုံး `requireSupabaseAuth` middleware + role check:

- `players.functions.ts` — listPlayers (admin), getPlayer, updatePlayerRemark, toggleStatus
- `withdrawals.functions.ts` — listWithdrawals (filters, pagination), createWithdrawal (player), approveWithdrawal, rejectWithdrawal, riskControlWithdrawal, markPaid, lockWithdrawal, unlockWithdrawal, exportCsv
- `mailbox.functions.ts` — listMails (player: own; admin: any), sendMail (admin only), markRead
- `deposits.functions.ts` — createDeposit (mock top-up for player), listDeposits
- `stats.functions.ts` — dashboard aggregates (total orders, apply/actual amounts)
- `roles.functions.ts` — grantRole/revokeRole (admin only)

All admin actions write to `audit_logs`. Every action returns plain DTOs.

### Phase 3 — Frontend rewire (admin panel)

Mock stores တွေ ဖြုတ်ပြီး TanStack Query နဲ့ database ကို ချိတ်မယ်:

- Delete: `src/lib/mock-players.ts`, `mock-withdrawals.ts`, `withdrawal-store.ts`, `mailbox-store.ts` (or keep types only)
- Add `_authenticated/` layout (integration-managed) for admin routes
- Add `/auth` route (admin login) with Email + Google
- Refactor `PlayerQueryPage`, `WithdrawalOrderPage`, `ReviewWithdrawalPage`, `WithdrawalPaymentPage`, `TransferReviewModal`, `OrderDetailsModal` to use `useSuspenseQuery` + `useServerFn` calls
- Realtime subscription on `withdrawals` table so review/payment pages update live when players create new orders

### Phase 4 — Player-facing app + testing

- New public route tree: `/`, `/login`, `/register`, `/wallet`, `/withdraw`, `/mailbox`, `/history`
- Simple player UI: view balance, request withdrawal (creates row with `Pending`), read mailbox, see deposit/withdrawal history
- Admin panel moves to `/admin/*` under `_authenticated/` + admin role gate
- Testing playbook in preview:
  1. Sign up admin account → grant admin role via seeded SQL / server fn
  2. Sign up 2 player accounts, top-up coins via mock deposit fn
  3. Player requests withdrawal → appears in admin Review page live
  4. Admin approves → moves to Payment page → mark paid → player sees Successful + mail
  5. Admin rejects/risk-controls → verify wallet freeze + mail delivery

## Technical notes

- Runtime: `createServerFn` (not edge functions) — runs in Cloudflare Worker
- Bearer middleware already registered in `src/start.ts` via `attachSupabaseAuth`
- Never use `supabaseAdmin` at module scope in `*.functions.ts` — load inside handler
- All money math in DB (numeric) inside SECURITY DEFINER functions → prevents race conditions
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE withdrawals, mails`
- Types regenerate from `src/integrations/supabase/types.ts` after each migration
- Deploy: တစ်ခုတည်း publish button → Cloudflare edge မှာ run

## What I need from you before starting Phase 1

1. **Currency/rules confirmation** — coins ↔ MMK 1:1 လား? withdrawal min/max limit ရှိလား? fees က fixed လား %? 
2. **Bet engine scope** — ကစားပွဲ (slot/live) logic ကို ဒီ project ထဲ ထည့်ချင်လား၊ ဒါမှမဟုတ် `bets` table က တခြား game server ကနေ ဝင်လာမယ်လား? အခုအဆင့်မှာ manual insert နဲ့ mock ထားခဲ့ရင် ဖြစ်နိုင်တယ်။
3. **Admin bootstrap** — အခု email တစ်ခုပေးရင် ကျွန်တော် seed migration နဲ့ ပထမ admin account ဖန်တီးပေးမလား၊ ဒါမှမဟုတ် သင်ကိုယ်တိုင် sign up လုပ်ပြီးမှ role promote လုပ်ချင်လား?

အဲဒါတွေဖြေပြီးရင် Phase 1 (migration + auth) ကို ချက်ချင်း စမယ်။ Approve လုပ်ရင် ဒီ 4 phases ကို တဆင့်ချင်း ship လုပ်ပါမယ်။
