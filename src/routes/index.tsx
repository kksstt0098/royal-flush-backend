import { createFileRoute } from "@tanstack/react-router";
import { LangProvider } from "@/lib/i18n";
import { AdminShell } from "@/components/admin/AdminShell";
import { PlayerQueryPage } from "@/components/admin/PlayerQueryPage";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <LangProvider>
      <AdminShell>
        <PlayerQueryPage />
      </AdminShell>
    </LangProvider>
  );
}