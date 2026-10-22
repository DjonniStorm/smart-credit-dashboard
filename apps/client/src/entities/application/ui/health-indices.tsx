import {
  Badge,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { Application } from "@repo/contracts/cabinet";

import { stageOf, stages } from "../model/stage";

type IndexTone = "success" | "action" | "warning" | "danger";

const toneColor: Record<IndexTone, string> = {
  success: "green",
  action: "blue",
  warning: "orange",
  danger: "red",
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function financialHealth(app: Application) {
  const { avgMonthlyTurnover, monthlyDebtPayments, revenueLastYear } =
    app.financials;
  if (avgMonthlyTurnover <= 0 || revenueLastYear <= 0) return 0;

  const debtLoad = monthlyDebtPayments / avgMonthlyTurnover;
  const turnoverConsistency = (avgMonthlyTurnover * 12) / revenueLastYear;
  return clamp(100 - debtLoad * 100 - Math.abs(1 - turnoverConsistency) * 35);
}

function isTerminal(app: Application) {
  return app.status === "rejected" || app.status === "disbursed";
}

function readiness(app: Application) {
  if (isTerminal(app)) return null;
  const { current } = stageOf(app);
  return clamp(((current + 1) / stages.length) * 100);
}

function confidence(app: Application) {
  const factors = app.decision?.factors ?? [];
  const positive = factors.filter(
    (factor) => factor.effect === "positive",
  ).length;
  const negative = factors.filter(
    (factor) => factor.effect === "negative",
  ).length;
  return clamp(55 + app.checksPassed * 10 + positive * 8 - negative * 10);
}

function tone(value: number): IndexTone {
  if (value >= 75) return "success";
  if (value >= 55) return "action";
  if (value >= 35) return "warning";
  return "danger";
}

function Index({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint: string;
}) {
  const currentTone = value === null ? null : tone(value);
  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="xs">
        <Text fw={600}>{label}</Text>
        <Text fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>
          {value === null ? "—" : value}
        </Text>
      </Group>
      {value === null ? (
        <Text size="sm" c="dimmed">
          Завершено
        </Text>
      ) : (
        <Progress
          value={value}
          color={toneColor[currentTone!]}
          size="md"
          radius="xl"
        />
      )}
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
    </Stack>
  );
}

/** Объяснимые индексы для клиента: не заменяют решение банка, а показывают готовность данных. */
export function HealthIndices({ app }: { app: Application }) {
  const health = financialHealth(app);
  const ready = readiness(app);
  const trust = confidence(app);
  const stage = stageOf(app);
  const currentStage = Math.min(stage.current + 1, stages.length);
  const terminal = isTerminal(app);
  const terminalHint =
    app.status === "rejected"
      ? "Заявка завершена: банк отказал"
      : "Выдача завершена: деньги зачислены";

  return (
    <Card component="section" aria-labelledby="health-indices-title">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Title order={2} size="h3" id="health-indices-title">
              Индексы компании
            </Title>
            <Text size="sm" c="dimmed">
              Сигналы для подготовки заявки и разговора с банком.
            </Text>
          </div>
          <Badge variant="light" color={toneColor[tone(trust)]}>
            Уверенность {trust}/100
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Index
            label="Финансовое здоровье"
            value={health}
            hint="Обороты и долговая нагрузка"
          />
          <Index
            label="Готовность заявки"
            value={ready}
            hint={
              terminal
                ? terminalHint
                : `Текущий этап ${currentStage} из ${stages.length}`
            }
          />
          <Index
            label="Уверенность"
            value={trust}
            hint="Проверки и факторы решения"
          />
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          {terminal
            ? `Итог заявки: ${terminalHint.toLowerCase()}.`
            : `Компас уверенности: ${
                trust >= 75
                  ? "можно переходить к условиям"
                  : trust >= 55
                    ? "сверьте факторы и документы"
                    : "сначала закройте замечания"
              }.`}
        </Text>
      </Stack>
    </Card>
  );
}
