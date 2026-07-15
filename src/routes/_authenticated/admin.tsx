import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LangProvider } from "@/lib/i18n";
import { AdminShell, type PageKey } from "@/components/admin/AdminShell";
import { PlayerQueryPage } from "@/components/admin/PlayerQueryPage";
import { WithdrawalOrderPage } from "@/components/admin/WithdrawalOrderPage";
import { ReviewWithdrawalPage } from "@/components/admin/ReviewWithdrawalPage";
import { WithdrawalPaymentPage } from "@/components/admin/WithdrawalPaymentPage";
import { OnlineRechargePage } from "@/components/admin/OnlineRechargePage";
import { OfflineRechargePage } from "@/components/admin/OfflineRechargePage";
import { QuickRechargePage } from "@/components/admin/QuickRechargePage";
import { LobbyBannerPage } from "@/components/admin/LobbyBannerPage";
import { PromoBannerPage } from "@/components/admin/PromoBannerPage";
import { AdsCategoryPage } from "@/components/admin/AdsCategoryPage";
import { PromotionsPage } from "@/components/admin/PromotionsPage";
import { MailBoxPage } from "@/components/admin/MailBoxPage";
import { MarqueePage } from "@/components/admin/MarqueePage";
import { CSConfigurePage } from "@/components/admin/CSConfigurePage";
import { VipConfigPage } from "@/components/admin/VipConfigPage";
import { LevelConfigPage } from "@/components/admin/LevelConfigPage";
import { useSession, useRoles, isStaff } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const { roles, loading, refetch } = useRoles(user?.id);
  const navigate = useNavigate();

  const [active, setActive] = useState<PageKey>("playerQuery");
  const [tabs, setTabs] = useState<PageKey[]>(["playerQuery"]);
  const navigateTo = (p: PageKey) => {
    setActive(p);
    setTabs((ts) => (ts.includes(p) ? ts : [...ts, p]));
  };
  const closeTab = (p: PageKey) => {
    setTabs((ts) => {
      const next = ts.filter((t) => t !== p);
      if (next.length === 0) return ts;
      if (p === active) setActive(next[next.length - 1]);
      return next;
    });
  };

  const claim = async () => {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) {
      alert(error.message);
      return;
    }
    if (data) {
      alert("You are now admin. Reloading roles…");
      refetch();
    } else {
      alert("An admin already exists. Ask an admin to grant you the role.");
    }
  };

  if (loading) return <div className="p-6 text-sm">Loading…</div>;

  if (!isStaff(roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-panel border border-panel-border rounded-md p-6 space-y-3 text-center">
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            Your account has no admin, auditor, or payer role.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={claim}
              className="h-9 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90"
            >
              Claim first admin (only if none exists yet)
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="h-9 rounded-sm border border-input bg-background text-sm hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LangProvider>
      <AdminShell
        activePage={active}
        onNavigate={navigateTo}
        openTabs={tabs}
        onCloseTab={closeTab}
      >
        {active === "playerQuery" ? (
          <PlayerQueryPage />
        ) : active === "withdrawalOrder" ? (
          <WithdrawalOrderPage />
        ) : active === "reviewWithdrawal" ? (
          <ReviewWithdrawalPage />
        ) : active === "onlineRecharge" ? (
          <OnlineRechargePage />
        ) : active === "offlineRecharge" ? (
          <OfflineRechargePage />
        ) : active === "quickRecharge" ? (
          <QuickRechargePage />
        ) : active === "lobbyBanner" ? (
          <LobbyBannerPage />
        ) : active === "promoBanner" ? (
          <PromoBannerPage />
        ) : active === "adsCategory" ? (
          <AdsCategoryPage />
        ) : active === "promotions" ? (
          <PromotionsPage />
        ) : active === "mailBox" ? (
          <MailBoxPage />
        ) : active === "marquee" ? (
          <MarqueePage />
        ) : active === "csConfigure" ? (
          <CSConfigurePage />
        ) : active === "vipConfig" ? (
          <VipConfigPage />
        ) : active === "levelConfig" ? (
          <LevelConfigPage />
        ) : (
          <WithdrawalPaymentPage />
        )}
      </AdminShell>
    </LangProvider>
  );
}