import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LangProvider } from "@/lib/i18n";
import { AdminShell, type PageKey } from "@/components/admin/AdminShell";
import { PlayerQueryPage } from "@/components/admin/PlayerQueryPage";
import { WithdrawalOrderPage } from "@/components/admin/WithdrawalOrderPage";
import { ReviewWithdrawalPage } from "@/components/admin/ReviewWithdrawalPage";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [active, setActive] = useState<PageKey>("playerQuery");
  const [tabs, setTabs] = useState<PageKey[]>(["playerQuery"]);

  const navigate = (p: PageKey) => {
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

  return (
    <LangProvider>
      <AdminShell
        activePage={active}
        onNavigate={navigate}
        openTabs={tabs}
        onCloseTab={closeTab}
      >
        {active === "playerQuery" ? (
          <PlayerQueryPage />
        ) : active === "withdrawalOrder" ? (
          <WithdrawalOrderPage />
        ) : (
          <ReviewWithdrawalPage />
        )}
      </AdminShell>
    </LangProvider>
  );
}