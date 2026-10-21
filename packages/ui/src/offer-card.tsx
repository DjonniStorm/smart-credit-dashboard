"use client";

import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { motion } from "motion/react";
import { type JSX, useState } from "react";

import { AmountInput } from "./amount-input";
import { ApplicationStatusBadge } from "./application-status";
import { Marker } from "./marker";
import { amountError, formatRub } from "./money";
import { t } from "./motion";

export type OfferOutcome = "approved" | "counter_offer" | "rejected";

const titles: Record<OfferOutcome, string> = {
  approved: "Решение: одобрено",
  counter_offer: "Решение: одобрено на других условиях",
  rejected: "Решение: отказ",
};

/**
 * Решение банка по заявке. Изменившиеся условия показаны «было / стало»,
 * сумма стилем display и без анимации счётчика.
 */
export function OfferCard({
  outcome,
  amount,
  summary,
  changes,
  reason,
  minAmount,
  maxAmount,
}: {
  outcome: OfferOutcome;
  amount: number;
  summary: string;
  changes: { label: string; was?: string; now: string }[];
  reason: string;
  minAmount: number;
  maxAmount: number;
}): JSX.Element {
  const [step, setStep] = useState<
    "decide" | "accepted" | "proposing" | "proposed"
  >("decide");
  const [proposal, setProposal] = useState<number | string>("");
  const [proposalTouched, setProposalTouched] = useState(false);

  const badgeStatus =
    step === "accepted"
      ? "approved"
      : outcome === "approved"
        ? "approved"
        : outcome === "rejected"
          ? "rejected"
          : "counter_offer";

  function sendProposal() {
    setProposalTouched(true);
    if (!amountError(proposal, minAmount, maxAmount)) setStep("proposed");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={t.base}
    >
      <Card component="section">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" gap="sm">
            <Title order={3}>{titles[outcome]}</Title>
            <ApplicationStatusBadge status={badgeStatus} />
          </Group>
          <Text c="dimmed">{summary}</Text>

          {outcome !== "rejected" && (
            <Text
              fz={40}
              lh="44px"
              fw={600}
              style={{
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
              }}
            >
              {formatRub(amount)}
            </Text>
          )}

          {changes.length > 0 && (
            <SimpleGrid
              cols={3}
              spacing="md"
              verticalSpacing={6}
              aria-label="Что изменилось"
            >
              {changes.map((c) => (
                <FragmentRow key={c.label} {...c} />
              ))}
            </SimpleGrid>
          )}

          <Text size="sm" c="dimmed">
            Почему так: {reason}
          </Text>

          {outcome !== "rejected" && step === "decide" && (
            <Stack gap="sm">
              <Text>
                <Marker>Примите условия</Marker> или предложите свою сумму.
              </Text>
              <Group gap="sm">
                <Button onClick={() => setStep("accepted")}>
                  Принять условия
                </Button>
                <Button variant="default" onClick={() => setStep("proposing")}>
                  Предложить другую сумму
                </Button>
              </Group>
            </Stack>
          )}

          {step === "proposing" && (
            <Group align="flex-end" gap="sm">
              <AmountInput
                min={minAmount}
                max={maxAmount}
                value={proposal}
                onChange={setProposal}
                onBlur={() => setProposalTouched(true)}
                showError={proposalTouched}
                label="Ваша сумма"
                w={260}
              />
              <Button onClick={sendProposal}>Отправить банку</Button>
              <Button variant="subtle" onClick={() => setStep("decide")}>
                Отмена
              </Button>
            </Group>
          )}

          {step === "accepted" && (
            <Text>Условия приняты. Дальше: документы на подпись.</Text>
          )}
          {step === "proposed" && (
            <Text>
              Предложение отправлено. В прототипе банк на него пока не отвечает.
            </Text>
          )}
        </Stack>
      </Card>
    </motion.div>
  );
}

function FragmentRow({
  label,
  was,
  now,
}: {
  label: string;
  was?: string;
  now: string;
}): JSX.Element {
  return (
    <>
      <Text c="dimmed">{label}</Text>
      {was ? (
        <Text
          c="dimmed"
          td="line-through"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <VisuallyHidden>было </VisuallyHidden>
          {was}
        </Text>
      ) : (
        <Text c="dimmed">не менялось</Text>
      )}
      <Text style={{ fontVariantNumeric: "tabular-nums" }}>
        <VisuallyHidden>стало </VisuallyHidden>
        {now}
      </Text>
    </>
  );
}
