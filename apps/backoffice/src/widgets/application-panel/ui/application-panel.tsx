"use client";

import {
  ActionIcon,
  Button,
  CloseButton,
  Group,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import Link from "next/link";
import { type Ref, useState } from "react";

import { StateBlock } from "@repo/ui/state-block";

import {
  EventTimeline,
  StatusTag,
  formatDateTimeFull,
  useApplication,
  useProducts,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import { ActionBar } from "@/features/application-actions";

import classes from "./application-panel.module.css";
import { CheckResults, DataList, RiskBlock, Summary } from "./parts";

type Tab = "data" | "checks" | "history";

/** Правая панель заявки рядом с очередью: сводка, вкладки, действия в подвале. */
export function ApplicationPanel({
  id,
  onClose,
  titleRef,
}: {
  id: string;
  onClose: () => void;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const employee = useSignedInEmployee();
  const query = useApplication(id);
  const products = useProducts();
  const employees = useEmployees();
  const [tab, setTab] = useState<Tab>("checks");

  const app = query.data;
  const assignee = app?.assigneeId
    ? app.assigneeId === employee.id
      ? "Вы"
      : (employees.data?.find((e) => e.id === app.assigneeId)?.name ??
        "Неизвестен")
    : "Не назначен";

  return (
    <div className={classes.panel}>
      <div className={classes.head}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <h2 ref={titleRef} tabIndex={-1} className={classes.title}>
            {app ? `Заявка № ${app.number}` : "Заявка"}
          </h2>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Открыть страницей">
              <ActionIcon
                component={Link}
                href={`/applications/${id}`}
                variant="subtle"
                color="gray"
                size={36}
                aria-label="Открыть заявку отдельной страницей"
              >
                <IconArrowUpRight size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <CloseButton
              size={36}
              onClick={onClose}
              aria-label="Закрыть панель заявки"
            />
          </Group>
        </Group>
        {app && (
          <Group gap="sm" mt={8}>
            <StatusTag status={app.status} />
            <Text size="xs" c="dimmed" className={classes.num}>
              Подана {formatDateTimeFull(app.createdAt)}
            </Text>
          </Group>
        )}
      </div>

      <div className={classes.body}>
        {query.isPending ? (
          <StateBlock kind="loading" title="Загружаем заявку" />
        ) : query.isError ? (
          <StateBlock
            kind="error"
            title="Заявка не загрузилась"
            action={
              <Button variant="default" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            }
          >
            {query.error.message}
          </StateBlock>
        ) : (
          <>
            <Summary app={query.data} />
            <Tabs
              value={tab}
              onChange={(v) => v && setTab(v as Tab)}
              mt="lg"
              classNames={{ list: classes.tabsList, tab: classes.tab }}
            >
              <Tabs.List>
                <Tabs.Tab value="data">Данные</Tabs.Tab>
                <Tabs.Tab value="checks">Проверки</Tabs.Tab>
                <Tabs.Tab value="history">История</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="data" pt="md">
                <DataList app={query.data} assignee={assignee} />
              </Tabs.Panel>
              <Tabs.Panel value="checks" pt="md">
                <Text size="sm" fw={600} mb="xs">
                  Результаты проверок
                </Text>
                <CheckResults app={query.data} employee={employee} />
                <RiskBlock app={query.data} />
              </Tabs.Panel>
              <Tabs.Panel value="history" pt="md">
                <EventTimeline events={query.data.events} />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </div>

      {app && (
        <div className={classes.foot}>
          <ActionBar
            app={app}
            employee={employee}
            products={products.data ?? []}
          />
        </div>
      )}
    </div>
  );
}
