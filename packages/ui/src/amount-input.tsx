"use client";

import { NumberInput, type NumberInputProps } from "@mantine/core";
import { type JSX } from "react";

import { amountError } from "./money";

const plain = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/**
 * Поле суммы: разряды пробелом, суффикс ₽ (из темы), лимиты продукта.
 * Ошибку проверяем при уходе из поля и при отправке, не на каждый символ.
 */
export function AmountInput({
  min,
  max,
  showError,
  value,
  label = "Сколько нужно",
  description,
  ...props
}: Omit<NumberInputProps, "min" | "max" | "error"> & {
  min: number;
  max: number;
  /** Показать ошибку: после blur или попытки отправить форму. */
  showError: boolean;
}): JSX.Element {
  const error = showError ? amountError(value, min, max) : null;
  return (
    <NumberInput
      {...props}
      value={value}
      label={label}
      description={
        description ?? `От ${plain.format(min)} до ${plain.format(max)} ₽`
      }
      error={error}
      inputMode="numeric"
      hideControls
    />
  );
}
