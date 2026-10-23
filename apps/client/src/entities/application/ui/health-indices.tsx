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

type IndexTone = "success" | "action" | "warning" | "danger";

const toneColor: Record<IndexTone, string> = {
  success: "green",
  action: "blue",
  warning: "orange",
  danger: "red",
};

function isTerminal(app: Application) {
  return app.status === "rejected" || app.status === "disbursed";
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
  emptyLabel = "Ожидает расчёта",
}: {
  label: string;
  value: number | null;
  hint: string;
  emptyLabel?: string;
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
          {emptyLabel}
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
  const health = app.scoring?.healthIndex ?? null;
  const ready = app.scoring?.readinessIndex ?? null;
  const trust = app.scoring ? Math.round(app.scoring.confidence * 100) : null;
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
          <Badge
            variant="light"
            color={trust === null ? "gray" : tone(trust)}
          >
            Уверенность {trust === null ? "—" : `${trust}/100`}
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Index
            label="Финансовое здоровье"
            value={health}
            hint="Обороты и долговая нагрузка"
            emptyLabel={terminal ? terminalHint : undefined}
          />
          <Index
            label="Готовность заявки"
            value={ready}
            hint={
              terminal
                ? terminalHint
                : "Показывается после ответа scoring"
            }
            emptyLabel={terminal ? terminalHint : undefined}
          />
          <Index
            label="Уверенность"
            value={trust}
            hint="Проверки и факторы решения"
            emptyLabel={terminal ? terminalHint : undefined}
          />
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          {terminal
            ? `Итог заявки: ${terminalHint.toLowerCase()}.`
            : trust === null
              ? "Компас уверенности появится после завершения проверки."
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
