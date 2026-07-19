import { supabase } from "@/integrations/supabase/client";
import { recordLogout } from "@/lib/login-log.functions";

export async function signOutAndLog() {
  const id = localStorage.getItem("admin_login_log_id");
  if (id) {
    try {
      await recordLogout({ data: { log_id: id } });
    } catch {
      /* ignore */
    }
    localStorage.removeItem("admin_login_log_id");
  }
  await supabase.auth.signOut();
}