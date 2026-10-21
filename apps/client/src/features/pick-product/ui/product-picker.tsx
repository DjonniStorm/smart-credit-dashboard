"use client";

import {
  Button,
  Group,
  NumberInput,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

import type { CreditPurpose } from "@repo/contracts/cabinet";
import { AmountInput } from "@repo/ui/amount-input";
import { amountError, formatRub } from "@repo/ui/money";
import { StateBlock } from "@repo/ui/state-block";

import {
  estimate,
  fitsPurpose,
  purposes,
  useCatalog,
} from "@/entities/product";
import { formatDate, tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import classes from "./product-picker.module.css";

const t = tx.products;
const LIMITS = { min: 100_000, max: 30_000_000 };

/** Подбор продукта: цель, сумма и срок, затем подходящие продукты с платежом. */
export function ProductPicker() {
  const catalog = useCatalog();
  const [purpose, setPurpose] = useState<CreditPurpose>("working_capital");
  const [amount, setAmount] = useState<number | string>(1_500_000);
  const [amountTouched, setAmountTouched] = useState(false);
  const [term, setTerm] = useState<number | string>(12);

  const amountOk = !amountError(amount, LIMITS.min, LIMITS.max);
  const termNum = Math.min(60, Math.max(1, Number(term) || 12));

  let results;
  if (catalog.isPending) {
    results = <StateBlock kind="loading" title={t.loading} />;
  } else if (catalog.isError) {
    results = (
      <QueryError error={catalog.error} onRetry={() => catalog.refetch()} />
    );
  } else {
    const { keyRate, keyRateDate } = catalog.data;
    const amountNum = Number(amount);
    const list = catalog.data.products
      .filter((p) => fitsPurpose(p, purpose))
      .filter((p) => !amountOk || amountNum <= p.maxAmount);
    results = (
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t.rateNote(keyRate, formatDate(keyRateDate))}
        </Text>
        {list.length === 0 ? (
          <StateBlock kind="empty" title={t.noneTitle}>
            {t.noneText}
          </StateBlock>
        ) : (
          <>
            <Title order={2} size="h3">
              {t.resultsTitle(list.length)}
            </Title>
            {list.map((p) => {
              const e = estimate(
                p,
                keyRate,
                amountOk ? amountNum : p.minAmount,
                termNum,
              );
              const query = new URLSearchParams({
                product: p.id,
                purpose,
                amount: String(amountOk ? amountNum : p.minAmount),
                term: String(termNum),
              });
              return (
                <Paper key={p.id} withBorder radius="lg" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={3}>{p.name}</Title>
                      <Text c="dimmed" maw={640}>
                        {p.description}
                      </Text>
                    </div>
                    <SimpleGrid
                      cols={{ base: 2, sm: 4 }}
                      spacing="md"
                      component="dl"
                      m={0}
                    >
                      <Fact
                        label={t.rate}
                        value={tx.common.ratePerYear(e.rate)}
                      />
                      <Fact
                        label={t.payment}
                        value={
                          amountOk
                            ? t.paymentApprox(formatRub(e.payment))
                            : t.paymentNeedsAmount
                        }
                      />
                      <Fact
                        label={t.limits}
                        value={t.limitsValue(
                          formatRub(p.minAmount),
                          formatRub(p.maxAmount),
                          p.minTermMonths,
                          p.maxTermMonths,
                        )}
                      />
                      <Fact
                        label={t.collateral}
                        value={p.collateral ?? t.noCollateral}
                      />
                    </SimpleGrid>
                    {amountOk && e.clamped && (
                      <Text size="sm" c="dimmed">
                        {t.outOfLimits}
                      </Text>
                    )}
                    <Group>
                      <Button
                        component={Link}
                        href={`/applications/new?${query.toString()}`}
                      >
                        {t.apply}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </>
        )}
      </Stack>
    );
  }

  return (
    <div className={classes.layout}>
      <Stack gap="lg" className={classes.form}>
        <Radio.Group
          label={t.purposeLabel}
          value={purpose}
          onChange={(v) => setPurpose(v as CreditPurpose)}
        >
          <Stack gap="xs" mt="xs">
            {purposes.map((p) => (
              <Radio.Card
                key={p}
                value={p}
                radius="md"
                className={classes.purpose}
              >
                <Group wrap="nowrap" align="flex-start" gap="sm">
                  <Radio.Indicator mt={2} />
                  <div>
                    <Text fw={500}>{tx.purposes[p].label}</Text>
                    <Text size="sm" c="dimmed">
                      {tx.purposes[p].hint}
                    </Text>
                  </div>
                </Group>
              </Radio.Card>
            ))}
          </Stack>
        </Radio.Group>
        <AmountInput
          label={t.amountLabel}
          min={LIMITS.min}
          max={LIMITS.max}
          value={amount}
          onChange={setAmount}
          onBlur={() => setAmountTouched(true)}
          showError={amountTouched}
        />
        <NumberInput
          label={t.termLabel}
          description={t.termDescription}
          suffix=" мес."
          min={1}
          max={60}
          value={term}
          onChange={setTerm}
          hideControls
          inputMode="numeric"
        />
      </Stack>
      <div className={classes.results} aria-live="polite">
        {results}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text component="dt" size="sm" c="dimmed">
        {label}
      </Text>
      <Text component="dd" m={0} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Text>
    </div>
  );
}
