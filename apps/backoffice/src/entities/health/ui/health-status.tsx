import { Message, i18n, t } from "@repo/i18n";
import type { HealthDto } from "@repo/sdk";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";

export function HealthStatus({ health }: { health: HealthDto }) {
  return (
    <Card title={t(i18n.defaultLocale, Message.HealthTitle)}>
      <ul>
        <li>
          <StatusBadge ok={health.status === "ok"} label="api" />
        </li>
        {Object.entries(health.checks ?? {}).map(([name, state]) => (
          <li key={name}>
            <StatusBadge ok={state === "up"} label={name} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
