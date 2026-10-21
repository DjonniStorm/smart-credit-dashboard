"use client";

import {
  Alert,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";

import type { Application, OfferTerms } from "@repo/contracts/cabinet";
import { ApplicationStatusBadge } from "@repo/ui/application-status";
import { formatRub } from "@repo/ui/money";

import { useAcceptOffer, useDeclineOffer } from "@/entities/application";
import { tx } from "@/shared/i18n";

import classes from "./offer-decision.module.css";

const t = tx.application.offer;

/** Решение банка с условиями: принять или отказаться. */
export function OfferDecision({
  app,
  offer,
  summary,
}: {
  app: Application;
  offer: OfferTerms;
  summary: string;
}) {
  const accept = useAcceptOffer(app.id);
  const decline = useDeclineOffer(app.id);
  const counter = app.status === "counter_offer";

  const rows: { label: string; was: string | null; now: string }[] = [
    {
      label: t.amount,
      was: formatRub(app.amount),
      now: formatRub(offer.amount),
    },
    {
      label: t.term,
      was: tx.common.months(app.termMonths),
      now: tx.common.months(offer.termMonths),
    },
    { label: t.rate, was: null, now: tx.common.ratePerYear(offer.ratePercent) },
    { label: t.payment, was: null, now: formatRub(offer.monthlyPayment) },
  ];

  function confirmDecline() {
    modals.openConfirmModal({
      title: t.declineConfirmTitle,
      children: <Text size="sm">{t.declineConfirmText}</Text>,
      labels: { confirm: t.declineConfirm, cancel: t.declineCancel },
      confirmProps: { color: "red" },
      onConfirm: () => decline.mutate(),
    });
  }

  const error = accept.error ?? decline.error;

  return (
    <Paper withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Title order={2} size="h3">
            {counter ? t.counterTitle : t.approvedTitle}
          </Title>
          <ApplicationStatusBadge status={app.status} />
        </Group>
        <Text>{summary}</Text>
        <Text className={classes.amount}>{formatRub(offer.amount)}</Text>

        <Table.ScrollContainer minWidth={420}>
          <Table className={classes.table}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th />
                {counter && <Table.Th>{t.requested}</Table.Th>}
                <Table.Th>{t.offered}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => {
                const changed = counter && r.was !== null && r.was !== r.now;
                return (
                  <Table.Tr key={r.label} data-changed={changed || undefined}>
                    <Table.Th scope="row" fw={400} c="dimmed">
                      {r.label}
                    </Table.Th>
                    {counter && (
                      <Table.Td className={changed ? classes.was : undefined}>
                        {r.was ?? ""}
                      </Table.Td>
                    )}
                    <Table.Td fw={changed ? 600 : undefined}>{r.now}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {error && (
          <Alert color="red" role="alert" title={t.acceptError}>
            {error.message}
          </Alert>
        )}

        <Text size="sm" c="dimmed">
          {t.declineHint}
        </Text>
        <Group gap="sm">
          <Button
            onClick={() => accept.mutate()}
            loading={accept.isPending}
            disabled={decline.isPending}
          >
            {t.accept}
          </Button>
          <Button
            variant="subtle"
            onClick={confirmDecline}
            loading={decline.isPending}
            disabled={accept.isPending}
          >
            {t.decline}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
