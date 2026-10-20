import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function HealthStatusUnavailable() {
  return (
    <Card title="Состояние api">
      <StatusBadge ok={false} label="api недоступен" />
    </Card>
  );
}
