import {
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCircleCheck, IconClock, IconLoader2 } from "@tabler/icons-react";
import Link from "next/link";

import type { Application } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";
import { ToneBadge } from "@repo/ui/tone-badge";

import {
  isCancelledByManager,
  isDeclinedByClient,
  isWithdrawnByClient,
} from "@/entities/application";
import { alfiTargets } from "@/features/alfi-assistant";
import { AnswerRequestForm } from "@/features/answer-request";
import { OfferDecision } from "@/features/decide-offer";
import { formatDate, tx } from "@/shared/i18n";

import classes from "./application-detail.module.css";

const t = tx.application;
export function StagePanel({ app }: { app: Application }) {
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
    return request ? (
      <div data-alfi-target={alfiTargets.nextStep}>
        <AnswerRequestForm app={app} request={request} />
      </div>
    ) : null;
  }

  if (
    (app.status === "counter_offer" || app.status === "approved") &&
    !app.deal &&
    decision?.offer
  ) {
    return (
      <div data-alfi-target={alfiTargets.offerDecision}>
        <OfferDecision
          app={app}
          offer={decision.offer}
          summary={decision.summary}
        />
      </div>
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
    const withdrawn = isWithdrawnByClient(app);
    const cancelledByManager = isCancelledByManager(app);
    const title = cancelledByManager
      ? t.rejected.cancelledByManagerTitle
      : withdrawn
        ? t.rejected.withdrawnTitle
        : declined
          ? t.rejected.declinedTitle
          : t.rejected.title;
    const text = cancelledByManager
      ? t.rejected.cancelledByManagerText
      : withdrawn
        ? t.rejected.withdrawnText
        : declined
          ? t.rejected.declinedText
          : decision?.summary;
    return (
      <Card>
        <Stack gap="md" align="flex-start">
          <Title order={2} size="h3">
            {title}
          </Title>
          <Text>{text}</Text>
          {!declined &&
            !withdrawn &&
            !cancelledByManager &&
            decision?.advice && (
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
