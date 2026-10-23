import { Group, Stack, Table, Text } from "@mantine/core";
import { type ReactNode } from "react";

import type { CheckSource, SourceCheck } from "@repo/contracts/application";
import { StateBlock } from "@repo/ui/state-block";

import { formatMs, formatTime } from "../model/format";
import { sourceLabel } from "../model/labels";
import classes from "./panel.module.css";
import { CheckTag } from "./status-badges";

/** Результаты внешних проверок: статус, время запроса и ответа, факты источника. */
export function CheckList({
  checks,
  renderAction,
}: {
  checks: SourceCheck[];
  renderAction?: (source: CheckSource) => ReactNode;
}) {
  if (checks.length === 0) {
    return (
      <StateBlock kind="empty" title="Проверки ещё не запускались">
        Конвейер запросит источники после проверки полноты заявки.
      </StateBlock>
    );
  }
  return (
    <Stack gap="sm">
      {checks.map((c) => (
        <Stack key={c.source} gap="xs" className={classes.panel}>
          <Group justify="space-between" align="flex-start" gap="sm">
            <Stack gap={2}>
              <Text fw={600}>{sourceLabel[c.source]}</Text>
              <Text size="sm">{c.summary}</Text>
            </Stack>
            <CheckTag state={c.state} />
          </Group>
          <Text size="xs" c="dimmed" className={classes.num}>
            Запрос {formatTime(c.requestedAt)}
            {c.respondedAt && `, ответ ${formatTime(c.respondedAt)}`}
            {c.responseMs != null && ` за ${formatMs(c.responseMs)}`}
          </Text>
          {c.facts.length > 0 && (
            <Table
              withRowBorders={false}
              verticalSpacing={2}
              horizontalSpacing={0}
              fz="sm"
            >
              <Table.Tbody>
                {c.facts.map((f) => (
                  <Table.Tr key={f.label}>
                    <Table.Td c="dimmed" w="45%">
                      {f.label}
                    </Table.Td>
                    <Table.Td className={classes.num}>{f.value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          {renderAction?.(c.source)}
        </Stack>
      ))}
    </Stack>
  );
}
