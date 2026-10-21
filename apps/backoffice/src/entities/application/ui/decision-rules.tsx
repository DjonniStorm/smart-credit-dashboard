import { Group, List, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";

import type { CreditDecision } from "@repo/contracts/application";
import { ToneBadge } from "@repo/ui/tone-badge";

import { formatRub } from "@/shared/lib/money";

import { productLabel, recommendationLabel, ruleLabel } from "../model/labels";
import classes from "./panel.module.css";

const ruleIcon = {
  pass: IconCircleCheck,
  attention: IconAlertCircle,
  fail: IconCircleX,
};
const ruleColor = {
  pass: "var(--kk-success)",
  attention: "var(--kk-amber-ink)",
  fail: "var(--kk-danger)",
};

const recommendationTone = {
  approve: "success",
  counter_offer: "action",
  request_info: "action",
  reject: "danger",
} as const;

/** Кредитное решение: правила продукта и что из них следует. Решает сотрудник. */
export function DecisionRules({ decision }: { decision: CreditDecision }) {
  const Icon =
    ruleIcon[
      decision.recommendation === "approve"
        ? "pass"
        : decision.recommendation === "reject"
          ? "fail"
          : "attention"
    ];
  return (
    <Stack gap="md">
      <Stack gap="xs" className={classes.panel}>
        <Group gap="sm" justify="space-between" align="flex-start">
          <Text fw={600}>Рекомендация системы</Text>
          <ToneBadge
            tone={recommendationTone[decision.recommendation]}
            icon={Icon}
          >
            {recommendationLabel[decision.recommendation]}
          </ToneBadge>
        </Group>
        <Text size="sm">{decision.explanation}</Text>
        {decision.terms && (
          <Text size="sm" className={classes.num}>
            {productLabel[decision.terms.productId]}:{" "}
            <Text span fw={600}>
              {formatRub(decision.terms.amount)}
            </Text>{" "}
            на {decision.terms.termMonths} мес. под {decision.terms.ratePct} %
          </Text>
        )}
      </Stack>
      <List spacing="xs" listStyleType="none" aria-label="Правила продукта">
        {decision.rules.map((r) => {
          const RuleIcon = ruleIcon[r.outcome];
          return (
            <List.Item key={r.id}>
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <RuleIcon
                  size={20}
                  stroke={1.75}
                  color={ruleColor[r.outcome]}
                  aria-label={ruleLabel[r.outcome]}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <Stack gap={0}>
                  <Text size="sm">{r.label}</Text>
                  <Text size="sm" c="dimmed">
                    {r.detail}
                  </Text>
                </Stack>
              </Group>
            </List.Item>
          );
        })}
      </List>
    </Stack>
  );
}
