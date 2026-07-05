import { createFileRoute } from '@tanstack/react-router';

// Public queue drainer for the in-game mailbox.
// Callers (pg_cron via net.http_post) must present `apikey: <SUPABASE anon key>`.

export const Route = createFileRoute('/api/public/hooks/mail-worker')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get('apikey');
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          '';
        if (!apikey || !expected || apikey !== expected) {
          return new Response('unauthorized', { status: 401 });
        }

        const { supabaseAdmin } = await import(
          '@/integrations/supabase/client.server'
        );
        const admin = supabaseAdmin as unknown as {
          rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
        };

        const drained: Array<{ campaign_id: string; delivered: number }> = [];
        const errors: Array<{ msg_id?: number; error: string }> = [];
        let deferred = 0;

        for (let round = 0; round < 5; round++) {
          const { data: msgs, error: readErr } = await admin.rpc(
            'mail_worker_read_batch',
            { _qty: 10, _vt: 60 }
          );
          if (readErr) {
            errors.push({ error: readErr.message });
            break;
          }
          const batch = (msgs ?? []) as Array<{ msg_id: number; message: any }>;
          if (batch.length === 0) break;

          for (const m of batch) {
            const campaignId: string | undefined = m.message?.campaign_id;
            if (!campaignId) {
              await admin.rpc('mail_worker_delete', { _msg_id: m.msg_id });
              continue;
            }
            const { data: n, error: dErr } = await admin.rpc(
              'mail_worker_dispatch',
              { _campaign_id: campaignId }
            );
            if (dErr) {
              errors.push({ msg_id: m.msg_id, error: dErr.message });
              continue; // leave for retry (visibility timeout)
            }
            if (typeof n === 'number' && n === -1) {
              // send_time in future — leave message; visibility timeout will bring it back
              deferred++;
              continue;
            }
            await admin.rpc('mail_worker_delete', { _msg_id: m.msg_id });
            drained.push({ campaign_id: campaignId, delivered: (n as number) ?? 0 });
          }
        }

        // Expire due campaigns each tick
        await admin.rpc('mail_expire_due');

        return new Response(
          JSON.stringify({ drained, deferred, errors, at: new Date().toISOString() }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
  },
});