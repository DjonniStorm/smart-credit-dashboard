"use client";

import {
  Anchor,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReportActorKind } from "@repo/contracts/reports";
import { StateBlock } from "@repo/ui/state-block";

import {
  formatDateTime,
  statusLabel,
  useManagerReport,
} from "@/entities/application";

import classes from "./journal-table.module.css";

type ActorFilter = ReportActorKind | "all";

const reportStatusLabel: Record<string, string> = {
  ...statusLabel,
  accepted: "Принята",
  signing: "Подписание",
  funded: "Выдан",
  cancelled: "Отменена",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Журнал событий из API, с курсорной пагинацией и серверным фильтром актёра. */
export function JournalTable() {
  const [actor, setActor] = useState<ActorFilter>("all");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const report = useManagerReport("journal", {
    cursor,
    actor: actor === "all" ? undefined : actor,
    limit: 50,
  });

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return report.data?.journal?.items ?? [];
    }
    return (report.data?.journal?.items ?? []).filter((item) =>
      [item.applicationNumber, item.actor.name, item.title, item.comment ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [report.data, search]);

  if (report.isPending) {
    return <StateBlock kind="loading" title="Загружаем журнал" />;
  }
  if (report.isError) {
    return (
      <StateBlock
        kind="error"
        title="Журнал не загрузился"
        action={
          <Button variant="default" onClick={() => void report.refetch()}>
            Повторить
          </Button>
        }
      >
        {report.error.message}
      </StateBlock>
    );
  }

  const journal = report.data.journal;
  return (
    <Stack gap="md">
      <Group gap="xs" wrap="wrap">
        <SegmentedControl
          aria-label="Кто действовал"
          value={actor}
          onChange={(value) => {
            setActor(value as ActorFilter);
            setCursor(undefined);
          }}
          data={[
            { value: "all", label: "Все" },
            { value: "employee", label: "Сотрудники" },
            { value: "system", label: "Конвейер" },
            { value: "client", label: "Клиенты" },
          ]}
        />
        <TextInput
          aria-label="Поиск по журналу"
          placeholder="Номер, сотрудник или событие"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={{ base: "100%", sm: 320 }}
        />
      </Group>
      {items.length === 0 ? (
        <StateBlock kind="empty" title="Записей нет">
          За выбранный период и фильтр событий нет.
        </StateBlock>
      ) : (
        <div className={classes.box}>
          <Table
            miw={760}
            aria-label="Журнал действий"
            className={classes.table}
            verticalSpacing={10}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Когда</Table.Th>
                <Table.Th>Заявка</Table.Th>
                <Table.Th>Кто</Table.Th>
                <Table.Th>Что произошло</Table.Th>
                <Table.Th>Статус</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.eventId}>
                  <Table.Td className={classes.when}>
                    <time dateTime={item.occurredAt}>
                      {formatDate(item.occurredAt)}
                    </time>
                  </Table.Td>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      href={`/?open=${item.applicationId}`}
                      size="sm"
                      c="var(--mantine-color-text)"
                      underline="always"
                    >
                      № {item.applicationNumber}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.actor.name}</Text>
                    <Text size="xs" c="dimmed">
                      {item.actor.kind}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.title}</Text>
                    {item.comment && (
                      <Text size="xs" c="dimmed">
                        {item.comment}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td className={classes.status}>
                    {item.status ? reportStatusLabel[item.status] : "—"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
      {journal?.hasMore && journal.nextCursor && (
        <Button
          variant="default"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setCursor(journal.nextCursor ?? undefined)}
        >
          Следующая страница
        </Button>
      )}
      <Text size="xs" c="dimmed">
        Срез сформирован {formatDateTime(report.data.query.to)} · старые события
        могут быть отмечены как неполные.
      </Text>
    </Stack>
  );
}
