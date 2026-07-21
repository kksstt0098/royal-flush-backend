import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { checkClientIp } from "@/lib/ip-check.functions";
import { signOutAndLog } from "@/lib/logout";
import { useSessionGuard } from "@/hooks/use-session-guard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") throw redirect({ to: "/auth" });
    const ipCheck = await checkClientIp({ data: { email: data.user.email ?? "" } });
    if (!ipCheck.allowed) {
      await signOutAndLog();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  useSessionGuard();
  return <Outlet />;
}