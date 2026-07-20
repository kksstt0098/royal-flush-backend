import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const BAN_LONG = "876000h"; // ~100y
const BAN_NONE = "none";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Auth check failed");
  if (!data) throw new Error("Forbidden: admin role required");
}

async function actorName(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("staff_display_name", { _uid: ctx.userId });
  return (data as string) || "admin";
}

async function log(
  admin: any,
  actor: string,
  actorNameStr: string,
  action: string,
  target_id: string | null,
  target_name: string | null,
  meta: Record<string, unknown> = {},
) {
  await admin.from("admin_activity_logs").insert({
    actor,
    actor_name: actorNameStr,
    action,
    target_id,
    target_name,
    meta,
  });
}

async function superAdminId(admin: any): Promise<string | null> {
  const { data } = await admin
    .from("admin_meta")
    .select("id")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

// ---------------- List / stats ----------------

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      search?: string;
      role?: "all" | "admin" | "auditor" | "payer";
      status?: "all" | "online" | "offline" | "frozen" | "disabled";
      from?: string | null;
      to?: string | null;
      page?: number;
      pageSize?: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Roles for staff users
    const { data: rolesRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "auditor", "payer"] as any);
    const roleMap = new Map<string, string[]>();
    for (const r of rolesRows ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as string);
      roleMap.set(r.user_id, arr);
    }
    const staffIds = Array.from(roleMap.keys());

    // Meta rows
    const { data: metas } = await supabaseAdmin
      .from("admin_meta")
      .select("*")
      .is("deleted_at", null);
    const metaMap = new Map<string, any>();
    for (const m of metas ?? []) metaMap.set(m.id, m);

    // Auth users (paged)
    const authUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data: p } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      const users = p?.users ?? [];
      authUsers.push(...users);
      if (users.length < 200) break;
      page++;
      if (page > 20) break;
    }
    const authMap = new Map(authUsers.map((u) => [u.id, u]));

    // Active sessions (online)
    const { data: activeLogs } = await supabaseAdmin
      .from("admin_login_logs")
      .select("user_id, logged_in_at")
      .eq("status", "success")
      .is("logged_out_at", null)
      .gte("logged_in_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    const online = new Set((activeLogs ?? []).map((r) => r.user_id).filter(Boolean));

    // Last login per user
    const { data: lastLogins } = await supabaseAdmin
      .from("admin_login_logs")
      .select("user_id, logged_in_at")
      .eq("status", "success")
      .order("logged_in_at", { ascending: false })
      .limit(500);
    const lastLoginMap = new Map<string, string>();
    for (const l of lastLogins ?? []) {
      if (l.user_id && !lastLoginMap.has(l.user_id)) lastLoginMap.set(l.user_id, l.logged_in_at);
    }

    const superId = await superAdminId(supabaseAdmin);

    let rows = staffIds.map((id) => {
      const u = authMap.get(id);
      const m = metaMap.get(id) ?? {};
      const roles = roleMap.get(id) ?? [];
      const primaryRole =
        roles.find((r) => r === "admin") ??
        roles.find((r) => r === "auditor") ??
        roles.find((r) => r === "payer") ??
        roles[0] ??
        null;
      const stored = (m.status as string) ?? "offline";
      const effective =
        stored === "disabled" || stored === "frozen"
          ? stored
          : online.has(id)
            ? "online"
            : "offline";
      return {
        id,
        username: u?.email ? u.email.split("@")[0] : "(unknown)",
        email: u?.email ?? "",
        full_name: (m.full_name as string) ?? "",
        role: primaryRole,
        status: effective,
        stored_status: stored,
        freeze_reason: m.freeze_reason ?? null,
        disable_reason: m.disable_reason ?? null,
        last_login: lastLoginMap.get(id) ?? null,
        created_by_name: m.created_by_name ?? "system",
        updated_by_name: m.updated_by_name ?? "system",
        created_at: m.created_at ?? u?.created_at ?? null,
        updated_at: m.updated_at ?? null,
        is_super: id === superId,
      };
    });

    // Filters
    const q = (data.search ?? "").trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.username.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q));
    if (data.role && data.role !== "all") rows = rows.filter((r) => r.role === data.role);
    if (data.status && data.status !== "all") rows = rows.filter((r) => r.status === data.status);
    if (data.from) rows = rows.filter((r) => (r.created_at ?? "") >= data.from!);
    if (data.to) rows = rows.filter((r) => (r.created_at ?? "") <= data.to!);

    rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

    const total = rows.length;
    const stats = {
      total,
      online: rows.filter((r) => r.status === "online").length,
      offline: rows.filter((r) => r.status === "offline").length,
      frozen: rows.filter((r) => r.status === "frozen").length,
      disabled: rows.filter((r) => r.status === "disabled").length,
    };

    const pageSize = Math.max(1, Math.min(500, data.pageSize ?? 20));
    const pageNum = Math.max(1, data.page ?? 1);
    const start = (pageNum - 1) * pageSize;
    return { rows: rows.slice(start, start + pageSize), total, stats };
  });

// ---------------- Create ----------------

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      full_name: string;
      role: "admin" | "auditor" | "payer";
      password: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.email.includes("@")) throw new Error("Valid email required");
    if (!STRONG_PW.test(data.password))
      throw new Error("Password must be 12+ chars with upper, lower, number, and symbol");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.email.split("@")[0] },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Create failed");
    const uid = created.user.id;

    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    await supabaseAdmin
      .from("admin_meta")
      .upsert({
        id: uid,
        full_name: data.full_name,
        status: "offline",
        created_by: actor,
        created_by_name: actorNm,
        updated_by: actor,
        updated_by_name: actorNm,
      });
    await log(supabaseAdmin, actor, actorNm, "admin_created", uid, data.email, { role: data.role });
    return { id: uid };
  });

// ---------------- Update ----------------

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      full_name?: string;
      role?: "admin" | "auditor" | "payer";
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    const superId = await superAdminId(supabaseAdmin);
    if (data.id === superId && actor !== superId)
      throw new Error("Only the super admin can edit the super admin");

    if (typeof data.full_name === "string") {
      await supabaseAdmin
        .from("admin_meta")
        .update({ full_name: data.full_name, updated_by: actor, updated_by_name: actorNm })
        .eq("id", data.id);
    }
    if (data.role) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .in("role", ["admin", "auditor", "payer"] as any);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    }
    await log(supabaseAdmin, actor, actorNm, "admin_updated", data.id, null, {
      full_name: data.full_name,
      role: data.role,
    });
    return { ok: true };
  });

// ---------------- Reset Password ----------------

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; new_password: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!STRONG_PW.test(data.new_password))
      throw new Error("Password must be 12+ chars with upper, lower, number, and symbol");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.signOut(data.id, "global");
    await log(supabaseAdmin, actor, actorNm, "password_reset", data.id, null, {});
    return { ok: true };
  });

// ---------------- Kick ----------------

export const kickAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    const { error } = await supabaseAdmin.auth.admin.signOut(data.id, "global");
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("admin_login_logs")
      .update({ logged_out_at: new Date().toISOString() })
      .eq("user_id", data.id)
      .is("logged_out_at", null);
    await log(supabaseAdmin, actor, actorNm, "kick_online", data.id, null, {});
    return { ok: true };
  });

// ---------------- Freeze / Unfreeze / Disable / Enable ----------------

async function guardSuper(admin: any, id: string) {
  const s = await superAdminId(admin);
  if (id === s) throw new Error("Super admin cannot be modified this way");
}

export const setAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      action: "freeze" | "unfreeze" | "disable" | "enable";
      reason?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);

    if (data.action === "freeze" || data.action === "disable") {
      await guardSuper(supabaseAdmin, data.id);
      if (!data.reason || !data.reason.trim()) throw new Error("Reason required");
    }

    let banDuration = BAN_NONE;
    let newStatus: "offline" | "frozen" | "disabled" = "offline";
    const patch: Record<string, unknown> = {
      updated_by: actor,
      updated_by_name: actorNm,
    };

    if (data.action === "freeze") {
      banDuration = BAN_LONG;
      newStatus = "frozen";
      patch.freeze_reason = data.reason;
    } else if (data.action === "unfreeze") {
      newStatus = "offline";
      patch.freeze_reason = null;
    } else if (data.action === "disable") {
      banDuration = BAN_LONG;
      newStatus = "disabled";
      patch.disable_reason = data.reason;
    } else if (data.action === "enable") {
      newStatus = "offline";
      patch.disable_reason = null;
    }
    patch.status = newStatus;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: banDuration,
    } as any);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_meta").update(patch as any).eq("id", data.id);
    if (newStatus !== "offline" || data.action === "unfreeze" || data.action === "enable") {
      // kick sessions on any state transition to be safe
      await supabaseAdmin.auth.admin.signOut(data.id, "global");
      await supabaseAdmin
        .from("admin_login_logs")
        .update({ logged_out_at: new Date().toISOString() })
        .eq("user_id", data.id)
        .is("logged_out_at", null);
    }
    await log(supabaseAdmin, actor, actorNm, `admin_${data.action}`, data.id, null, {
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

// ---------------- Soft delete ----------------

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; reason: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    await guardSuper(supabaseAdmin, data.id);
    if (data.id === actor) throw new Error("You cannot delete yourself");
    if (!data.reason?.trim()) throw new Error("Reason required");

    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.id)
      .in("role", ["admin", "auditor", "payer"] as any);
    await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: BAN_LONG } as any);
    await supabaseAdmin.auth.admin.signOut(data.id, "global");
    await supabaseAdmin
      .from("admin_meta")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: actor,
        deleted_by_name: actorNm,
        deleted_reason: data.reason,
        status: "disabled",
      })
      .eq("id", data.id);
    await log(supabaseAdmin, actor, actorNm, "admin_deleted", data.id, null, { reason: data.reason });
    return { ok: true };
  });

// ---------------- Activity logs ----------------

export const listAdminActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { target_id?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, data.limit ?? 50));
    if (data.target_id) q = q.eq("target_id", data.target_id);
    const { data: rows } = await q;
    return rows ?? [];
  });
