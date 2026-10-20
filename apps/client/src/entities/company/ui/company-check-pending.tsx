import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function CompanyCheckPending() {
  return (
    <Card title="Результат">
      <StatusBadge ok label="загрузка…" />
    </Card>
  );
}
