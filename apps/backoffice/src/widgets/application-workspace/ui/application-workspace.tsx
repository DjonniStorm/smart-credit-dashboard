"use client";

import {
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  List,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import type { Application, Employee } from "@repo/contracts/application";
import { Alfi, AlfiState } from "@repo/ui/alfi";
import { StageRail } from "@repo/ui/stage-rail";
import { StateBlock } from "@repo/ui/state-block";

import {
  CheckList,
  DecisionRules,
  EventTimeline,
  FactGrid,
  ScoreBreakdown,
  StatusTag,
  WaitingTag,
  formatDateTime,
  productLabel,
  stageLabel,
  stageOrder,
  useApplication,
  useProducts,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import {
  DecisionActions,
  RerunCheckButton,
} from "@/features/application-actions";
import { ClientSimulation } from "@/features/client-simulation";
import { rejectReasonLabel } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

type Tab = "data" | "checks" | "decision" | "history";

/** Рабочее место по одной заявке: данные, проверки, скоринг, решение, история. */
export function ApplicationWorkspace({ id }: { id: string }) {
  const employee = useSignedInEmployee();
  const query = useApplication(id);
  const products = useProducts();

  if (query.isPending) {
    return <StateBlock kind="loading" title="Загружаем заявку" />;
  }
  if (query.isError) {
    return (
      <Stack gap="md" align="flex-start">
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

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <BackLink />
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Заявка № {app.number} от {formatDateTime(app.createdAt)}
            </Text>
            <Title order={1}>{applicant.name}</Title>
            <Text c="dimmed">
              ИНН {applicant.inn}, {applicant.region}
            </Text>
          </Stack>
          <Group gap="xs">
            <WaitingTag waitingOn={app.waitingOn} />
            <StatusTag status={app.status} />
          </Group>
        </Group>
      </Stack>

      <StageRail
        stages={stageOrder.map((s) => stageLabel[s])}
        current={stageOrder.indexOf(app.stage)}
        waitingForClient={app.waitingOn === "client"}
        label="Этап заявки"
      />

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
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
                        { label: "Срок", value: `${request.termMonths} мес.` },
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
                    <Title order={3}>Клиент</Title>
                    <FactGrid
                      cols={3}
                      facts={[
                        {
                          label: "Форма",
                          value:
                            applicant.legalForm === "ip"
                              ? "Индивидуальный предприниматель"
                              : "ООО",
                        },
                        { label: "ИНН", value: applicant.inn },
                        {
                          label:
                            applicant.legalForm === "ip" ? "ОГРНИП" : "ОГРН",
                          value: applicant.ogrn,
                        },
                        { label: "Руководитель", value: applicant.director },
                        { label: "ОКВЭД", value: applicant.okved },
                        { label: "Регион", value: applicant.region },
                        {
                          label: "Дата регистрации",
                          value: new Date(
                            applicant.registeredAt,
                          ).toLocaleDateString("ru-RU"),
                        },
                        {
                          label: "Выручка за 12 мес.",
                          value: `${formatRub(applicant.annualRevenue)}, со слов клиента`,
                        },
                      ]}
                    />
                  </Stack>
                </Card>
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
                        Скоринг говорит о риске. Решение учитывает ещё продукт,
                        сумму, срок и проверки, поэтому при том же балле условия
                        по разным продуктам могут отличаться.
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
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card style={{ position: "sticky", top: 72 }}>
            <Stack gap="md">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Alfi state={managerAlfiState(app)} size={48} />
                <Stack gap={2}>
                  <Text fw={600}>Альфи</Text>
                  <Text size="sm">{managerAlfiMessage(app)}</Text>
                </Stack>
              </Group>
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  Что мешает решению
                </Text>
                <Text fw={600}>{app.blocker}</Text>
              </Stack>
              <Outcome app={app} />
              <DecisionActions
                app={app}
                employee={employee}
                products={products}
              />
              <ClientSimulation app={app} />
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function managerAlfiState(app: Application): AlfiState {
  if (app.waitingOn === "system") return AlfiState.Checking;
  if (app.waitingOn === "client") return AlfiState.NeedsAnswer;
  if (app.status === "rejected") return AlfiState.Attention;
  if (app.waitingOn === "nobody") return AlfiState.Success;
  if (app.decision) return AlfiState.Explain;
  return AlfiState.Idle;
}

function managerAlfiMessage(app: Application): string {
  if (app.waitingOn === "system") {
    return "Источники ещё проверяются. Решение появится после ответа системы.";
  }
  if (app.waitingOn === "client") {
    return "Клиент должен ответить на запрос. После этого заявка вернётся в очередь.";
  }
  if (app.status === "rejected") {
    return "Решение отклонено. Проверьте причину и историю факторов.";
  }
  if (app.decision) {
    return "Рекомендация готова. Сверьте факторы и подтвердите или измените её.";
  }
  return app.blocker;
}

/** Что уже решено по заявке: условия, запрос или причина отказа. */
function Outcome({ app }: { app: Application }) {
  if (app.status === "needs_client" && app.requestedInfo.length > 0) {
    return (
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          Запрошено у клиента
        </Text>
        <List size="sm" spacing={2}>
          {app.requestedInfo.map((i) => (
            <List.Item key={i}>{i}</List.Item>
          ))}
        </List>
      </Stack>
    );
  }
  if (app.status === "rejected" && app.rejectReason) {
    return (
      <Text size="sm">
        Причина отказа: {rejectReasonLabel[app.rejectReason].toLowerCase()}
      </Text>
    );
  }
  if (
    app.offer &&
    ["counter_offer", "approved", "disbursed"].includes(app.status)
  ) {
    return (
      <FactGrid
        facts={[
          { label: "Продукт", value: productLabel[app.offer.productId] },
          { label: "Сумма", value: formatRub(app.offer.amount) },
          { label: "Срок", value: `${app.offer.termMonths} мес.` },
          { label: "Ставка", value: `${app.offer.ratePct} %` },
        ]}
      />
    );
  }
  return null;
}
