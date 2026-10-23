import { Message, i18n, t } from "@repo/i18n";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function HealthStatusUnavailable() {
  return (
    <Card title={t(i18n.defaultLocale, Message.HealthTitle)}>
      <StatusBadge
        ok={false}
        label={t(i18n.defaultLocale, Message.HealthUnavailable)}
      />
    </Card>
  );
}
