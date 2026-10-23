"use client";

import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useState } from "react";

import type {
  CreditProductId,
  EmployeeAction,
} from "@repo/contracts/application";
import { AmountInput } from "@repo/ui/amount-input";

import { productLabel } from "@/entities/application";
import type { ArmProduct } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

import { type DialogProps, ErrorLine } from "./shared";
import { useCounterTerms } from "./use-counter-terms";

export function CounterDialog({
  opened,
  app,
  products,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & {
  products: ArmProduct[];
  onSubmit: (action: EmployeeAction) => void;
}) {
  const {
    productId,
    setProductId,
    amount,
    setAmount,
    term,
    setTerm,
    rate,
    setRate,
    product,
    amountInvalid,
    termInvalid,
    rateInvalid,
    termNum,
    rateNum,
  } = useCounterTerms(app, products);
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Предложить другие условия"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (
            !product ||
            amountInvalid ||
            termInvalid ||
            rateInvalid ||
            !comment.trim()
          ) {
            return;
          }
          onSubmit({
            type: "counter_offer",
            terms: {
              productId,
              amount: Number(amount),
              termMonths: termNum,
              ratePct: rateNum,
            },
            comment: comment.trim(),
          });
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Клиент просил {formatRub(app.request.amount)} на{" "}
            {app.request.termMonths} мес. ({productLabel[app.request.productId]}
            ). Поля заполнены по рекомендации системы.
          </Text>
          <Select
            label="Продукт"
            data={products.map((p) => ({ value: p.id, label: p.name }))}
            value={productId}
            onChange={(v) => v && setProductId(v as CreditProductId)}
            allowDeselect={false}
          />
          {product && (
            <AmountInput
              label="Сумма"
              min={product.minAmount}
              max={product.maxAmount}
              value={amount}
              onChange={setAmount}
              onBlur={() => setTouched(true)}
              showError={touched}
            />
          )}
          <Group grow align="flex-start">
            <NumberInput
              label="Срок"
              suffix=" мес."
              value={term}
              onChange={setTerm}
              min={1}
              error={
                touched && termInvalid && product
                  ? `От ${product.minTermMonths} до ${product.maxTermMonths} мес.`
                  : null
              }
            />
            <NumberInput
              label="Ставка"
              suffix=" %"
              decimalScale={1}
              value={rate}
              onChange={setRate}
              min={1}
              max={60}
              error={
                touched && rateInvalid ? "Укажите ставку больше нуля" : null
              }
            />
          </Group>
          <Textarea
            label="Почему такие условия"
            description="Клиент увидит эту причину в кабинете"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            error={touched && !comment.trim() ? "Напишите причину" : null}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending} disabled={!product}>
              Отправить клиенту
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
