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
  CreditProduct,
  CreditPurpose,
  Financials,
  ProductCatalog,
} from "@repo/contracts/cabinet";
import type { NegotiationOption } from "@repo/contracts/negotiation";
import { formatRub } from "@repo/ui/money";

import { estimate } from "@/entities/product";
import {
  NegotiationSimulator,
  type SandboxTerms,
} from "@/features/negotiation-sim";
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

export interface TermsInput {
  purpose: CreditPurpose;
  productId: string;
  amount: number;
  termMonths: number;
  financials: Financials;
}

/**
 * Блок условий: параметры, расчёт платежа и варианты от банка. Начальные
 * значения берутся из terms один раз; правки уходят наружу через onTermsChange.
 */
export function TermsSandbox({
  terms,
  catalog,
  onTermsChange,
}: {
  terms: TermsInput;
  catalog: Pick<ProductCatalog, "products" | "keyRate">;
  onTermsChange?: (next: SandboxTerms) => void;
}) {
  const initialProduct =
    catalog.products.find((product) => product.id === terms.productId) ??
    catalog.products[0];
  const [productId, setProductId] = useState(
    initialProduct?.id ?? terms.productId,
  );
  const [amount, setAmount] = useState(terms.amount);
  const [termMonths, setTermMonths] = useState(terms.termMonths);
  const [appliedVariant, setAppliedVariant] =
    useState<NegotiationOption | null>(null);
  const product =
    catalog.products.find((item) => item.id === productId) ?? initialProduct;
  if (!initialProduct || !product) return null;
  const result = estimate(product, catalog.keyRate, amount, termMonths);
  const amountToRevenue =
    amount / Math.max(terms.financials.revenueLastYear, 1);
  const ready = clamp(
    100 - (amountToRevenue > 0.5 ? 25 : 0) - (result.clamped ? 20 : 0),
    25,
    100,
  );

  const update = (
    next: SandboxTerms,
    variant: NegotiationOption | null = null,
  ) => {
    setProductId(next.productId);
    setAmount(next.amount);
    setTermMonths(next.termMonths);
    setAppliedVariant(variant);
    onTermsChange?.(next);
  };

  const selectProduct = (value: string | null) => {
    if (!value) return;
    const next = catalog.products.find((item) => item.id === value);
    if (!next) return;
    update({
      productId: next.id,
      amount: clamp(amount, next.minAmount, next.maxAmount),
      termMonths: clamp(termMonths, next.minTermMonths, next.maxTermMonths),
    });
  };

  const applyOption = (option: NegotiationOption) => {
    update(
      {
        productId: option.productId,
        amount: option.amount,
        termMonths: option.termMonths,
      },
      option,
    );
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
            onChange={(value) =>
              update({
                productId: product.id,
                amount: Number(value) || 0,
                termMonths,
              })
            }
            min={product.minAmount}
            max={product.maxAmount}
            step={50_000}
            thousandSeparator=" "
            suffix={t.amountSuffix}
          />
          <NumberInput
            label={t.term}
            value={termMonths}
            onChange={(value) =>
              update({
                productId: product.id,
                amount,
                termMonths: Number(value) || 0,
              })
            }
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
          purpose={terms.purpose}
          financials={terms.financials}
          catalog={catalog}
          current={{ productId: product.id, amount, termMonths }}
          currentPayment={result.payment}
          onApply={applyOption}
        />
      </Stack>
    </Card>
  );
}
