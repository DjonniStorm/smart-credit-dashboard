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
import { backofficeText, i18n } from "@repo/i18n";
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
  useCompanyProfile,
  useProducts,
} from "@/entities/application";
import { useEmployees, useSignedInEmployee } from "@/entities/employee";
import { armActionsTarget } from "@/features/alfi-assistant";
import { ActionBar, RerunCheckButton } from "@/features/application-actions";
import { formatRub } from "@/shared/lib/money";
import { purposeLabel } from "@/shared/lib/purpose";

import classes from "./application-panel.module.css";
import { Outcome, RiskBlock, Summary } from "./parts";
import { UrgentNote } from "./urgent-note";

type Tab = "data" | "checks" | "decision" | "history";
const tx = backofficeText(i18n.defaultLocale);

/** Рабочее место по одной заявке: данные, проверки, скоринг, решение, история. */
export function ApplicationWorkspace({ id }: { id: string }) {
  const employee = useSignedInEmployee();
  const query = useApplication(id);
  const products = useProducts();

  if (query.isPending) {
    return (
      <div className={classes.page}>
        <StateBlock kind="loading" title={tx.application.loading} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Stack gap="md" align="flex-start" className={classes.page}>
        <BackLink />
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
        {tx.application.backToQueue}
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
    <div className={classes.page} data-alfi-workspace>
      <Stack gap="lg">
        <Stack gap="xs">
          <BackLink />
          <Group justify="space-between" align="flex-end" gap="sm">
            <Stack gap={2}>
              <Title order={1} className={classes.pageTitle}>
                {tx.application.number(app.number)}
              </Title>
              <Text c="dimmed" className={classes.num}>
                {applicant.name}, {tx.summary.inn} {applicant.inn}
              </Text>
            </Stack>
            <Group gap="sm">
              <StatusTag status={app.status} />
              <Text size="sm" c="dimmed" className={classes.num}>
                {tx.application.submitted(formatDateTimeFull(app.createdAt))}
              </Text>
            </Group>
          </Group>
          <UrgentNote app={app} />
        </Stack>

        <div className={classes.workspace}>
          <div className={classes.workspaceMain}>
            <Tabs value={tab} onChange={(v) => v && setTab(v as Tab)}>
              <Tabs.List mb="md">
                <Tabs.Tab value="data">{tx.application.tabs.data}</Tabs.Tab>
                <Tabs.Tab value="checks">{tx.application.tabs.checks}</Tabs.Tab>
                <Tabs.Tab value="decision">
                  {tx.application.tabs.decision}
                </Tabs.Tab>
                <Tabs.Tab value="history">
                  {tx.application.tabs.history}
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="data">
                <Stack gap="lg">
                  <Card>
                    <Stack gap="md">
                      <Title order={3}>{tx.application.card.title}</Title>
                      <FactGrid
                        cols={3}
                        facts={[
                          {
                            label: tx.application.card.product,
                            value: productLabel[request.productId],
                          },
                          {
                            label: tx.application.card.amount,
                            value: formatRub(request.amount),
                          },
                          {
                            label: tx.application.card.term,
                            value: tx.application.card.termValue(
                              request.termMonths,
                            ),
                          },
                          {
                            label: tx.application.card.purpose,
                            value: purposeLabel(request.purpose),
                          },
                          {
                            label: tx.application.card.rate,
                            value: product
                              ? tx.application.card.rateValue(product.ratePct)
                              : tx.application.card.noProductData,
                          },
                          {
                            label: tx.application.card.assignee,
                            value:
                              assignee?.name ?? tx.application.card.unassigned,
                          },
                        ]}
                      />
                    </Stack>
                  </Card>
                  <Card>
                    <Stack gap="md">
                      <Title order={3}>{tx.application.applicant.title}</Title>
                      <FactGrid
                        cols={3}
                        facts={[
                          {
                            label: tx.application.applicant.applicant,
                            value: applicant.name,
                          },
                          {
                            label: tx.application.applicant.ogrn,
                            value: applicant.ogrn,
                          },
                          {
                            label: tx.application.applicant.director,
                            value: applicant.director,
                          },
                          {
                            label: tx.application.applicant.region,
                            value: applicant.region,
                          },
                          {
                            label: tx.application.applicant.revenue,
                            value: formatRub(applicant.annualRevenue),
                          },
                          {
                            label: tx.application.applicant.registeredAt,
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
                    error={
                      companyProfile.isError
                        ? companyProfile.error.message
                        : null
                    }
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
                        <Title order={3}>
                          {tx.application.decision.scoringTitle}
                        </Title>
                        <ScoreBreakdown scoring={app.scoring} />
                      </Stack>
                    </Card>
                    <Card>
                      <Stack gap="md">
                        <Title order={3}>
                          {tx.application.decision.rulesTitle}
                        </Title>
                        <Text size="sm" c="dimmed">
                          {tx.application.decision.explanation}
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
                        ? tx.application.decision.waitingSources
                        : tx.application.decision.noScoring
                    }
                  >
                    {tx.application.decision.waitingText}
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
            aria-label={tx.application.aria.summary}
          >
            <Summary app={app} />
            <RiskBlock app={app} />
            <Outcome app={app} />
            <div
              className={classes.asideFoot}
              data-alfi-target={armActionsTarget}
            >
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
