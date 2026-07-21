import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { pingActiveSession } from "@/lib/session.functions";
import { signOutAndLog } from "@/lib/logout";

/**
 * Enforces single-active-session for admins on the client.
 * Polls the backend every 15s (and on tab focus). If the server reports the
 * session is no longer the active one — either because the same admin logged
 * in elsewhere, or the account was frozen/disabled — we sign out locally and
 * bounce to /auth with a `kicked=1` flag.
 */
export function useSessionGuard() {
  const navigate = useNavigate();
  const bouncedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const kickOut = async () => {
      if (bouncedRef.current) return;
      bouncedRef.current = true;
      try {
        await signOutAndLog();
      } catch {
        /* ignore */
      }
      navigate({ to: "/auth", search: { kicked: "1" } as any });
    };

    const check = async () => {
      try {
        const r = await pingActiveSession();
        if (!cancelled && !r.active) await kickOut();
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        // Any 401/Unauthorized from a protected call means the server has
        // rejected this session — treat it as a kick.
        if (/unauthor/i.test(msg) || /401/.test(msg)) {
          if (!cancelled) await kickOut();
        }
      }
    };

    check();
    const iv = window.setInterval(check, 15_000);
    const onFocus = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [navigate]);
}