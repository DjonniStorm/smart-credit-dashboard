// Единый каталог кредитных продуктов. Источник: plan.md, раздел «Продукты и условия».
// Кабинет, АРМ и api берут продукты только отсюда, свои списки не заводят.
import { z } from "zod";

export const creditProductIdSchema = z.enum([
  "working_capital",
  "cash_gap",
  "equipment",
  "development",
]);
export type CreditProductId = z.infer<typeof creditProductIdSchema>;

/** Зачем нужны деньги. С цели начинается подбор продукта. */
export const creditPurposeSchema = creditProductIdSchema;
export type CreditPurpose = CreditProductId;

export const creditProductSchema = z.object({
  id: creditProductIdSchema,
  name: z.string(),
  purposes: z.array(creditPurposeSchema).min(1),
  description: z.string(),
  minAmount: z.number().int().positive(),
  maxAmount: z.number().int().positive(),
  minTermMonths: z.number().int().positive(),
  maxTermMonths: z.number().int().positive(),
  /** Спред продукта к ключевой ставке, п. п. */
  spreadPp: z.number(),
  /** Обеспечение; null — не требуется. Поле обязательное: «не указано» не бывает. */
  collateral: z.string().nullable(),
  /** Минимальный балл скоринга для одобрения без изменения условий. */
  minScore: z.number(),
  /** Предел долговой нагрузки: долг после выдачи к годовой выручке. */
  maxDebtLoad: z.number(),
  /** Минимальный срок жизни бизнеса, месяцев. */
  minBusinessAgeMonths: z.number().int(),
});
export type CreditProduct = z.infer<typeof creditProductSchema>;

/** Ключевая ставка — параметр конфигурации, не часть продукта. */
export const keyRateConfigSchema = z.object({
  /** % годовых. */
  value: z.number(),
  date: z.string(),
});
export type KeyRateConfig = z.infer<typeof keyRateConfigSchema>;

/**
 * Значение по умолчанию для прототипа: 14 % с решения Банка России от 11.09.2026.
 * Следующее заседание 23.10.2026, после него значение нужно сверить с cbr.ru.
 */
export const DEFAULT_KEY_RATE: KeyRateConfig = {
  value: 14,
  date: "2026-09-11",
};

/** Ставка = ключевая + спред продукта + надбавка грейда (может быть отрицательной), % годовых. */
export function productRate(
  product: Pick<CreditProduct, "spreadPp">,
  keyRate: number,
  gradeSurchargePp = 0,
): number {
  return keyRate + product.spreadPp + gradeSurchargePp;
}

export const CREDIT_PRODUCTS: readonly CreditProduct[] = [
  {
    id: "working_capital",
    name: "Оборотный кредит",
    purposes: ["working_capital"],
    description:
      "Закупка товара и сырья, оплата подрядчиков и аренды. Погашение равными платежами.",
    minAmount: 300_000,
    maxAmount: 10_000_000,
    minTermMonths: 3,
    maxTermMonths: 24,
    spreadPp: 5,
    collateral: null,
    minScore: 55,
    maxDebtLoad: 0.6,
    minBusinessAgeMonths: 12,
  },
  {
    id: "cash_gap",
    name: "Кассовый разрыв",
    purposes: ["cash_gap", "working_capital"],
    description:
      "Короткие деньги, пока покупатели не оплатили отгрузку. Небольшая сумма на срок до\u00A0года.",
    minAmount: 100_000,
    maxAmount: 3_000_000,
    minTermMonths: 1,
    maxTermMonths: 12,
    spreadPp: 6,
    collateral: null,
    minScore: 55,
    maxDebtLoad: 0.5,
    minBusinessAgeMonths: 6,
  },
  {
    id: "equipment",
    name: "Оборудование",
    purposes: ["equipment"],
    description:
      "Покупка станков, техники, транспорта. Купленное имущество становится залогом, поэтому ставка ниже.",
    minAmount: 500_000,
    maxAmount: 30_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    spreadPp: 3.5,
    collateral: "Приобретаемое оборудование или транспорт",
    minScore: 60,
    maxDebtLoad: 0.7,
    minBusinessAgeMonths: 12,
  },
  {
    id: "development",
    name: "Развитие",
    purposes: ["development"],
    description:
      "Открытие точки, ремонт, новое направление. Нужен поручитель: собственник бизнеса.",
    minAmount: 1_000_000,
    maxAmount: 20_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    spreadPp: 4.5,
    collateral: "Поручительство собственника",
    minScore: 65,
    maxDebtLoad: 0.65,
    minBusinessAgeMonths: 24,
  },
];

export const purposeNotInProductMessage =
  "Цель не входит в цели выбранного продукта";

export const amountOutOfProductMessage =
  "Сумма вне лимитов выбранного продукта";
export const termOutOfProductMessage = "Срок вне лимитов выбранного продукта";

/** Какие поля заявки нарушают каталог: цель, сумма или срок продукта. */
export function productViolations(input: {
  productId: CreditProductId;
  purpose: CreditPurpose;
  amount: number;
  termMonths: number;
}): { path: "purpose" | "amount" | "termMonths"; message: string }[] {
  const product = CREDIT_PRODUCTS.find((item) => item.id === input.productId);
  if (!product) {
    return [];
  }
  const violations: ReturnType<typeof productViolations> = [];
  if (!product.purposes.includes(input.purpose)) {
    violations.push({ path: "purpose", message: purposeNotInProductMessage });
  }
  if (input.amount < product.minAmount || input.amount > product.maxAmount) {
    violations.push({ path: "amount", message: amountOutOfProductMessage });
  }
  if (
    input.termMonths < product.minTermMonths ||
    input.termMonths > product.maxTermMonths
  ) {
    violations.push({ path: "termMonths", message: termOutOfProductMessage });
  }
  return violations;
}
