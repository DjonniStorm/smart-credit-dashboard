"use client";

import { healthControllerCheckOptions, withStableQueryKey } from "@repo/sdk";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";
import { useQuery } from "@tanstack/react-query";
import { browserClient } from "../lib/api.browser";

export function HealthStatus() {
  const { data, error, isPending } = useQuery(
    withStableQueryKey(
      healthControllerCheckOptions({
        client: browserClient,
      }),
    ),
  );

  return (
    <Card title="Состояние api">
      {isPending ? (
        <StatusBadge ok label="загрузка…" />
      ) : error || !data ? (
        <StatusBadge ok={false} label="api недоступен" />
      ) : (
        <ul>
          <li>
            <StatusBadge ok={data.status === "ok"} label="api" />
          </li>
          {Object.entries(data.checks ?? {}).map(([name, state]) => (
            <li key={name}>
              <StatusBadge ok={state === "up"} label={name} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
