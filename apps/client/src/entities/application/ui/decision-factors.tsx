import { Stack, Table, Text, Title } from "@mantine/core";
import {
  IconCircleMinus,
  IconCirclePlus,
  IconEqual,
} from "@tabler/icons-react";

import type { DecisionFactor } from "@repo/contracts/cabinet";
import { type Tone, ToneBadge } from "@repo/ui/tone-badge";

import { tx } from "@/shared/i18n";

const effects = {
  positive: { tone: "success", icon: IconCirclePlus },
  negative: { tone: "danger", icon: IconCircleMinus },
  neutral: { tone: "neutral", icon: IconEqual },
} satisfies Record<
  DecisionFactor["effect"],
  { tone: Tone; icon: typeof IconEqual }
>;

const t = tx.application.factors;

/** Факторы решения: входные данные, источник и куда они сдвинули оценку. */
export function DecisionFactors({ factors }: { factors: DecisionFactor[] }) {
  return (
    <Stack gap="sm">
      <div>
        <Title order={3}>{t.title}</Title>
        <Text size="sm" c="dimmed">
          {t.lead}
        </Text>
      </div>
      <Table.ScrollContainer minWidth={640}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t.factor}</Table.Th>
              <Table.Th>{t.value}</Table.Th>
              <Table.Th>{t.effect}</Table.Th>
              <Table.Th>{t.source}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {factors.map((f) => {
              const e = effects[f.effect];
              return (
                <Table.Tr key={f.label}>
                  <Table.Td>
                    <Text fw={500}>{f.label}</Text>
                    <Text size="sm" c="dimmed">
                      {f.note}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {f.value}
                  </Table.Td>
                  <Table.Td miw={130}>
                    <ToneBadge tone={e.tone} icon={e.icon}>
                      {t[f.effect]}
                    </ToneBadge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {f.source}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
