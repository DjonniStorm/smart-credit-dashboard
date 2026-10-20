"use client";

import { companiesControllerCheckOptions, withStableQueryKey } from "@repo/sdk";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";
import { useQuery } from "@tanstack/react-query";
import { browserClient } from "../lib/api.browser";

export function CompanyCheckResult({ inn }: { inn: string }) {
  const { data, error, isPending } = useQuery(
    withStableQueryKey(
      companiesControllerCheckOptions({
        client: browserClient,
        path: { inn },
      }),
    ),
  );

  if (isPending) {
    return (
      <Card title="Результат">
        <StatusBadge ok label="загрузка…" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card title="Ошибка">
        <StatusBadge
          ok={false}
          label={error instanceof Error ? error.message : "нет данных"}
        />
      </Card>
    );
  }

  return (
    <Card title={`Результат для ИНН ${data.inn}`}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </Card>
  );
}
