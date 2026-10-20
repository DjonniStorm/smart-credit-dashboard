import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function HealthStatusPending() {
  return (
    <Card title="Состояние api">
      <StatusBadge ok label="загрузка…" />
    </Card>
  );
}
