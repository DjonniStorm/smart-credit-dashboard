import { Button, Paper, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { CreditProduct } from "@repo/contracts/cabinet";
import type { NegotiationOption } from "@repo/contracts/negotiation";
import { formatRub } from "@repo/ui/money";

import { tx } from "@/shared/i18n";

import classes from "./negotiation-option-card.module.css";

const t = tx.negotiation;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={classes.fact}>
      <dt className={classes.factLabel}>{label}</dt>
      <dd className={classes.factValue}>{value}</dd>
    </div>
  );
}

function checksText(option: NegotiationOption) {
  return [
    t.baseChecks,
    ...option.extraChecks.map((c) => t.extraChecks[c]),
  ].join(", ");
}

function requestsText(option: NegotiationOption) {
  if (option.expectedRequests.length === 0) {
    return t.noRequests;
  }
  return option.expectedRequests.map((r) => t.requests[r]).join(", ");
}

/** Один вариант условий: цифры, проверки, запросы и срок решения. */
export function NegotiationOptionCard({
  option,
  product,
  currentPayment,
  applied,
  onApply,
}: {
  option: NegotiationOption;
  product: CreditProduct;
  currentPayment: number;
  applied: boolean;
  onApply: () => void;
}) {
  const diff = option.monthlyPayment - currentPayment;
  return (
    <Paper
      component="li"
      withBorder
      p="md"
      radius="md"
      className={classes.card}
      data-testid="negotiation-option"
    >
      <Stack gap="sm" h="100%">
        <div>
          <Text fw={700}>{t.tags[option.tag]}</Text>
          <Text size="sm" c="dimmed">
            {t.paymentDelta(diff, formatRub(Math.abs(diff)))}
          </Text>
        </div>
        <dl className={classes.facts}>
          <Fact label={t.facts.product} value={product.name} />
          <Fact label={t.facts.amount} value={formatRub(option.amount)} />
          <Fact
            label={t.facts.term}
            value={tx.common.months(option.termMonths)}
          />
          <Fact
            label={t.facts.rate}
            value={tx.common.ratePerYear(option.ratePercent)}
          />
          <Fact
            label={t.facts.payment}
            value={`${formatRub(option.monthlyPayment)} / мес.`}
          />
          <Fact
            label={t.facts.load}
            value={tx.common.percent(Math.round(option.debtLoad * 100))}
          />
          <Fact
            label={t.facts.collateral}
            value={option.collateral ?? t.noCollateral}
          />
          <Fact label={t.facts.checks} value={checksText(option)} />
          <Fact label={t.facts.requests} value={requestsText(option)} />
          <Fact
            label={t.facts.decision}
            value={t.decisionIn(
              option.decisionDays.min,
              option.decisionDays.max,
            )}
          />
        </dl>
        <Text size="xs" c="dimmed">
          {t.notApproval}
        </Text>
        <Button
          mt="auto"
          variant={applied ? "light" : "default"}
          leftSection={applied ? <IconCheck size={16} aria-hidden /> : null}
          onClick={onApply}
          aria-label={`${applied ? t.applied : t.apply}: ${t.tags[option.tag]}`}
        >
          {applied ? t.applied : t.apply}
        </Button>
      </Stack>
    </Paper>
  );
}
