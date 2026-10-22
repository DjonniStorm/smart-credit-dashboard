import { Alert, Badge, Group, Text } from "@mantine/core";
import { IconClock, IconInfoCircle } from "@tabler/icons-react";

import type { Application } from "@repo/contracts/cabinet";

import { needsClient } from "../model/stage";

function state(app: Application) {
  if (app.status === "rejected" || app.status === "disbursed") {
    return {
      label: "Заявка завершена",
      color: "gray",
      text: "Срочный режим больше не применяется.",
    };
  }
  if (needsClient(app)) {
    return {
      label: "Требует действия",
      color: "orange",
      text: "Ответьте банку, чтобы не задерживать рассмотрение.",
    };
  }
  if (app.status === "in_review") {
    return {
      label: "На проверке",
      color: "blue",
      text: "Заявка обрабатывается банком и внешними источниками.",
    };
  }
  return {
    label: "Стандартный приоритет",
    color: "gray",
    text: "Можно следить за статусом без дополнительных действий.",
  };
}

/** Безопасный демо-индикатор: не меняет очередь банка и не отменяет проверки. */
export function UrgencyIndicator({
  app,
  compact = false,
}: {
  app: Application;
  compact?: boolean;
}) {
  const current = state(app);
  if (compact) {
    return (
      <Badge
        color={current.color}
        variant="light"
        leftSection={<IconClock size={13} />}
        title={`${current.text} Обязательные проверки не отменяются.`}
      >
        {current.label}
      </Badge>
    );
  }

  return (
    <Alert
      color={current.color}
      variant="light"
      icon={<IconInfoCircle size={20} />}
      title={`Индикатор приоритета: ${current.label}`}
    >
      <Group gap="xs" align="flex-start">
        <Text size="sm">{current.text}</Text>
        <Text size="sm" c="dimmed">
          Это демо-индикатор: обязательные проверки банка не отменяются, срок и
          решение не гарантируются.
        </Text>
      </Group>
    </Alert>
  );
}
