"use client";

import {
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

import type {
  Application,
  CreditProduct,
  ProductCatalog,
} from "@repo/contracts/cabinet";
import type { NegotiationOption } from "@repo/contracts/negotiation";
import { formatRub } from "@repo/ui/money";

import { estimate } from "@/entities/product";
import { NegotiationSimulator } from "@/features/negotiation-sim";
import { tx } from "@/shared/i18n";

import classes from "./terms-sandbox.module.css";

const t = tx.termsSandbox;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function productOption(product: CreditProduct) {
  return t.productOption(
    product.name,
    product.minTermMonths,
    product.maxTermMonths,
  );
}

/** Блок условий заявки: параметры, расчёт платежа и варианты от банка. */
export function TermsSandbox({
  app,
  catalog,
}: {
  app: Application;
  catalog: ProductCatalog;
}) {
  const initialProduct =
    catalog.products.find((product) => product.id === app.productId) ??
    catalog.products[0];
  const [productId, setProductId] = useState(
    initialProduct?.id ?? app.productId,
  );
  const [amount, setAmount] = useState(app.amount);
  const [termMonths, setTermMonths] = useState(app.termMonths);
  const [appliedVariant, setAppliedVariant] =
    useState<NegotiationOption | null>(null);
  const product =
    catalog.products.find((item) => item.id === productId) ?? initialProduct;
  if (!initialProduct || !product) return null;
  const result = estimate(product, catalog.keyRate, amount, termMonths);
  const amountToRevenue = amount / Math.max(app.financials.revenueLastYear, 1);
  const ready = clamp(
    100 - (amountToRevenue > 0.5 ? 25 : 0) - (result.clamped ? 20 : 0),
    25,
    100,
  );

  const selectProduct = (value: string | null) => {
    if (!value) return;
    const next = catalog.products.find((item) => item.id === value);
    if (!next) return;
    setProductId(next.id);
    setAmount((current) => clamp(current, next.minAmount, next.maxAmount));
    setTermMonths((current) =>
      clamp(current, next.minTermMonths, next.maxTermMonths),
    );
    setAppliedVariant(null);
  };

  const applyOption = (option: NegotiationOption) => {
    setProductId(option.productId);
    setAmount(option.amount);
    setTermMonths(option.termMonths);
    setAppliedVariant(option);
  };

  return (
    <Card component="section" aria-labelledby="terms-sandbox-title">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Title order={2} size="h3" id="terms-sandbox-title">
              {t.title}
            </Title>
            <Text size="sm" c="dimmed">
              {t.lead}
            </Text>
          </div>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Select
            label={t.product}
            size="md"
            value={product.id}
            onChange={selectProduct}
            data={catalog.products.map((item) => ({
              value: item.id,
              label: productOption(item),
            }))}
          />
          <NumberInput
            label={t.amount}
            value={amount}
            onChange={(value) => {
              setAmount(Number(value) || 0);
              setAppliedVariant(null);
            }}
            min={product.minAmount}
            max={product.maxAmount}
            step={50_000}
            thousandSeparator=" "
            suffix={t.amountSuffix}
          />
          <NumberInput
            label={t.term}
            value={termMonths}
            onChange={(value) => {
              setTermMonths(Number(value) || 0);
              setAppliedVariant(null);
            }}
            min={product.minTermMonths}
            max={product.maxTermMonths}
            suffix={t.termSuffix}
          />
        </SimpleGrid>
        <div className={classes.result} aria-live="polite">
          <Group justify="space-between" align="flex-end" gap="md">
            <div>
              <Text size="sm" c="dimmed">
                {t.paymentTitle}
              </Text>
              <Text className={classes.payment}>
                {t.paymentValue(formatRub(result.payment))}
              </Text>
            </div>
            <div className={classes.ready}>
              <Text size="sm" c="dimmed">
                {t.readinessTitle}
              </Text>
              <Text fw={700}>{t.readinessScore(ready)}</Text>
            </div>
          </Group>
          {appliedVariant && (
            <Text size="sm" mt="xs" data-testid="applied-variant">
              {t.appliedBanner(
                catalog.products.find(
                  (item) => item.id === appliedVariant.productId,
                )?.name ?? appliedVariant.productId,
                formatRub(appliedVariant.amount),
                tx.common.months(appliedVariant.termMonths),
              )}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt="xs">
            {t.rateNote(result.rate)}
          </Text>
        </div>
        <NegotiationSimulator
          app={app}
          catalog={catalog}
          current={{ productId: product.id, amount, termMonths }}
          currentPayment={result.payment}
          onApply={applyOption}
        />
      </Stack>
    </Card>
  );
}
