"use client";

import {
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";

import type { Application } from "@repo/contracts/application";
import { StageRail } from "@repo/ui/stage-rail";

import {
  CheckTag,
  FactGrid,
  StatusTag,
  formatDateTime,
  productLabel,
  recommendationLabel,
  riskLabel,
  sourceLabel,
  stageLabel,
  stageOrder,
} from "@/entities/application";
import { formatRub } from "@/shared/lib/money";

/** Короткая сводка выбранной заявки рядом с очередью. */
export function QueuePreview({ app }: { app: Application }) {
  return (
    <Card component="aside" aria-label={`Заявка ${app.number}`}>
      <Stack gap="md">
        <Stack gap={4}>
          <Group justify="space-between" gap="xs">
            <Text size="sm" c="dimmed">
              Заявка № {app.number} от {formatDateTime(app.createdAt)}
            </Text>
            <StatusTag status={app.status} />
          </Group>
          <Title order={3}>{app.applicant.name}</Title>
          <Text size="sm" c="dimmed">
            ИНН {app.applicant.inn}, {app.applicant.okved}
          </Text>
        </Stack>

        <FactGrid
          facts={[
            { label: "Сумма", value: formatRub(app.request.amount) },
            { label: "Срок", value: `${app.request.termMonths} мес.` },
            { label: "Продукт", value: productLabel[app.request.productId] },
            { label: "Цель", value: app.request.purpose },
          ]}
        />

        <StageRail
          stages={stageOrder.map((s) => stageLabel[s])}
          current={stageOrder.indexOf(app.stage)}
          waitingForClient={app.waitingOn === "client"}
          label="Этап заявки"
        />

        <Divider color="var(--kk-line)" />

        <Stack gap="xs">
          <Text fw={600}>Проверки</Text>
          {app.checks.map((c) => (
            <Group
              key={c.source}
              justify="space-between"
              gap="xs"
              wrap="nowrap"
            >
              <Text size="sm">{sourceLabel[c.source]}</Text>
              <CheckTag state={c.state} />
            </Group>
          ))}
        </Stack>

        {app.scoring && (
          <Group justify="space-between" gap="xs">
            <Text fw={600}>Скоринг</Text>
            <Text style={{ fontVariantNumeric: "tabular-nums" }}>
              {app.scoring.score} из 100,{" "}
              {riskLabel[app.scoring.band].toLowerCase()}
            </Text>
          </Group>
        )}
        {app.decision && app.stage === "decision" && (
          <Text size="sm">
            <Text span fw={600}>
              Рекомендация:{" "}
            </Text>
            {recommendationLabel[app.decision.recommendation].toLowerCase()}
          </Text>
        )}

        <Button component={Link} href={`/applications/${app.id}`}>
          Открыть заявку
        </Button>
      </Stack>
    </Card>
  );
}
