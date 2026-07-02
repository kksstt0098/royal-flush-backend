import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "auditor" | "payer" | "player";

export function useSession(): { user: User | null; session: Session | null; loading: boolean } {
  const [state, setState] = useState<{ user: User | null; session: Session | null; loading: boolean }>({
    user: null,
    session: null,
    loading: true,
  });
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });
    supabase.auth.getSession().then(({ data }) =>
      setState({ user: data.session?.user ?? null, session: data.session, loading: false }),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

export function useRoles(userId: string | undefined): { roles: AppRole[]; loading: boolean; refetch: () => void } {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
  }, [userId, nonce]);
  return { roles, loading, refetch: () => setNonce((n) => n + 1) };
}

export function isStaff(roles: AppRole[]) {
  return roles.some((r) => r === "admin" || r === "auditor" || r === "payer");
}