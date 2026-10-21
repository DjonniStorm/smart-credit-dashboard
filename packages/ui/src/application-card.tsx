import { Card, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { type JSX, type ReactNode } from "react";

import type { ApplicationStatus } from "@repo/contracts";

import { ApplicationStatusBadge } from "./application-status";
import { formatRub } from "./money";
import { StageRail } from "./stage-rail";

/**
 * Карточка заявки в кабинете. Порядок всегда один: продукт и статус,
 * параметры, путь заявки, следующий шаг. Последняя строка говорит, что делать.
 */
export function ApplicationCard({
  product,
  number,
  createdAt,
  amount,
  termMonths,
  purpose,
  status,
  stages,
  current,
  nextStep,
  action,
}: {
  product: string;
  number: string;
  createdAt: string;
  amount: number;
  termMonths: number;
  purpose: string;
  status: ApplicationStatus;
  stages: readonly string[];
  current: number;
  nextStep: ReactNode;
  action?: ReactNode;
}): JSX.Element {
  const facts = [
    { label: "Сумма", value: formatRub(amount) },
    { label: "Срок", value: `${termMonths} мес.` },
    { label: "Цель", value: purpose },
  ];

  return (
    <Card component="article">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Title order={3}>{product}</Title>
          <Text size="sm" c="dimmed">
            Заявка № {number} от {createdAt}
          </Text>
        </Stack>
        <ApplicationStatusBadge status={status} />
      </Group>

      <Group component="dl" gap="lg" my="lg" wrap="wrap">
        {facts.map((f) => (
          <Stack key={f.label} gap={0}>
            <Text component="dt" size="sm" c="dimmed">
              {f.label}
            </Text>
            <Text
              component="dd"
              m={0}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {f.value}
            </Text>
          </Stack>
        ))}
      </Group>

      <StageRail
        stages={stages}
        current={current}
        waitingForClient={status === "needs_client"}
      />

      <Divider my="md" color="var(--kk-line)" />

      <Group justify="space-between" align="center" gap="sm" wrap="wrap">
        <Text maw={380}>{nextStep}</Text>
        {action}
      </Group>
    </Card>
  );
}
