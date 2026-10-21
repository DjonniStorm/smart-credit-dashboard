"use client";

import { Group, Progress, Stack, Table, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { type JSX } from "react";

import { formatRub } from "./money";
import { t } from "./motion";
import classes from "./queue-table.module.css";
import { ToneBadge } from "./tone-badge";

/** За кем ход по заявке, с точки зрения сотрудника. */
export type WaitingOn = "employee" | "client" | "system" | "nobody";

export interface QueueRow {
  id: string;
  waitingOn: WaitingOn;
  blocker: string;
  applicant: string;
  amount: number;
  score: number | null;
  stage: string;
  inQueue: string;
}

const waiting: Record<WaitingOn, JSX.Element> = {
  employee: (
    <ToneBadge tone="action" icon={IconAlertCircle}>
      Нужно ваше решение
    </ToneBadge>
  ),
  client: (
    <ToneBadge tone="neutral" icon={IconClock}>
      Ждём клиента
    </ToneBadge>
  ),
  system: (
    <ToneBadge tone="neutral" icon={IconClock}>
      Идёт автоматически
    </ToneBadge>
  ),
  nobody: (
    <ToneBadge tone="success" icon={IconCircleCheck}>
      Решение принято
    </ToneBadge>
  ),
};

const order: Record<WaitingOn, number> = {
  employee: 0,
  client: 1,
  system: 2,
  nobody: 3,
};

/**
 * Очередь заявок АРМ. Первая колонка: что мешает решению. Сначала заявки,
 * где ход за сотрудником. Строка со сменившимся статусом переезжает в свою группу.
 */
export function QueueTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: QueueRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): JSX.Element {
  const sorted = [...rows].sort(
    (a, b) => order[a.waitingOn] - order[b.waitingOn],
  );

  return (
    <div className={classes.wrap}>
      <Table className={classes.table} aria-label="Очередь заявок">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Что мешает решению</Table.Th>
            <Table.Th>Заявитель</Table.Th>
            <Table.Th className={classes.num}>Сумма</Table.Th>
            <Table.Th>Скоринг</Table.Th>
            <Table.Th>Этап</Table.Th>
            <Table.Th className={classes.num}>В очереди</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map((row) => (
            <motion.tr
              key={row.id}
              layout
              transition={t.base}
              className={classes.row}
              tabIndex={0}
              aria-selected={row.id === selectedId}
              onClick={() => onSelect(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(row.id);
                }
              }}
            >
              <Table.Td>
                <Stack gap={4} align="flex-start">
                  {waiting[row.waitingOn]}
                  <Text size="sm">{row.blocker}</Text>
                </Stack>
              </Table.Td>
              <Table.Td className={classes.nowrap}>{row.applicant}</Table.Td>
              <Table.Td className={classes.num}>
                {formatRub(row.amount)}
              </Table.Td>
              <Table.Td>
                {row.score == null ? (
                  <Text size="sm" c="dimmed">
                    ещё нет
                  </Text>
                ) : (
                  // Скоринг без светофора: оценка риска ещё не решение.
                  <Group gap={8} wrap="nowrap">
                    <Progress
                      value={row.score}
                      w={48}
                      size="sm"
                      color="primary"
                      aria-hidden
                    />
                    <Text
                      size="sm"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {row.score}
                    </Text>
                  </Group>
                )}
              </Table.Td>
              <Table.Td>{row.stage}</Table.Td>
              <Table.Td className={classes.num}>{row.inQueue}</Table.Td>
            </motion.tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
