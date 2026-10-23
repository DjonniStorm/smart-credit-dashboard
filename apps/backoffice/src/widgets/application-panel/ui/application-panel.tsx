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
import { backofficeText, i18n } from "@repo/i18n";
import { StateBlock } from "@repo/ui/state-block";

import {
  EventTimeline,
  StatusTag,
  formatDateTimeFull,
  useCompanyProfile,
  useApplication,
  useProducts,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import { ActionBar } from "@/features/application-actions";

import classes from "./application-panel.module.css";
import { CompanyProfileContext } from "./company-profile-context";
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
  const tx = backofficeText(i18n.defaultLocale);

  const app = query.data;
  const companyProfile = useCompanyProfile(app?.applicant.inn);
  const assignee = app?.assigneeId
    ? app.assigneeId === employee.id
      ? tx.application.assigneeSelf
      : (employees.data?.find((e) => e.id === app.assigneeId)?.name ??
        tx.application.assigneeUnknown)
    : tx.application.card.unassigned;

  return (
    <div className={classes.panel}>
      <div className={classes.head}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <h2 ref={titleRef} tabIndex={-1} className={classes.title}>
            {app ? tx.application.number(app.number) : tx.application.unnamed}
          </h2>
          <Group gap={4} wrap="nowrap">
            <Tooltip label={tx.application.aria.openPage}>
              <ActionIcon
                component={Link}
                href={`/applications/${id}`}
                variant="subtle"
                color="gray"
                size={36}
                aria-label={tx.application.aria.openPage}
              >
                <IconArrowUpRight size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <CloseButton
              size={36}
              onClick={onClose}
              aria-label={tx.application.aria.close}
            />
          </Group>
        </Group>
        {app && (
          <Group gap="sm" mt={8}>
            <StatusTag status={app.status} />
            <Text size="xs" c="dimmed" className={classes.num}>
              {tx.application.submitted(formatDateTimeFull(app.createdAt))}
            </Text>
          </Group>
        )}
      </div>

      <div className={classes.body}>
        {query.isPending ? (
          <StateBlock kind="loading" title={tx.application.loading} />
        ) : query.isError ? (
          <StateBlock
            kind="error"
            title={tx.application.error}
            action={
              <Button variant="default" onClick={() => void query.refetch()}>
                {tx.application.retry}
              </Button>
            }
          >
            {query.error.message}
          </StateBlock>
        ) : (
          <>
            <Summary app={query.data} />
            {companyProfile.data && (
              <CompanyProfileContext
                profile={companyProfile.data}
              />
            )}
            <Tabs
              value={tab}
              onChange={(v) => v && setTab(v as Tab)}
              mt="lg"
              classNames={{ list: classes.tabsList, tab: classes.tab }}
            >
              <Tabs.List>
                <Tabs.Tab value="data">{tx.application.tabs.data}</Tabs.Tab>
                <Tabs.Tab value="checks">{tx.application.tabs.checks}</Tabs.Tab>
                <Tabs.Tab value="history">{tx.application.tabs.history}</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="data" pt="md">
                <DataList app={query.data} assignee={assignee} />
              </Tabs.Panel>
              <Tabs.Panel value="checks" pt="md">
                <Text size="sm" fw={600} mb="xs">
                  {tx.application.tabs.checkResults}
                </Text>
                <CheckResults app={query.data} employee={employee} />
                <RiskBlock app={query.data} />
              </Tabs.Panel>
              <Tabs.Panel value="history" pt="md">
                <EventTimeline
                  events={query.data.events}
                  comments={query.data.comments}
                  handoff={query.data.handoff}
                />
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
            employees={employees.data ?? []}
            products={products.data ?? []}
          />
        </div>
      )}
    </div>
  );
}
