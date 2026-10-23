"use client";

import {
  Badge,
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
import { formatRub } from "@repo/ui/money";

import { estimate } from "@/entities/product";

import classes from "./terms-sandbox.module.css";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function productOption(product: CreditProduct) {
  return `${product.name} · ${product.minTermMonths}–${product.maxTermMonths} мес.`;
}

/** Локальная песочница условий: не меняет заявку и не вызывает API. */
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
    setProductId(value);
    setAmount((current) => clamp(current, next.minAmount, next.maxAmount));
    setTermMonths((current) =>
      clamp(current, next.minTermMonths, next.maxTermMonths),
    );
  };

  return (
    <Card component="section" aria-labelledby="terms-sandbox-title">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Title order={2} size="h3" id="terms-sandbox-title">
              Песочница условий
            </Title>
            <Text size="sm" c="dimmed">
              Меняйте параметры и смотрите ориентир до отправки новой заявки.
            </Text>
          </div>
          <Badge variant="light" color="gray">
            Демо-режим
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Select
            label="Продукт"
            value={product.id}
            onChange={selectProduct}
            data={catalog.products.map((item) => ({
              value: item.id,
              label: productOption(item),
            }))}
          />
          <NumberInput
            label="Сумма"
            value={amount}
            onChange={(value) => setAmount(Number(value) || 0)}
            min={product.minAmount}
            max={product.maxAmount}
            step={50_000}
            thousandSeparator=" "
            suffix=" ₽"
          />
          <NumberInput
            label="Срок"
            value={termMonths}
            onChange={(value) => setTermMonths(Number(value) || 0)}
            min={product.minTermMonths}
            max={product.maxTermMonths}
            suffix=" мес."
          />
        </SimpleGrid>
        <div className={classes.result}>
          <Group justify="space-between" align="flex-end" gap="md">
            <div>
              <Text size="sm" c="dimmed">
                Ориентировочный платёж
              </Text>
              <Text className={classes.payment}>
                {formatRub(result.payment)} / мес.
              </Text>
            </div>
            <div className={classes.ready}>
              <Text size="sm" c="dimmed">
                Готовность условий
              </Text>
              <Text fw={700}>{ready}/100</Text>
            </div>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Ставка от {result.rate}% годовых. Расчёт ориентировочный и не
            является обещанием одобрения; параметры заявки не изменены.
          </Text>
        </div>
      </Stack>
    </Card>
  );
}
