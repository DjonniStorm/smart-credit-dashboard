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
import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Actor } from "@repo/contracts/application";
import { StateBlock } from "@repo/ui/state-block";

import {
  formatDateTime,
  statusLabel,
  useApplications,
} from "@/entities/application";

type ActorFilter = Actor["kind"] | "all";

const PAGE = 50;

/** Журнал действий по всем заявкам: кто и когда менял заявку. */
export function JournalTable() {
  const apps = useApplications();
  const [actor, setActor] = useState<ActorFilter>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const events = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (apps.data ?? [])
      .flatMap((a) => a.events.map((e) => ({ ...e, app: a })))
      .filter((e) => actor === "all" || e.actor.kind === actor)
      .filter(
        (e) =>
          !q ||
          e.app.number.includes(q) ||
          e.app.applicant.inn.includes(q) ||
          e.app.applicant.name.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q),
      )
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [apps.data, actor, search]);

  if (apps.isPending)
    return <StateBlock kind="loading" title="Загружаем журнал" />;
  if (apps.isError) {
    return (
      <StateBlock
        kind="error"
        title="Журнал не загрузился"
        action={
          <Button variant="default" onClick={() => void apps.refetch()}>
            Повторить
          </Button>
        }
      >
        {apps.error.message}
      </StateBlock>
    );
  }

  return (
    <Stack gap="md">
      <Group gap="xs" wrap="wrap">
        <SegmentedControl
          aria-label="Кто действовал"
          value={actor}
          onChange={(v) => setActor(v as ActorFilter)}
          data={[
            { value: "all", label: "Все" },
            { value: "employee", label: "Сотрудники" },
            { value: "system", label: "Конвейер" },
            { value: "client", label: "Клиенты" },
          ]}
        />
        <TextInput
          aria-label="Поиск по журналу"
          placeholder="Номер, ИНН, компания или сотрудник"
          leftSection={<IconSearch size={16} aria-hidden />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={{ base: "100%", sm: 320 }}
        />
      </Group>
      {events.length === 0 ? (
        <StateBlock kind="empty" title="Записей нет">
          Под этот фильтр не подходит ни одно действие.
        </StateBlock>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <Table miw={760} aria-label="Журнал действий">
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
              {events.slice(0, limit).map((e) => (
                <Table.Tr key={e.id}>
                  <Table.Td
                    style={{
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatDateTime(e.at)}
                  </Table.Td>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      href={`/applications/${e.app.id}`}
                      size="sm"
                      c="var(--mantine-color-text)"
                      underline="always"
                    >
                      № {e.app.number}
                    </Anchor>
                    <Text size="xs" c="dimmed">
                      {e.app.applicant.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>{e.actor.name}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{e.title}</Text>
                    {e.comment && (
                      <Text size="xs" c="dimmed">
                        {e.comment}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {e.toStatus ? statusLabel[e.toStatus] : ""}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
      {events.length > limit && (
        <Button
          variant="default"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setLimit((l) => l + PAGE)}
        >
          Показать ещё {Math.min(PAGE, events.length - limit)}
        </Button>
      )}
    </Stack>
  );
}
