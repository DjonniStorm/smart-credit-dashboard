"use client";

import {
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCircleCheck, IconClock, IconLoader2 } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Application } from "@repo/contracts/cabinet";
import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { Alfi, AlfiState } from "@repo/ui/alfi";
import { Marker } from "@repo/ui/marker";
import { formatRub } from "@repo/ui/money";
import { StageRail } from "@repo/ui/stage-rail";
import { StateBlock } from "@repo/ui/state-block";
import { ToneBadge } from "@repo/ui/tone-badge";

import {
  ApplicationFacts,
  ApplicationHistory,
  DecisionFactors,
  isDeclinedByClient,
  nextStepOf,
  stageOf,
  stages,
  useApplication,
} from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { AnswerRequestForm } from "@/features/answer-request";
import { OfferDecision } from "@/features/decide-offer";
import { SignContract } from "@/features/sign-contract";
import { ApiError } from "@/shared/api/cabinet";
import { formatDate, formatDateTime, tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import classes from "./application-detail.module.css";

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
  );
}

/** Страница заявки: путь, следующий шаг, панель текущего этапа, история. */
export function ApplicationDetail({ id }: { id: string }) {
  return (
    <WithApplication id={id}>{(app) => <Detail app={app} />}</WithApplication>
  );
}

function Detail({ app }: { app: Application }) {
  const catalog = useCatalog();
  const product = catalog.data?.products.find((p) => p.id === app.productId);
  const stage = stageOf(app);

  return (
    <Stack gap="xl">
      <Header app={app} />

      <Paper withBorder radius="lg" p="lg">
        <Stack gap="md">
          <StageRail
            stages={stages}
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
        </Stack>
      </Paper>

      <AlfiContext app={app} />

      <div className={classes.layout}>
        <Stack gap="xl" className={classes.main}>
          <StagePanel app={app} />
          {app.requests
            .filter((r) => r.answer)
            .map((r) => (
              <Paper key={r.id} radius="lg" p="lg" className={classes.sunken}>
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
              </Paper>
            ))}
          {app.decision && <DecisionFactors factors={app.decision.factors} />}
        </Stack>
        <Stack gap="xl" className={classes.aside}>
          <ApplicationFacts app={app} product={product} />
          <ApplicationHistory events={app.events} />
        </Stack>
      </div>
    </Stack>
  );
}

function AlfiContext({ app }: { app: Application }) {
  const state = clientAlfiState(app);
  return (
    <Paper withBorder radius="lg" p="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Alfi state={state} size={48} />
        <Stack gap={2}>
          <Text fw={600}>Альфи</Text>
          <Text size="sm">{clientAlfiMessage(app)}</Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function clientAlfiState(app: Application): AlfiState {
  if (app.status === "needs_client") {
    return AlfiState.NeedsAnswer;
  }
  if (app.status === "in_review") {
    return AlfiState.Checking;
  }
  if (app.status === "rejected") {
    return AlfiState.Attention;
  }
  if (app.status === "counter_offer" || app.status === "approved") {
    return AlfiState.Success;
  }
  if (app.status === "disbursed") {
    return AlfiState.Success;
  }
  return AlfiState.Greeting;
}

function clientAlfiMessage(app: Application): string {
  if (app.status === "needs_client") {
    const request = app.requests.find((item) => !item.answer);
    if (request?.question) {
      return request.question;
    }

    return "Банк ждёт уточнение по заявке.";
  }
  if (app.status === "in_review") {
    return `Проверяю данные заявки: ${app.checksPassed} из 3 проверок завершено.`;
  }
  if (app.status === "rejected") {
    return "Посмотрите причину решения и рекомендации для следующей заявки.";
  }
  if (app.status === "counter_offer" || app.status === "approved") {
    return "Условия готовы. Проверьте предложение и следующий шаг.";
  }
  if (app.status === "disbursed") {
    return "Выдача завершена. Здесь можно посмотреть условия кредита.";
  }
  return nextStepOf(app);
}

function StagePanel({ app }: { app: Application }) {
  const decision = app.decision;

  if (app.status === "in_review") {
    return (
      <Paper withBorder radius="lg" p="lg">
        <Stack gap="md">
          <Title order={2} size="h3">
            {t.review.title}
          </Title>
          <Stack gap="sm" component="ol" p={0} m={0} className={classes.checks}>
            {t.review.checks.map((label, i) => {
              const state =
                i < app.checksPassed
                  ? "done"
                  : i === app.checksPassed
                    ? "running"
                    : "waiting";
              return (
                <Group key={label} component="li" justify="space-between">
                  <Text>{label}</Text>
                  {state === "done" ? (
                    <ToneBadge tone="success" icon={IconCircleCheck}>
                      {t.review.done}
                    </ToneBadge>
                  ) : state === "running" ? (
                    <ToneBadge tone="neutral" icon={IconLoader2}>
                      {t.review.running}
                    </ToneBadge>
                  ) : (
                    <ToneBadge tone="neutral" icon={IconClock}>
                      {t.review.waiting}
                    </ToneBadge>
                  )}
                </Group>
              );
            })}
          </Stack>
          <Text size="sm" c="dimmed">
            {t.review.text}
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (app.status === "needs_client") {
    const request = app.requests.find((r) => !r.answer);
    return request ? (
      <AnswerRequestForm applicationId={app.id} request={request} />
    ) : null;
  }

  if (
    (app.status === "counter_offer" || app.status === "approved") &&
    !app.deal &&
    decision?.offer
  ) {
    return (
      <OfferDecision
        app={app}
        offer={decision.offer}
        summary={decision.summary}
      />
    );
  }

  if (app.deal?.stage === "signing") {
    return (
      <Paper withBorder radius="lg" p="lg">
        <Stack gap="sm" align="flex-start">
          <Title order={2} size="h3">
            {t.signing.title}
          </Title>
          <Text>{t.signing.text}</Text>
          <Button component={Link} href={`/applications/${app.id}/sign`}>
            {t.signing.go}
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (app.deal?.stage === "disbursing") {
    return (
      <Paper withBorder radius="lg" p="lg">
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Loader size={20} color="var(--mantine-color-text)" mt={4} />
          <Stack gap={4}>
            <Title order={2} size="h3">
              {t.disbursing.title}
            </Title>
            <Text>{t.disbursing.text}</Text>
          </Stack>
        </Group>
      </Paper>
    );
  }

  if (app.status === "disbursed" && app.deal) {
    const { terms, account, disbursedAt } = app.deal;
    const first = new Date(disbursedAt ?? app.updatedAt);
    first.setMonth(first.getMonth() + 1);
    const facts = [
      [t.disbursed.account, account],
      [t.disbursed.date, formatDate(disbursedAt ?? app.updatedAt)],
      [t.disbursed.payment, formatRub(terms.monthlyPayment)],
      [t.disbursed.firstPayment, formatDate(first.toISOString())],
    ];
    return (
      <Paper withBorder radius="lg" p="lg" className={classes.success}>
        <Stack gap="md">
          <Title order={2} size="h3">
            {t.disbursed.title}
          </Title>
          <div>
            <Text size="sm" c="dimmed">
              {t.disbursed.amount}
            </Text>
            <Text className={classes.amount}>{formatRub(terms.amount)}</Text>
          </div>
          <SimpleGrid cols={{ base: 1, xs: 2 }} component="dl" m={0}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <Text component="dt" size="sm" c="dimmed">
                  {label}
                </Text>
                <Text
                  component="dd"
                  m={0}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {value}
                </Text>
              </div>
            ))}
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {t.disbursed.text}
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (app.status === "rejected") {
    const declined = isDeclinedByClient(app);
    return (
      <Paper withBorder radius="lg" p="lg">
        <Stack gap="md" align="flex-start">
          <Title order={2} size="h3">
            {declined ? t.rejected.declinedTitle : t.rejected.title}
          </Title>
          <Text>{declined ? t.rejected.declinedText : decision?.summary}</Text>
          {!declined && decision?.advice && (
            <div>
              <Text fw={600}>{t.rejected.advice}</Text>
              <Text>{decision.advice}</Text>
            </div>
          )}
          <Button component={Link} href="/products" variant="default">
            {t.rejected.newApplication}
          </Button>
        </Stack>
      </Paper>
    );
  }

  return null;
}

/** Страница подписания: та же загрузка заявки, свой заголовок. */
export function ApplicationSigning({ id }: { id: string }) {
  return (
    <WithApplication id={id}>
      {(app) => (
        <Stack gap="xl">
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
