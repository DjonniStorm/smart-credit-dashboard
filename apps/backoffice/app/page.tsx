import type { HealthResponse } from "@repo/contracts";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";
import { apiGet } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await apiGet<HealthResponse>("/health").catch(() => null);

  return (
    <main>
      <h1>АРМ сотрудника банка</h1>
      <p>Каркас. Здесь будет очередь заявок и карточка решения.</p>

      <Card title="Состояние api">
        {health ? (
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
        ) : (
          <StatusBadge ok={false} label="api недоступен" />
        )}
      </Card>
    </main>
  );
}
