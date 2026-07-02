
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS source_user_id uuid,
  ADD COLUMN IF NOT EXISTS channel_code text,
  ADD COLUMN IF NOT EXISTS bank_type text,
  ADD COLUMN IF NOT EXISTS account_no text,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_amount numeric,
  ADD COLUMN IF NOT EXISTS notify_time timestamptz;
