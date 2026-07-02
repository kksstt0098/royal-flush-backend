import { useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useSession, useRoles, isStaff } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useSession();
  const { roles, loading: rolesLoading } = useRoles(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || rolesLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: (isStaff(roles) ? "/_authenticated/admin" : "/_authenticated/player") as never });
  }, [loading, rolesLoading, user, roles, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="text-sm text-muted-foreground">Loading…</div>
        <Link to="/auth" className="text-info hover:underline text-sm">Sign in</Link>
      </div>
    </div>
  );
}