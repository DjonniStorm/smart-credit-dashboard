import { useState } from "react";

import type { Application, CreditProductId } from "@repo/contracts/application";

import type { ArmProduct } from "@/shared/api/arm";
import { amountError } from "@/shared/lib/money";

/** Условия встречного предложения: начальные значения из решения или запроса и их проверка. */
export function useCounterTerms(app: Application, products: ArmProduct[]) {
  const requestedProduct = products.find((p) => p.id === app.request.productId);
  const base = app.decision?.terms ?? {
    productId: app.request.productId,
    amount: app.request.amount,
    termMonths: app.request.termMonths,
    ratePct: requestedProduct?.ratePct ?? "",
  };
  const [productId, setProductId] = useState<CreditProductId>(base.productId);
  const [amount, setAmount] = useState<number | string>(base.amount);
  const [term, setTerm] = useState<number | string>(base.termMonths);
  const [rate, setRate] = useState<number | string>(base.ratePct);

  const product = products.find((p) => p.id === productId);
  const amountInvalid = product
    ? amountError(amount, product.minAmount, product.maxAmount)
    : null;
  const rateNum = Number(rate);
  const rateInvalid = !(rateNum > 0);
  const termNum = Number(term);
  const termInvalid =
    product &&
    (!termNum ||
      termNum < product.minTermMonths ||
      termNum > product.maxTermMonths);

  return {
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
  };
}
