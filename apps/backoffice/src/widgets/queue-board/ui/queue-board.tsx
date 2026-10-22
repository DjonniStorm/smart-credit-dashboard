"use client";

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Menu,
  Pagination,
  Select,
  Table,
  Tabs,
  Text,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDotsVertical,
} from "@tabler/icons-react";
import Link from "next/link";
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
  StageBadge,
  countByGroup,
  formatDate,
  formatTime,
  productLabel,
  queueGroupLabel,
  queueGroupOrder,
  useApplications,
  useAssignMany,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import {
  QueueFilterBar,
  type QueueFilters,
  type QueueTab,
  type SortKey,
  applyFilters,
  defaultFilters,
  filterApps,
  isFiltered,
} from "@/features/queue-filters";
import { formatRub } from "@/shared/lib/money";

import classes from "./queue-board.module.css";

const tabs: QueueTab[] = ["all", ...queueGroupOrder];
const pageSizes = ["10", "20", "50"];

/** Очередь заявок: вкладки этапов, фильтры, таблица, пагинация. */
export function QueueBoard({
  tab,
  onTabChange,
  openId,
  onOpen,
}: {
  tab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
  openId: string | null;
  onOpen: (id: string) => void;
}) {
  const employee = useSignedInEmployee();
  const apps = useApplications();
  const employees = useEmployees();
  const assign = useAssignMany(employee.id);
  const [filters, setFilters] = useState<QueueFilters>(defaultFilters);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  // Новые фильтры, вкладка или размер страницы: снова с первой страницы.
  const pagingKey = `${tab}|${pageSize}|${JSON.stringify(filters)}`;
  const [paging, setPaging] = useState({ key: pagingKey, page: 1 });
  const page = paging.key === pagingKey ? paging.page : 1;
  const setPage = (p: number) => setPaging({ key: pagingKey, page: p });
  const [focusId, setFocusId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const all = useMemo(() => apps.data ?? [], [apps.data]);
  const rows = useMemo(
    () => applyFilters(all, filters, tab),
    [all, filters, tab],
  );
  const counts = useMemo(
    () => countByGroup(filterApps(all, filters)),
    [all, filters],
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const names = new Map((employees.data ?? []).map((e) => [e.id, e.name]));
  const canTake = (app: Application) =>
    app.assigneeId !== employee.id && app.waitingOn !== "nobody";
  // Выбор действует только на строки, которые сейчас видны: после смены
  // вкладки, фильтра или страницы скрытые заявки не попадут в действие.
  const selected = visible.filter((r) => checked.has(r.id));
  const takeable = selected.filter(canTake);

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

  const rovingId =
    visible.find((r) => r.id === (focusId ?? openId))?.id ??
    visible[0]?.id ??
    null;

  function move(from: string, delta: number) {
    const i = visible.findIndex((r) => r.id === from);
    const next = visible[Math.min(visible.length - 1, Math.max(0, i + delta))];
    if (!next) return;
    setFocusId(next.id);
    rowRefs.current.get(next.id)?.focus();
  }

  function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, app: Application) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      move(app.id, 1);
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      move(app.id, -1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(app.id);
    }
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allVisibleChecked =
    visible.length > 0 && visible.every((r) => checked.has(r.id));
  const someVisibleChecked = selected.length > 0;

  function toggleVisible() {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const r of visible) {
        if (allVisibleChecked) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }

  function takeIds(ids: string[]) {
    assign.mutate(
      { ids, assigneeId: employee.id },
      {
        onSuccess: () => {
          setChecked(new Set());
          notifications.show({
            message:
              ids.length === 1
                ? "Заявка у вас в работе"
                : `Заявок взято в работу: ${ids.length}`,
            withBorder: true,
          });
        },
      },
    );
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
    const filtered = isFiltered(filters);
    body = (
      <StateBlock
        kind="empty"
        title={
          all.length === 0
            ? "В очереди нет заявок"
            : filtered
              ? "Ничего не нашлось"
              : `На вкладке «${tab === "all" ? "Все" : queueGroupLabel[tab]}» пусто`
        }
        action={
          filtered && (
            <Button
              variant="default"
              onClick={() =>
                setFilters({
                  ...defaultFilters,
                  sort: filters.sort,
                  dir: filters.dir,
                })
              }
            >
              Сбросить фильтры
            </Button>
          )
        }
      >
        {all.length === 0
          ? "Новые заявки из кабинета клиента появятся здесь сами."
          : filtered
            ? "Под фильтры не подходит ни одна заявка. Проверьте ИНН или уберите часть фильтров."
            : "Заявки появятся, когда дойдут до этого этапа."}
      </StateBlock>
    );
  } else {
    body = (
      <div className={classes.tableBox}>
        <div className={classes.scroll}>
          <Table
            className={classes.table}
            aria-label="Очередь заявок"
            aria-describedby="queue-keys"
            highlightOnHover={false}
            verticalSpacing={10}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th className={classes.checkCell}>
                  <Checkbox
                    size="xs"
                    aria-label="Выбрать заявки на странице"
                    checked={allVisibleChecked}
                    indeterminate={someVisibleChecked && !allVisibleChecked}
                    onChange={toggleVisible}
                  />
                </Table.Th>
                <SortHeader k="number" filters={filters} onSort={sortBy}>
                  Номер
                </SortHeader>
                <Table.Th>Компания / ИНН</Table.Th>
                <Table.Th className={classes.product}>Продукт</Table.Th>
                <SortHeader k="amount" filters={filters} onSort={sortBy}>
                  Сумма
                </SortHeader>
                <SortHeader k="created" filters={filters} onSort={sortBy}>
                  Дата подачи
                </SortHeader>
                <Table.Th>Этап</Table.Th>
                <Table.Th className={classes.assigneeCol}>
                  Ответственный
                </Table.Th>
                <Table.Th className={classes.menuCell}>
                  <VisuallyHidden>Действия</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visible.map((app) => {
                const isOpen = app.id === openId;
                const rowCanTake = canTake(app);
                return (
                  <Table.Tr
                    key={app.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(app.id, el);
                      else rowRefs.current.delete(app.id);
                    }}
                    className={classes.row}
                    data-app-id={app.id}
                    data-open={isOpen || undefined}
                    data-checked={checked.has(app.id) || undefined}
                    tabIndex={app.id === rovingId ? 0 : -1}
                    aria-selected={isOpen}
                    onClick={() => onOpen(app.id)}
                    onKeyDown={(e) => onRowKey(e, app)}
                    onFocus={(e) => {
                      if (e.target === e.currentTarget) setFocusId(app.id);
                    }}
                  >
                    <Table.Td
                      className={classes.checkCell}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        size="xs"
                        aria-label={`Выбрать заявку ${app.number}`}
                        checked={checked.has(app.id)}
                        onChange={() => toggle(app.id)}
                      />
                    </Table.Td>
                    <Table.Td className={classes.number}>
                      № {app.number}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} className={classes.company}>
                        {app.applicant.name}
                      </Text>
                      <Text size="xs" c="dimmed" className={classes.num}>
                        {app.applicant.inn}
                      </Text>
                    </Table.Td>
                    <Table.Td className={classes.product}>
                      {productLabel[app.request.productId]}
                    </Table.Td>
                    <Table.Td className={classes.amount}>
                      {formatRub(app.request.amount)}
                    </Table.Td>
                    <Table.Td className={classes.num}>
                      <Text size="sm">{formatDate(app.createdAt)}</Text>
                      <Text size="xs" c="dimmed">
                        {formatTime(app.createdAt).slice(0, 5)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StageBadge app={app} />
                    </Table.Td>
                    <Table.Td className={classes.assigneeCol}>
                      <Text
                        size="sm"
                        c={app.assigneeId ? undefined : "dimmed"}
                        className={classes.assignee}
                      >
                        {app.assigneeId
                          ? app.assigneeId === employee.id
                            ? "Вы"
                            : (names.get(app.assigneeId) ?? "Неизвестен")
                          : "Не назначен"}
                      </Text>
                    </Table.Td>
                    <Table.Td
                      className={classes.menuCell}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size={32}
                            aria-label={`Действия по заявке ${app.number}`}
                          >
                            <IconDotsVertical size={16} stroke={1.5} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item onClick={() => onOpen(app.id)}>
                            Открыть в панели
                          </Menu.Item>
                          <Menu.Item
                            component={Link}
                            href={`/applications/${app.id}`}
                          >
                            Открыть страницей
                          </Menu.Item>
                          {rowCanTake && (
                            <Menu.Item onClick={() => takeIds([app.id])}>
                              Взять в работу
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </div>
        <div className={classes.foot}>
          <Text size="sm" c="dimmed" className={classes.shown}>
            Показано {visible.length} из {rows.length}
          </Text>
          {pages > 1 ? (
            <Pagination
              total={pages}
              value={current}
              onChange={setPage}
              size="sm"
              className={classes.pager}
              getControlProps={(control) => ({
                "aria-label":
                  control === "previous"
                    ? "Предыдущая страница"
                    : control === "next"
                      ? "Следующая страница"
                      : undefined,
              })}
              getItemProps={(p) => ({ "aria-label": `Страница ${p}` })}
            />
          ) : (
            <span className={classes.pager} />
          )}
          <Group gap={8} wrap="nowrap" className={classes.size}>
            <Text size="sm" c="dimmed" component="label" htmlFor="page-size">
              Показывать по
            </Text>
            <Select
              id="page-size"
              data={pageSizes}
              value={String(pageSize)}
              onChange={(v) => v && setPageSize(Number(v))}
              allowDeselect={false}
              w={72}
              size="xs"
            />
          </Group>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <header className={classes.head}>
        <h1 className={classes.title}>Очередь кредитных заявок</h1>
        <Text className={classes.subtitle}>Заявки малого бизнеса</Text>
      </header>

      <Tabs
        value={tab}
        onChange={(v) => v && onTabChange(v as QueueTab)}
        classNames={{ list: classes.tabs, tab: classes.tab }}
      >
        <Tabs.List aria-label="Этапы очереди">
          {tabs.map((t) => (
            <Tabs.Tab
              key={t}
              value={t}
              rightSection={
                <span className={classes.tabCount}>{counts[t]}</span>
              }
            >
              {t === "all" ? "Все" : queueGroupLabel[t]}
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

      {selected.length > 0 && (
        <div
          className={classes.bulk}
          role="region"
          aria-label="Выбранные заявки"
        >
          <Text size="sm" fw={500}>
            Выбрано: {selected.length}
          </Text>
          <Button
            size="xs"
            variant="default"
            loading={assign.isPending}
            disabled={takeable.length === 0}
            onClick={() => takeIds(takeable.map((r) => r.id))}
          >
            Взять в работу
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => setChecked(new Set())}
          >
            Снять выбор
          </Button>
          {assign.error && (
            <Text size="sm" c="var(--kk-danger)" role="alert">
              {assign.error.message}
            </Text>
          )}
        </div>
      )}

      {body}

      <Text id="queue-keys" size="xs" c="dimmed">
        Стрелки или j/k переходят по строкам, Enter открывает заявку справа, «/»
        переводит в поиск.
      </Text>
    </div>
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
      aria-sort={
        active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <UnstyledButton
        className={classes.sortButton}
        data-active={active || undefined}
        onClick={() => onSort(k)}
      >
        {children}
        <Icon size={14} stroke={1.75} aria-hidden />
      </UnstyledButton>
    </Table.Th>
  );
}
