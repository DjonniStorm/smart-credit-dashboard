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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import type { ReportActorKind } from "@repo/contracts/reports";
import { StateBlock } from "@repo/ui/state-block";

import {
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
  unknown: "Неизвестно",
};

function formatDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

/** Журнал событий из API, с курсорной пагинацией и серверным фильтром актёра. */
export function JournalTable() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const actor = (searchParams.get("actor") as ActorFilter | null) ?? "all";
  const search = searchParams.get("search") ?? "";
  const report = useManagerReport("journal", {
    actorKinds: actor === "all" ? undefined : [actor],
    search,
    limit: 50,
  });

  const items = useMemo(() => report.data?.journal?.items ?? [], [report.data]);

  useEffect(() => {
    if (!report.data) {
      return;
    }
    const changes: Record<string, string | null> = {};
    if (!searchParams.get("from")) {
      changes.from = report.data.query.from;
    }
    if (!searchParams.get("to")) {
      changes.to = report.data.query.to;
    }
    if (!searchParams.get("timezone")) {
      changes.timezone = report.data.query.timezone;
    }
    if (!searchParams.get("bucket")) {
      changes.bucket = report.data.query.bucket;
    }
    if (Object.keys(changes).length > 0) {
      updateUrl(router, pathname, searchParams, changes);
    }
  }, [pathname, report.data, router, searchParams]);

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
            updateUrl(router, pathname, searchParams, {
              actor: value === "all" ? null : value,
              cursor: null,
            });
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
          onChange={(event) => {
            const value = event.currentTarget.value;
            updateUrl(router, pathname, searchParams, {
              search: value || null,
              cursor: null,
            });
          }}
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
                      {formatDate(item.occurredAt, report.data.query.timezone)}
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
                    {item.status
                      ? (reportStatusLabel[item.status] ?? "Неизвестно")
                      : "—"}
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
          onClick={() =>
            updateUrl(router, pathname, searchParams, {
              cursor: journal.nextCursor,
            })
          }
        >
          Следующая страница
        </Button>
      )}
      <Text size="xs" c="dimmed">
        Срез сформирован {formatDate(report.data.query.to, report.data.query.timezone)} · старые события
        могут быть отмечены как неполные.
      </Text>
    </Stack>
  );
}

function updateUrl(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  changes: Record<string, string | null | undefined>,
): void {
  const next = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
  }
  const suffix = next.toString();
  router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
    scroll: false,
  });
}
