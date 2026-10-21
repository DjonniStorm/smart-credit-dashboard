"use client";

import {
  Button,
  Grid,
  Group,
  Progress,
  Stack,
  Table,
  Tabs,
  Text,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Application } from "@repo/contracts/application";
import { StateBlock } from "@repo/ui/state-block";

import {
  WaitingTag,
  formatAge,
  productLabel,
  useApplications,
  waitingLabel,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import {
  QueueFilterBar,
  type QueueFilters,
  type SortKey,
  applyFilters,
  countByTab,
  defaultFilters,
} from "@/features/queue-filters";
import { formatRub } from "@/shared/lib/money";

import classes from "./queue-board.module.css";
import { QueuePreview } from "./queue-preview";

const tabs: QueueFilters["tab"][] = [
  "all",
  "employee",
  "system",
  "client",
  "nobody",
];

/** Очередь заявок: фильтры, таблица с клавиатурой и карточка выбранной заявки. */
export function QueueBoard() {
  const employee = useSignedInEmployee();
  const apps = useApplications();
  const employees = useEmployees();
  const router = useRouter();
  const [filters, setFilters] = useState<QueueFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const rows = useMemo(
    () => applyFilters(apps.data ?? [], filters),
    [apps.data, filters],
  );
  const counts = useMemo(() => countByTab(apps.data ?? []), [apps.data]);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  const names = new Map((employees.data ?? []).map((e) => [e.id, e.name]));

  // «/» переводит фокус в поиск откуда угодно, кроме полей ввода.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function move(delta: number) {
    if (!selected) return;
    const i = rows.findIndex((r) => r.id === selected.id);
    const next = rows[Math.min(rows.length - 1, Math.max(0, i + delta))];
    if (!next) return;
    setSelectedId(next.id);
    rowRefs.current.get(next.id)?.focus();
  }

  function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, app: Application) {
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      router.push(`/applications/${app.id}`);
    } else if (e.key === " ") {
      e.preventDefault();
      setSelectedId(app.id);
    }
  }

  function sortBy(key: SortKey) {
    setFilters((f) => ({
      ...f,
      sort: key,
      dir: f.sort === key && f.dir === "desc" ? "asc" : "desc",
    }));
  }

  let body;
  if (apps.isPending) {
    body = <StateBlock kind="loading" title="Загружаем очередь" />;
  } else if (apps.isError) {
    body = (
      <StateBlock
        kind="error"
        title="Очередь не загрузилась"
        action={
          <Button variant="default" onClick={() => void apps.refetch()}>
            Повторить
          </Button>
        }
      >
        {apps.error.message}
      </StateBlock>
    );
  } else if (rows.length === 0) {
    body = (
      <StateBlock
        kind="empty"
        title={
          apps.data.length === 0 ? "В очереди нет заявок" : "Ничего не нашлось"
        }
        action={
          apps.data.length > 0 && (
            <Button
              variant="default"
              onClick={() => setFilters(defaultFilters)}
            >
              Сбросить фильтры
            </Button>
          )
        }
      >
        {apps.data.length === 0
          ? "Новые заявки из кабинета клиента появятся здесь сами."
          : "Под фильтры не подходит ни одна заявка. Проверьте ИНН или уберите часть фильтров."}
      </StateBlock>
    );
  } else {
    body = (
      <div className={classes.wrap}>
        <Table
          className={classes.table}
          aria-label="Очередь заявок"
          aria-describedby="queue-keys"
          highlightOnHover={false}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Что мешает решению</Table.Th>
              <Table.Th>Заявитель</Table.Th>
              <SortHeader k="amount" filters={filters} onSort={sortBy}>
                Сумма
              </SortHeader>
              <SortHeader k="score" filters={filters} onSort={sortBy}>
                Скоринг
              </SortHeader>
              <Table.Th>Ответственный</Table.Th>
              <SortHeader k="age" filters={filters} onSort={sortBy}>
                Ждёт
              </SortHeader>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((app) => {
              const isSelected = app.id === selected?.id;
              return (
                <Table.Tr
                  key={app.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(app.id, el);
                    else rowRefs.current.delete(app.id);
                  }}
                  className={classes.row}
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(app.id)}
                  onDoubleClick={() => router.push(`/applications/${app.id}`)}
                  onKeyDown={(e) => onRowKey(e, app)}
                  onFocus={() => setSelectedId(app.id)}
                >
                  <Table.Td>
                    <Stack gap={4} align="flex-start">
                      <WaitingTag waitingOn={app.waitingOn} />
                      <Text size="sm">{app.blocker}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {app.applicant.name}
                    </Text>
                    <Text
                      size="xs"
                      c="dimmed"
                      className={classes.num}
                      ta="left"
                    >
                      № {app.number}, ИНН {app.applicant.inn}
                    </Text>
                  </Table.Td>
                  <Table.Td className={classes.num}>
                    <Text size="sm">{formatRub(app.request.amount)}</Text>
                    <Text size="xs" c="dimmed">
                      {productLabel[app.request.productId]}
                    </Text>
                  </Table.Td>
                  <Table.Td className={classes.num}>
                    {app.scoring ? (
                      // Скоринг без светофора: оценка риска ещё не решение.
                      <Group gap={8} wrap="nowrap" justify="flex-end">
                        <Progress
                          value={app.scoring.score}
                          w={48}
                          size="sm"
                          color="primary"
                          aria-hidden
                        />
                        <Text size="sm">{app.scoring.score}</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        ещё нет
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={app.assigneeId ? undefined : "dimmed"}>
                      {app.assigneeId
                        ? app.assigneeId === employee.id
                          ? "Вы"
                          : (names.get(app.assigneeId) ?? "Неизвестен")
                        : "Не назначен"}
                    </Text>
                  </Table.Td>
                  <Table.Td className={classes.num}>
                    {formatAge(app.updatedAt)}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    );
  }

  return (
    <Stack gap="md">
      <Tabs
        value={filters.tab}
        onChange={(v) =>
          v && setFilters((f) => ({ ...f, tab: v as QueueFilters["tab"] }))
        }
      >
        <Tabs.List>
          {tabs.map((t) => (
            <Tabs.Tab key={t} value={t}>
              {t === "all" ? "Все" : waitingLabel[t]}{" "}
              <Text span c="dimmed" size="sm" className={classes.num}>
                {counts[t]}
              </Text>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <QueueFilterBar
        value={filters}
        onChange={setFilters}
        employees={employees.data ?? []}
        currentEmployeeId={employee.id}
        searchRef={searchRef}
      />
      <Text id="queue-keys" size="xs" c="dimmed">
        Стрелки или j/k выбирают заявку, Enter открывает её, «/» переводит в
        поиск.
      </Text>
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>{body}</Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }} visibleFrom="lg">
          <div className={classes.preview}>
            {selected ? (
              <QueuePreview app={selected} />
            ) : (
              !apps.isPending && (
                <StateBlock kind="empty" title="Заявка не выбрана">
                  Выберите строку в очереди, чтобы увидеть детали.
                </StateBlock>
              )
            )}
          </div>
        </Grid.Col>
      </Grid>
      <VisuallyHidden aria-live="polite">
        {selected
          ? `Выбрана заявка ${selected.number}, ${selected.applicant.name}`
          : ""}
      </VisuallyHidden>
    </Stack>
  );
}

function SortHeader({
  k,
  filters,
  onSort,
  children,
}: {
  k: SortKey;
  filters: QueueFilters;
  onSort: (k: SortKey) => void;
  children: string;
}) {
  const active = filters.sort === k;
  const Icon = !active
    ? IconArrowsSort
    : filters.dir === "asc"
      ? IconArrowUp
      : IconArrowDown;
  return (
    <Table.Th
      className={classes.num}
      aria-sort={
        active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <UnstyledButton className={classes.sortButton} onClick={() => onSort(k)}>
        {children}
        <Icon size={14} aria-hidden />
      </UnstyledButton>
    </Table.Th>
  );
}
