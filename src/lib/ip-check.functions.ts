import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

function extractIp(req: Request): string | null {
  const h = req.headers;
  const candidates = [
    h.get("cf-connecting-ip"),
    h.get("x-real-ip"),
    (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
    h.get("true-client-ip"),
    h.get("x-client-ip"),
  ];
  for (const c of candidates) {
    if (c && c.length > 0) return c;
  }
  return null;
}

export const checkClientIp = createServerFn({ method: "POST" })
  .inputValidator((input: { email?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const req = getRequest();
    const ip = extractIp(req);
    const ua = req.headers.get("user-agent") ?? null;

    if (!ip) {
      return { ip: null, allowed: false, reason: "no_ip" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error } = await supabaseAdmin.rpc("is_ip_allowed", { _ip: ip });
    if (error) {
      return { ip, allowed: false, reason: "rpc_error" as const };
    }

    // Best-effort audit log — never fail the check on log errors.
    try {
      await supabaseAdmin.rpc("log_ip_attempt", {
        _ip: ip,
        _email: data.email ?? "",
        _allowed: !!allowed,
        _ua: ua ?? "",
      });
    } catch {
      /* ignore */
    }

    return { ip, allowed: !!allowed, reason: null as null };
  });