import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";

function extractIp(req: Request): string | null {
  const forwarded = getRequestIP({ xForwardedFor: true });
  if (forwarded) return forwarded;
  const h = req.headers;
  const candidates = [
    h.get("cf-connecting-ip"),
    h.get("x-real-ip"),
    (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
    h.get("true-client-ip"),
    h.get("x-client-ip"),
  ];
  for (const c of candidates) if (c && c.length > 0) return c;
  return null;
}

type FailureReason =
  | "invalid_username"
  | "invalid_password"
  | "invalid_2fa"
  | "invalid_ip"
  | "account_disabled"
  | "account_locked"
  | "too_many_attempts"
  | "unknown_error";

export const recordLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      email: string;
      success: boolean;
      failure_reason?: FailureReason | null;
      session_id?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const req = getRequest();
    const ip = extractIp(req);
    const ua = req.headers.get("user-agent") ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    let role: string | null = null;
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const match = list?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === (data.email ?? "").toLowerCase(),
      );
      if (match) {
        userId = match.id;
        const { data: rr } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", match.id);
        const roles = (rr ?? []).map((r) => r.role as string);
        role =
          roles.find((r) => r === "admin") ??
          roles.find((r) => r === "auditor") ??
          roles.find((r) => r === "payer") ??
          roles[0] ??
          null;
      }
    } catch {
      /* ignore lookup errors */
    }

    const { data: row, error } = await supabaseAdmin
      .from("admin_login_logs")
      .insert({
        user_id: userId,
        username: data.email,
        admin_role: role,
        status: data.success ? "success" : "failed",
        failure_reason: data.success ? null : (data.failure_reason ?? "unknown_error"),
        ip_address: ip,
        user_agent: ua,
        session_id: data.success ? (data.session_id ?? null) : null,
      })
      .select("id")
      .single();
    if (error) return { id: null as string | null };
    return { id: row.id as string };
  });

export const recordLogout = createServerFn({ method: "POST" })
  .inputValidator((input: { log_id: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("admin_login_logs")
      .update({ logged_out_at: new Date().toISOString() })
      .eq("id", data.log_id)
      .is("logged_out_at", null);
    return { ok: true };
  });