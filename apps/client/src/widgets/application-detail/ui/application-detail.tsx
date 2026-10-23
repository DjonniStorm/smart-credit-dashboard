"use client";

import {
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconLoader2,
} from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Application, Decision } from "@repo/contracts/cabinet";
import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { Marker } from "@repo/ui/marker";
import { formatRub } from "@repo/ui/money";
import { StageRail } from "@repo/ui/stage-rail";
import { StateBlock } from "@repo/ui/state-block";
import { type Tone, ToneBadge } from "@repo/ui/tone-badge";

import {
  ApplicationFacts,
  ApplicationHistory,
  DecisionFactors,
  HealthIndices,
  isDeclinedByClient,
  nextStepOf,
  stageOf,
  stages,
  useApplication,
} from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { alfiTargets } from "@/features/alfi-assistant";
import { AnswerRequestForm } from "@/features/answer-request";
import { OfferDecision } from "@/features/decide-offer";
import { SignContract } from "@/features/sign-contract";
import { UrgentRequest } from "@/features/urgent-request";
import { ApiError } from "@/shared/api/cabinet";
import { formatDate, formatDateTime, lx, tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import classes from "./application-detail.module.css";
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

  return (
    <Stack gap="lg">
      <Header app={app} />

      <HealthIndices app={app} />

      <UrgentRequest app={app} />

      {catalog.data && <TermsSandbox app={app} catalog={catalog.data} />}

      <div className={classes.layout}>
        <Stack gap="lg" className={classes.main}>
          <Stack gap="lg" data-alfi-target={alfiTargets.nextStep}>
            <Card component="section" aria-labelledby="path-title">
              <Stack gap="md">
                <Title order={2} size="h3" id="path-title">
                  {lx.detail.path}
                </Title>
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

const outcomeTone = {
  approved: { tone: "success", icon: IconCircleCheck },
  counter_offer: { tone: "action", icon: IconAlertCircle },
  rejected: { tone: "danger", icon: IconCircleX },
} satisfies Record<Decision["outcome"], { tone: Tone; icon: typeof IconClock }>;

/** Итоговое решение банка: исход, дата, объяснение и факторы. */
function DecisionCard({ app }: { app: Application }) {
  const d = lx.detail;
  const decision = app.decision;
  // До принятия условий итог и условия показывает панель этапа выше.
  const detailed = Boolean(app.deal);
  return (
    <Card component="section" aria-labelledby="decision-title">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Title order={2} size="h3" id="decision-title">
              {d.decision}
            </Title>
            {decision && (
              <Text size="sm" c="dimmed">
                {d.decisionAt(formatDateTime(decision.decidedAt))}
              </Text>
            )}
          </div>
          {decision && (
            <ToneBadge
              tone={outcomeTone[decision.outcome].tone}
              icon={outcomeTone[decision.outcome].icon}
            >
              {d.outcome[decision.outcome]}
            </ToneBadge>
          )}
        </Group>
        {decision ? (
          <>
            {detailed && <Text>{decision.summary}</Text>}
            {detailed && decision.offer && (
              <SimpleGrid
                cols={{ base: 2, sm: 4 }}
                component="dl"
                m={0}
                className={classes.terms}
              >
                {(
                  [
                    [t.offer.amount, formatRub(decision.offer.amount)],
                    [t.offer.term, tx.common.months(decision.offer.termMonths)],
                    [
                      t.offer.rate,
                      tx.common.ratePerYear(decision.offer.ratePercent),
                    ],
                    [t.offer.payment, formatRub(decision.offer.monthlyPayment)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <Text component="dt" size="sm" c="dimmed">
                      {label}
                    </Text>
                    <Text component="dd" m={0} fw={600} className={classes.num}>
                      {value}
                    </Text>
                  </div>
                ))}
              </SimpleGrid>
            )}
            <DecisionFactors factors={decision.factors} />
          </>
        ) : (
          <Text c="dimmed">{d.noDecision}</Text>
        )}
      </Stack>
    </Card>
  );
}

function StagePanel({ app }: { app: Application }) {
  const decision = app.decision;

  if (app.status === "in_review") {
    return (
      <Card>
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
      </Card>
    );
  }

  if (app.status === "needs_client") {
    const request = app.requests.find((r) => !r.answer);
    return request ? <AnswerRequestForm app={app} request={request} /> : null;
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
      <Card>
        <Stack gap="sm" align="flex-start">
          <Title order={2} size="h3">
            {t.signing.title}
          </Title>
          <Text>{t.signing.text}</Text>
          <Button component={Link} href={`/applications/${app.id}/sign`}>
            {t.signing.go}
          </Button>
        </Stack>
      </Card>
    );
  }

  if (app.deal?.stage === "offer") {
    return (
      <Card>
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Loader size={20} color="var(--mantine-color-text)" mt={4} />
          <Stack gap={4}>
            <Title order={2} size="h3">
              {t.preparing.title}
            </Title>
            <Text>{t.preparing.text}</Text>
          </Stack>
        </Group>
      </Card>
    );
  }

  if (app.deal?.stage === "disbursing") {
    return (
      <Card>
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Loader size={20} color="var(--mantine-color-text)" mt={4} />
          <Stack gap={4}>
            <Title order={2} size="h3">
              {t.disbursing.title}
            </Title>
            <Text>{t.disbursing.text}</Text>
          </Stack>
        </Group>
      </Card>
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
      <Card className={classes.success}>
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
                <Text component="dd" m={0} className={classes.num}>
                  {value}
                </Text>
              </div>
            ))}
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {t.disbursed.text}
          </Text>
        </Stack>
      </Card>
    );
  }

  if (app.status === "rejected") {
    const declined = isDeclinedByClient(app);
    return (
      <Card>
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
      </Card>
    );
  }

  return null;
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
