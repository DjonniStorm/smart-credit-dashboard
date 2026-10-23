import type { CreditProduct, CreditPurpose } from "@repo/contracts/cabinet";

import { monthlyPayment } from "./monthly-payment";

export const purposes: CreditPurpose[] = [
  "working_capital",
  "cash_gap",
  "equipment",
  "development",
];

/** Базовая ставка продукта до проверки: ключевая + надбавка. */
export function baseRate(product: CreditProduct, keyRate: number): number {
  return keyRate + product.spreadPp;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Примерный платёж с поправкой на границы продукта. */
export function estimate(
  product: CreditProduct,
  keyRate: number,
  amount: number,
  termMonths: number,
) {
  const a = clamp(amount, product.minAmount, product.maxAmount);
  const t = clamp(termMonths, product.minTermMonths, product.maxTermMonths);
  const rate = baseRate(product, keyRate);
  return {
    rate,
    payment: monthlyPayment(a, t, rate),
    clamped: a !== amount || t !== termMonths,
  };
}

export function fitsPurpose(product: CreditProduct, purpose: CreditPurpose) {
  return product.purposes.includes(purpose);
}
