import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function claimSessionId(claims: any): string | null {
  const sid = claims?.session_id ?? claims?.sid;
  return typeof sid === "string" ? sid : null;
}

// Called immediately after MFA verify. Marks this JWT's session_id as the
// only active session for the admin, then revokes every other refresh token
// server-side so previous browsers/devices lose access.
export const claimActiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sid = claimSessionId(context.claims);
    if (!sid) throw new Error("Missing session id in token");

    const { error } = await context.supabase.rpc("claim_admin_session", {
      _session_id: sid,
    });
    if (error) throw new Error(error.message);

    // Revoke all *other* refresh tokens for this user. Existing access tokens
    // in other tabs will still validate until expiry, but pingActiveSession
    // below rejects them in the meantime.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin.auth.admin as any).signOut(context.userId, "others");
    } catch {
      /* non-fatal: DB session_id is the source of truth */
    }
    return { ok: true, session_id: sid };
  });

// Lightweight liveness probe. Client polls this; if `active` is false the
// session was superseded (or admin was frozen/deleted) — sign out locally.
export const pingActiveSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sid = claimSessionId(context.claims);
    if (!sid) return { active: false as const };
    const { data, error } = await context.supabase.rpc("is_active_admin_session", {
      _session_id: sid,
    });
    if (error) return { active: false as const };
    return { active: Boolean(data) as boolean };
  });