import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function CompanyCheckUnavailable() {
  return (
    <Card title="Ошибка">
      <StatusBadge ok={false} label="проверка недоступна" />
    </Card>
  );
}
