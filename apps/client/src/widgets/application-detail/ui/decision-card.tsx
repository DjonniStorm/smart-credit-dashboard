import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
} from "@tabler/icons-react";

import type { Application, Decision } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";
import { type Tone, ToneBadge } from "@repo/ui/tone-badge";

import { DecisionFactors } from "@/entities/application";
import { formatDateTime, lx, tx } from "@/shared/i18n";

import classes from "./application-detail.module.css";

const t = tx.application;
const outcomeTone = {
  approved: { tone: "success", icon: IconCircleCheck },
  counter_offer: { tone: "action", icon: IconAlertCircle },
  rejected: { tone: "danger", icon: IconCircleX },
} satisfies Record<Decision["outcome"], { tone: Tone; icon: typeof IconClock }>;

/** Итоговое решение банка: исход, дата, объяснение и факторы. */
export function DecisionCard({ app }: { app: Application }) {
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
