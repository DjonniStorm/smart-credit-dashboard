"use client";

import {
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Application } from "@repo/contracts/cabinet";
import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { Marker } from "@repo/ui/marker";
import { StageRail } from "@repo/ui/stage-rail";
import { StateBlock } from "@repo/ui/state-block";

import {
  ApplicationFacts,
  ApplicationHistory,
  HealthIndices,
  Roadmap,
  nextStepOf,
  stageOf,
  stages,
  useApplication,
} from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { alfiTargets } from "@/features/alfi-assistant";
import { SignContract } from "@/features/sign-contract";
import { UrgentRequest } from "@/features/urgent-request";
import { ApiError } from "@/shared/api/cabinet";
import { formatDate, formatDateTime, lx, tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import classes from "./application-detail.module.css";
import { DecisionCard } from "./decision-card";
import { StagePanel } from "./stage-panel";
import { TermsSandbox } from "./terms-sandbox";

const t = tx.application;

/** Загрузка заявки с состояниями: загрузка, не найдена, ошибка. */
function WithApplication({
  id,
  children,
}: {
  id: string;
  children: (app: Application) => ReactNode;
}) {
  const query = useApplication(id);
  if (query.isPending) return <StateBlock kind="loading" title={t.loading} />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <StateBlock
          kind="empty"
          title={t.notFoundTitle}
          action={
            <Button component={Link} href="/">
              {tx.common.toApplications}
            </Button>
          }
        >
          {t.notFoundText}
        </StateBlock>
      );
    }
    return <QueryError error={query.error} onRetry={() => query.refetch()} />;
  }
  return children(query.data);
}

function Header({ app, title }: { app: Application; title?: string }) {
  const product = useCatalog().data?.products.find(
    (p) => p.id === app.productId,
  );
  return (
    <Stack gap="xs">
      <Breadcrumbs separator="/">
        <Anchor component={Link} href="/" size="sm" c="dimmed">
          {lx.applications.crumbs}
        </Anchor>
        {title && (
          <Anchor
            component={Link}
            href={`/applications/${app.id}`}
            size="sm"
            c="dimmed"
          >
            {t.title(app.number)}
          </Anchor>
        )}
        <Text size="sm" c="dimmed" aria-current="page">
          {title ?? t.title(app.number)}
        </Text>
      </Breadcrumbs>
      <Group justify="space-between" align="flex-start" gap="sm">
        <Stack gap={4}>
          <Title order={1}>{title ?? t.title(app.number)}</Title>
          <Text c="dimmed">
            {product?.name}
            {product ? ", " : ""}
            {formatDate(app.createdAt)}
          </Text>
        </Stack>
        <ApplicationStatusBadge status={app.status} />
      </Group>
    </Stack>
  );
}

/** Страница заявки: движение по этапам, текущее действие, решение, история. */
export function ApplicationDetail({ id }: { id: string }) {
  return (
    <WithApplication id={id}>{(app) => <Detail app={app} />}</WithApplication>
  );
}

function Detail({ app }: { app: Application }) {
  const catalog = useCatalog();
  const product = catalog.data?.products.find((p) => p.id === app.productId);
  const stage = stageOf(app);
  // Закрытые заявки путь закончили: рельса и карта не показывают будущие этапы.
  const railStages =
    app.status === "rejected"
      ? stages.slice(0, Math.min(stage.current, stages.length - 1) + 1)
      : stages;

  return (
    <Stack gap="lg">
      <Header app={app} />

      <HealthIndices app={app} />

      <UrgentRequest app={app} />

      {catalog.data && <TermsSandbox app={app} catalog={catalog.data} />}

      <div className={classes.layout}>
        <Stack gap="lg" className={classes.main}>
          <Stack gap="lg" id="next-step" style={{ scrollMarginTop: 72 }}>
            <Card component="section" aria-labelledby="path-title">
              <Stack gap="md">
                <Title order={2} size="h3" id="path-title">
                  {lx.detail.path}
                </Title>
                <StageRail
                  stages={railStages}
                  current={stage.current}
                  waitingForClient={stage.waitingForClient}
                />
                <Text aria-live="polite">
                  {stage.waitingForClient ? (
                    <Marker>{nextStepOf(app)}</Marker>
                  ) : (
                    nextStepOf(app)
                  )}
                </Text>
                <Roadmap app={app} />
              </Stack>
            </Card>
            <StagePanel app={app} />
          </Stack>
          {app.requests
            .filter((r) => r.answer)
            .map((r) => (
              <Card key={r.id} className={classes.sunken}>
                <Stack gap={6}>
                  <Text fw={600}>{t.request.title}</Text>
                  <Text size="sm">{r.question}</Text>
                  <Text size="sm" c="dimmed">
                    {t.request.answered(formatDateTime(r.answer!.answeredAt))}:{" "}
                    {r.answer!.text}
                    {r.answer!.documents.length > 0 &&
                      ` (${r.answer!.documents.map((d) => d.name).join(", ")})`}
                  </Text>
                </Stack>
              </Card>
            ))}
          <div data-alfi-target={alfiTargets.decision}>
            <DecisionCard app={app} />
          </div>
        </Stack>
        <Stack gap="lg" className={classes.aside}>
          <Card>
            <ApplicationFacts app={app} product={product} />
          </Card>
          <Card>
            <ApplicationHistory events={app.events} />
          </Card>
        </Stack>
      </div>
    </Stack>
  );
}

/** Страница подписания: та же загрузка заявки, свой заголовок. */
export function ApplicationSigning({ id }: { id: string }) {
  return (
    <WithApplication id={id}>
      {(app) => (
        <Stack gap="lg" maw={880}>
          <Header app={app} title={tx.sign.title} />
          <Text maw={640}>{tx.sign.lead}</Text>
          <SignContract app={app} />
          <div>
            <Button
              component={Link}
              href={`/applications/${app.id}`}
              variant="subtle"
            >
              {tx.sign.toApplication}
            </Button>
          </div>
        </Stack>
      )}
    </WithApplication>
  );
}
