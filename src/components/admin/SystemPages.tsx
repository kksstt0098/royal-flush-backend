import { useT, type dict } from "@/lib/i18n";

function Placeholder({ titleKey, desc }: { titleKey: keyof typeof dict; desc: string }) {
  const { t } = useT();
  return (
    <div className="p-6">
      <div className="bg-panel border border-panel-border rounded-md p-8">
        <h1 className="text-lg font-semibold">{t(titleKey)}</h1>
        <p className="text-sm text-muted-foreground mt-2">{desc}</p>
        <p className="text-xs text-muted-foreground mt-4">
          Section placeholder — features will be added here.
        </p>
      </div>
    </div>
  );
}

export const RoleMgmtPage = () => (
  <Placeholder titleKey="roleMgmt" desc="Manage admin roles and their scope." />
);
export const PermissionMgmtPage = () => (
  <Placeholder titleKey="permissionMgmt" desc="Configure granular permissions per role." />
);
export const AdminLogsPage = () => (
  <Placeholder titleKey="adminLogs" desc="Audit trail of admin actions." />
);