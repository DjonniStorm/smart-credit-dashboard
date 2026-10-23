"use client";

import { Alert, Stack, Text } from "@mantine/core";

import type { Application, CreditProduct, Employee } from "@repo/contracts/application";

export function ActionBar({
  app,
  employee,
  products,
}: {
  app: Application;
  employee: Employee;
  products: CreditProduct[];
}) {
  void employee;
  void products;

  return (
    <Stack gap="xs">
      <Alert title="API-контур подключён" color="blue" variant="light">
        <Text size="sm">
          Заявка доступна для чтения и проверки scoring. Действия менеджера
          подключим следующим API-этапом.
        </Text>
      </Alert>
      <Text size="xs" c="dimmed">
        Номер заявки: {app.number}
      </Text>
    </Stack>
  );
}
