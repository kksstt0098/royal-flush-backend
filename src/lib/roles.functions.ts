import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALL_PERMISSION_KEYS, type AccessLevel } from "@/lib/permissions-catalog";

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

// ---------- List roles with counts ----------
export const listCustomRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("custom_roles")
      .select("*")
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: true });
    const { data: perms } = await supabaseAdmin
      .from("role_permissions")
      .select("role_id, access");
    const { data: assigns } = await supabaseAdmin
      .from("user_role_assignments")
      .select("role_id");
    const permCount = new Map<string, number>();
    for (const p of perms ?? []) {
      if (p.access !== "none") permCount.set(p.role_id, (permCount.get(p.role_id) ?? 0) + 1);
    }
    const userCount = new Map<string, number>();
    for (const a of assigns ?? []) userCount.set(a.role_id, (userCount.get(a.role_id) ?? 0) + 1);
    return (roles ?? []).map((r) => ({
      ...r,
      permission_count: permCount.get(r.id) ?? 0,
      user_count: userCount.get(r.id) ?? 0,
    }));
  });

// ---------- Create role ----------
export const createCustomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; name: string; description?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const code = data.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!code) throw new Error("Code required");
    if (!data.name.trim()) throw new Error("Name required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    const { data: row, error } = await supabaseAdmin
      .from("custom_roles")
      .insert({
        code,
        name: data.name.trim(),
        description: data.description ?? "",
        is_system: false,
        created_by: actor,
        created_by_name: actorNm,
        updated_by: actor,
        updated_by_name: actorNm,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Seed all permissions as 'none'
    const rows = ALL_PERMISSION_KEYS.map((k) => ({
      role_id: row.id,
      permission_key: k,
      access: "none" as AccessLevel,
      updated_by: actor,
      updated_by_name: actorNm,
    }));
    await supabaseAdmin.from("role_permissions").insert(rows);
    return { id: row.id };
  });

// ---------- Update role meta ----------
export const updateCustomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name?: string; description?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    const patch: Record<string, unknown> = { updated_by: actor, updated_by_name: actorNm };
    if (typeof data.name === "string") patch.name = data.name.trim();
    if (typeof data.description === "string") patch.description = data.description;
    const { error } = await supabaseAdmin.from("custom_roles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Delete role ----------
export const deleteCustomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("custom_roles")
      .select("is_system")
      .eq("id", data.id)
      .maybeSingle();
    if (!role) throw new Error("Role not found");
    if (role.is_system) throw new Error("System role cannot be deleted");
    const { error } = await supabaseAdmin.from("custom_roles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Get permissions for a role ----------
export const getRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role_id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("role_permissions")
      .select("permission_key, access, updated_by_name, updated_at")
      .eq("role_id", data.role_id);
    const map: Record<string, AccessLevel> = {};
    for (const k of ALL_PERMISSION_KEYS) map[k] = "none";
    const meta: Record<string, { updated_by_name: string | null; updated_at: string | null }> = {};
    for (const r of rows ?? []) {
      map[r.permission_key] = r.access as AccessLevel;
      meta[r.permission_key] = { updated_by_name: r.updated_by_name, updated_at: r.updated_at };
    }
    return { access: map, meta };
  });

// ---------- Save permissions for a role (bulk upsert) ----------
export const saveRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { role_id: string; changes: { permission_key: string; access: AccessLevel }[] }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.changes.length) return { ok: true, updated: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    const rows = data.changes.map((c) => ({
      role_id: data.role_id,
      permission_key: c.permission_key,
      access: c.access,
      updated_by: actor,
      updated_by_name: actorNm,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin
      .from("role_permissions")
      .upsert(rows, { onConflict: "role_id,permission_key" });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("custom_roles")
      .update({ updated_by: actor, updated_by_name: actorNm })
      .eq("id", data.role_id);
    return { ok: true, updated: rows.length };
  });

// ---------- List admin users (for assignment) with their roles ----------
export const listAssignableUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get all staff (admin/auditor/payer)
    const { data: rolesRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "auditor", "payer"] as any);
    const staffIds = Array.from(new Set((rolesRows ?? []).map((r) => r.user_id)));

    const { data: metas } = await supabaseAdmin
      .from("admin_meta")
      .select("id, full_name")
      .is("deleted_at", null);
    const metaMap = new Map((metas ?? []).map((m) => [m.id, m]));

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

    const { data: assigns } = await supabaseAdmin
      .from("user_role_assignments")
      .select("user_id, role_id");
    const assignMap = new Map<string, string[]>();
    for (const a of assigns ?? []) {
      const arr = assignMap.get(a.user_id) ?? [];
      arr.push(a.role_id);
      assignMap.set(a.user_id, arr);
    }

    return staffIds
      .map((id) => {
        const u = authMap.get(id);
        const m = metaMap.get(id) as any;
        return {
          id,
          username: u?.email ? u.email.split("@")[0] : "(unknown)",
          email: u?.email ?? "",
          full_name: m?.full_name ?? "",
          role_ids: assignMap.get(id) ?? [],
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  });

// ---------- Set role assignments for a single user ----------
export const setUserRoleAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; role_ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = context.userId;
    const actorNm = await actorName(context);
    await supabaseAdmin.from("user_role_assignments").delete().eq("user_id", data.user_id);
    if (data.role_ids.length) {
      const rows = data.role_ids.map((rid) => ({
        user_id: data.user_id,
        role_id: rid,
        assigned_by: actor,
        assigned_by_name: actorNm,
      }));
      const { error } = await supabaseAdmin.from("user_role_assignments").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });