"use client";

import {
  Anchor,
  Button,
  Card,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import type { Application, Employee } from "@repo/contracts/application";
import { CompanyPassport } from "@repo/ui/company-passport";
import { StateBlock } from "@repo/ui/state-block";

import {
  CheckList,
  DecisionRules,
  EventTimeline,
  FactGrid,
  ScoreBreakdown,
  StatusTag,
  formatDate,
  formatDateTimeFull,
  productLabel,
  useApplication,
  useProducts,
  useCompanyProfile,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import { ActionBar, RerunCheckButton } from "@/features/application-actions";
import { formatRub } from "@/shared/lib/money";

import classes from "./application-panel.module.css";
import { Outcome, RiskBlock, Summary } from "./parts";

type Tab = "data" | "checks" | "decision" | "history";

/** Рабочее место по одной заявке: данные, проверки, скоринг, решение, история. */
export function ApplicationWorkspace({ id }: { id: string }) {
  const employee = useSignedInEmployee();
  const query = useApplication(id);
  const products = useProducts();

  if (query.isPending) {
    return (
      <div className={classes.page}>
        <StateBlock kind="loading" title="Загружаем заявку" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Stack gap="md" align="flex-start" className={classes.page}>
        <BackLink />
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
      </Stack>
    );
  }
  return (
    <Workspace
      app={query.data}
      employee={employee}
      products={products.data ?? []}
    />
  );
}

function BackLink() {
  return (
    <Anchor
      component={Link}
      href="/"
      size="sm"
      c="var(--mantine-color-text)"
      underline="always"
    >
      <Group gap={4} component="span">
        <IconArrowLeft size={16} aria-hidden />
        Очередь заявок
      </Group>
    </Anchor>
  );
}

function defaultTab(app: Application): Tab {
  if (app.stage === "enrichment" || app.stage === "intake") return "checks";
  if (app.decision) return "decision";
  return "data";
}

function Workspace({
  app,
  employee,
  products,
}: {
  app: Application;
  employee: Employee;
  products: NonNullable<ReturnType<typeof useProducts>["data"]>;
}) {
  const employees = useEmployees();
  const [tab, setTab] = useState<Tab>(() => defaultTab(app));
  const assignee = employees.data?.find((e) => e.id === app.assigneeId);
  const product = products.find((p) => p.id === app.request.productId);
  const { applicant, request } = app;
  const companyProfile = useCompanyProfile(applicant.inn);

  return (
    <div className={classes.page}>
      <Stack gap="lg">
        <Stack gap="xs">
          <BackLink />
          <Group justify="space-between" align="flex-end" gap="sm">
            <Stack gap={2}>
              <Title order={1} className={classes.pageTitle}>
                Заявка № {app.number}
              </Title>
              <Text c="dimmed" className={classes.num}>
                {applicant.name}, ИНН {applicant.inn}
              </Text>
            </Stack>
            <Group gap="sm">
              <StatusTag status={app.status} />
              <Text size="sm" c="dimmed" className={classes.num}>
                Подана {formatDateTimeFull(app.createdAt)}
              </Text>
            </Group>
          </Group>
        </Stack>

        <div className={classes.workspace}>
          <div className={classes.workspaceMain}>
            <Tabs value={tab} onChange={(v) => v && setTab(v as Tab)}>
              <Tabs.List mb="md">
                <Tabs.Tab value="data">Данные</Tabs.Tab>
                <Tabs.Tab value="checks">Проверки</Tabs.Tab>
                <Tabs.Tab value="decision">Скоринг и решение</Tabs.Tab>
                <Tabs.Tab value="history">История</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="data">
                <Stack gap="lg">
                  <Card>
                    <Stack gap="md">
                      <Title order={3}>Заявка</Title>
                      <FactGrid
                        cols={3}
                        facts={[
                          {
                            label: "Продукт",
                            value: productLabel[request.productId],
                          },
                          { label: "Сумма", value: formatRub(request.amount) },
                          {
                            label: "Срок",
                            value: `${request.termMonths} мес.`,
                          },
                          { label: "Цель", value: request.purpose },
                          {
                            label: "Ставка продукта",
                            value: product
                              ? `от ${product.ratePct} %`
                              : "нет данных",
                          },
                          {
                            label: "Ответственный",
                            value: assignee?.name ?? "Не назначен",
                          },
                        ]}
                      />
                    </Stack>
                  </Card>
                  <Card>
                    <Stack gap="md">
                      <Title order={3}>Заявитель и данные из заявки</Title>
                      <FactGrid
                        cols={3}
                        facts={[
                          { label: "Заявитель", value: applicant.name },
                          { label: "ОГРН/ОГРНИП", value: applicant.ogrn },
                          { label: "Руководитель", value: applicant.director },
                          { label: "Регион", value: applicant.region },
                          {
                            label: "Выручка за 12 мес., со слов клиента",
                            value: formatRub(applicant.annualRevenue),
                          },
                          {
                            label: "Дата регистрации",
                            value: formatDate(applicant.registeredAt),
                          },
                        ]}
                      />
                    </Stack>
                  </Card>
                  <CompanyPassport
                    profile={companyProfile.data}
                    mode="backoffice"
                    density="full"
                    loading={companyProfile.isPending}
                    error={companyProfile.isError ? companyProfile.error.message : null}
                    retry={() => void companyProfile.refetch()}
                  />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="checks">
                <CheckList
                  checks={app.checks}
                  renderAction={(source) =>
                    app.checks.find((c) => c.source === source)?.state ===
                      "unavailable" && (
                      <RerunCheckButton
                        applicationId={app.id}
                        employeeId={employee.id}
                        source={source}
                      />
                    )
                  }
                />
              </Tabs.Panel>

              <Tabs.Panel value="decision">
                {app.scoring && app.decision ? (
                  <Stack gap="lg">
                    <Card>
                      <Stack gap="md">
                        <Title order={3}>Скоринг: оценка риска</Title>
                        <ScoreBreakdown scoring={app.scoring} />
                      </Stack>
                    </Card>
                    <Card>
                      <Stack gap="md">
                        <Title order={3}>
                          Кредитное решение: правила продукта
                        </Title>
                        <Text size="sm" c="dimmed">
                          Скоринг говорит о риске. Решение учитывает ещё
                          продукт, сумму, срок и проверки, поэтому при том же
                          балле условия по разным продуктам могут отличаться.
                        </Text>
                        <DecisionRules decision={app.decision} />
                      </Stack>
                    </Card>
                  </Stack>
                ) : (
                  <StateBlock
                    kind={app.waitingOn === "system" ? "loading" : "empty"}
                    title={
                      app.waitingOn === "system"
                        ? "Ждём ответы источников"
                        : "Скоринга ещё нет"
                    }
                  >
                    Скоринг считается, когда ответят все источники.
                  </StateBlock>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="history">
                <EventTimeline events={app.events} />
              </Tabs.Panel>
            </Tabs>
          </div>

          <aside
            className={classes.workspaceAside}
            aria-label="Сводка и действия"
          >
            <Summary app={app} />
            <RiskBlock app={app} />
            <Outcome app={app} />
            <div className={classes.asideFoot}>
              <ActionBar
                app={app}
                employee={employee}
                employees={employees.data ?? []}
                products={products}
              />
            </div>
          </aside>
        </div>
      </Stack>
    </div>
  );
}
