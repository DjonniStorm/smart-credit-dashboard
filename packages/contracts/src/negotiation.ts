// Симулятор переговоров: чистый детерминированный расчёт вариантов условий
// под приоритет клиента. Ничего не создаёт и не обещает одобрение: это
// ориентир по правилам прототипа, те же пороги использует мок-решение банка.
import type { CreditProduct, CreditPurpose, Financials } from "./cabinet.js";

/** Доля платежей по долгам в месячном обороте, выше которой банк снижает сумму. */
export const MAX_DEBT_LOAD = 0.35;
/** Кредит не больше этой доли годовой выручки. */
export const MAX_AMOUNT_TO_REVENUE = 0.5;
/** Выше этой суммы заявку смотрит менеджер, а не только автоматические правила. */
export const MANAGER_REVIEW_AMOUNT = 5_000_000;
/** Выше этой доли годовой выручки банк просит подтвердить выручку отчётностью. */
export const REVENUE_PROOF_RATIO = 0.3;
/** Максимальная сумма, на которой не нужен ручной просмотр и допзапросы по сумме. */
export const FAST_TRACK_AMOUNT = 3_000_000;

const AMOUNT_STEP = 10_000;
const MAX_OPTIONS = 3;

export const negotiationPriorities = [
  "amount",
  "term",
  "speed",
  "product",
  "collateral",
] as const;
export type NegotiationPriority = (typeof negotiationPriorities)[number];

/** Почему вариант попал в подборку: по тегу кабинет выбирает заголовок. */
export type NegotiationTag =
  | "amount_max"
  | "amount_long_term"
  | "term_longest"
  | "term_balanced"
  | "term_shortest"
  | "speed_fast"
  | "product_alt"
  | "collateral_none"
  | "collateral_lower_rate";

/** Проверки сверх базовых (ЕГРЮЛ, БКИ, ФНС), которые появятся у варианта. */
export type ExtraCheck = "collateral_review" | "manager_review";

/** Запросы, которые банк, скорее всего, пришлёт клиенту. */
export type ExpectedRequest =
  "collateral_documents" | "turnover_statement" | "reporting";

export interface NegotiationOption {
  tag: NegotiationTag;
  productId: string;
  amount: number;
  termMonths: number;
  ratePercent: number;
  monthlyPayment: number;
  /** Доля платежей по долгам с этим кредитом в месячном обороте. */
  debtLoad: number;
  collateral: string | null;
  extraChecks: ExtraCheck[];
  expectedRequests: ExpectedRequest[];
  /** Ориентир срока решения в рабочих днях. */
  decisionDays: { min: number; max: number };
}

export interface NegotiationInput {
  priority: NegotiationPriority;
  purpose: CreditPurpose;
  /** Параметры, которые сейчас стоят в песочнице. */
  current: { productId: string; amount: number; termMonths: number };
  products: CreditProduct[];
  keyRate: number;
  financials: Financials;
}

/** Аннуитетный платёж, ₽ в месяц. */
export function monthlyPayment(
  amount: number,
  termMonths: number,
  ratePercent: number,
): number {
  const r = ratePercent / 100 / 12;
  if (r === 0) {
    return Math.round(amount / termMonths);
  }
  return Math.round((amount * r) / (1 - (1 + r) ** -termMonths));
}

/** Сумма кредита, которую обслуживает платёж payment при ставке и сроке. */
export function amountForPayment(
  payment: number,
  termMonths: number,
  ratePercent: number,
): number {
  const r = ratePercent / 100 / 12;
  if (r === 0) {
    return payment * termMonths;
  }
  return payment * ((1 - (1 + r) ** -termMonths) / r);
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const floorToStep = (value: number) =>
  Math.floor(value / AMOUNT_STEP) * AMOUNT_STEP;

/** Наибольшая сумма продукта, которая проходит по выручке и нагрузке на оборот. */
function maxAllowedAmount(
  product: CreditProduct,
  termMonths: number,
  ratePercent: number,
  financials: Financials,
): number {
  const paymentRoom = Math.max(
    0,
    financials.avgMonthlyTurnover * MAX_DEBT_LOAD -
      financials.monthlyDebtPayments,
  );
  return Math.min(
    product.maxAmount,
    floorToStep(financials.revenueLastYear * MAX_AMOUNT_TO_REVENUE),
    floorToStep(amountForPayment(paymentRoom, termMonths, ratePercent)),
  );
}

function debtLoad(payment: number, financials: Financials): number {
  if (financials.avgMonthlyTurnover <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return (
    (financials.monthlyDebtPayments + payment) / financials.avgMonthlyTurnover
  );
}

function buildOption(
  tag: NegotiationTag,
  product: CreditProduct,
  amount: number,
  termMonths: number,
  input: NegotiationInput,
): NegotiationOption | null {
  const term = clamp(termMonths, product.minTermMonths, product.maxTermMonths);
  const ratePercent = input.keyRate + product.spreadPp;
  const allowed = maxAllowedAmount(
    product,
    term,
    ratePercent,
    input.financials,
  );
  const finalAmount = Math.min(
    clamp(amount, product.minAmount, product.maxAmount),
    allowed,
  );
  if (finalAmount < product.minAmount) {
    return null;
  }
  const payment = monthlyPayment(finalAmount, term, ratePercent);

  const extraChecks: ExtraCheck[] = [];
  const expectedRequests: ExpectedRequest[] = [];
  let days = 1;
  if (product.collateral) {
    extraChecks.push("collateral_review");
    expectedRequests.push("collateral_documents");
    days += 2;
  }
  if (finalAmount > MANAGER_REVIEW_AMOUNT) {
    extraChecks.push("manager_review");
    expectedRequests.push("turnover_statement");
    days += 1;
  }
  if (finalAmount > input.financials.revenueLastYear * REVENUE_PROOF_RATIO) {
    expectedRequests.push("reporting");
  }

  return {
    tag,
    productId: product.id,
    amount: finalAmount,
    termMonths: term,
    ratePercent,
    monthlyPayment: payment,
    debtLoad: debtLoad(payment, input.financials),
    collateral: product.collateral,
    extraChecks,
    expectedRequests,
    decisionDays: { min: days, max: days + 1 },
  };
}

type Candidate = NegotiationOption | null | undefined;

function present(candidates: Candidate[]): NegotiationOption[] {
  return candidates.filter(
    (candidate): candidate is NegotiationOption => candidate !== null,
  );
}

function sameTerms(a: NegotiationOption, b: NegotiationOption): boolean {
  return (
    a.productId === b.productId &&
    a.amount === b.amount &&
    a.termMonths === b.termMonths
  );
}

/** Убирает повторы и копии текущих условий, оставляет до трёх вариантов. */
function finalize(
  options: NegotiationOption[],
  input: NegotiationInput,
): NegotiationOption[] {
  const result: NegotiationOption[] = [];
  for (const option of options) {
    const isCurrent =
      option.productId === input.current.productId &&
      option.amount === input.current.amount &&
      option.termMonths === input.current.termMonths;
    if (isCurrent || result.some((seen) => sameTerms(seen, option))) {
      continue;
    }
    result.push(option);
  }
  return result.slice(0, MAX_OPTIONS);
}

function suggestForAmount(
  input: NegotiationInput,
  product: CreditProduct,
): NegotiationOption[] {
  const sameProduct = present([
    buildOption(
      "amount_max",
      product,
      product.maxAmount,
      input.current.termMonths,
      input,
    ),
    buildOption(
      "amount_long_term",
      product,
      product.maxAmount,
      product.maxTermMonths,
      input,
    ),
  ]);
  const others = present(
    input.products
      .filter(
        (item) =>
          item.id !== product.id && item.purposes.includes(input.purpose),
      )
      .map((item) =>
        buildOption(
          "product_alt",
          item,
          item.maxAmount,
          input.current.termMonths,
          input,
        ),
      ),
  ).filter(
    (option) =>
      option.amount > Math.max(...sameProduct.map((o) => o.amount), 0),
  );
  return [...sameProduct, ...others]
    .filter((option) => option.amount > input.current.amount)
    .sort((a, b) => b.amount - a.amount);
}

function suggestForTerm(
  input: NegotiationInput,
  product: CreditProduct,
): NegotiationOption[] {
  const { amount } = input.current;
  const shortestFeasible = present(
    Array.from(
      { length: product.maxTermMonths - product.minTermMonths + 1 },
      (_, index) => product.minTermMonths + index,
    ).map((term) => buildOption("term_shortest", product, amount, term, input)),
  ).find(
    (option) =>
      option.amount === clamp(amount, product.minAmount, product.maxAmount),
  );
  const longest = buildOption(
    "term_longest",
    product,
    amount,
    product.maxTermMonths,
    input,
  );
  const balanced =
    shortestFeasible && longest
      ? buildOption(
          "term_balanced",
          product,
          amount,
          Math.round((shortestFeasible.termMonths + longest.termMonths) / 2),
          input,
        )
      : null;
  return present([longest, balanced, shortestFeasible]);
}

function suggestForSpeed(
  input: NegotiationInput,
  product: CreditProduct,
): NegotiationOption[] {
  const { amount, termMonths } = input.current;
  const currentDays = buildOption(
    "speed_fast",
    product,
    amount,
    termMonths,
    input,
  )?.decisionDays.min;
  return present(
    input.products
      .filter((item) => item.collateral === null)
      .map((item) =>
        buildOption(
          "speed_fast",
          item,
          Math.min(amount, FAST_TRACK_AMOUNT),
          termMonths,
          input,
        ),
      ),
  )
    .filter(
      (option) =>
        currentDays === undefined || option.decisionDays.min < currentDays,
    )
    .sort(
      (a, b) => a.decisionDays.min - b.decisionDays.min || b.amount - a.amount,
    );
}

function suggestForProduct(
  input: NegotiationInput,
  product: CreditProduct,
): NegotiationOption[] {
  const others = input.products.filter((item) => item.id !== product.id);
  const fitting = others.filter((item) =>
    item.purposes.includes(input.purpose),
  );
  const pool = fitting.length > 0 ? fitting : others;
  return present(
    pool.map((item) =>
      buildOption(
        "product_alt",
        item,
        input.current.amount,
        input.current.termMonths,
        input,
      ),
    ),
  ).sort((a, b) => a.monthlyPayment - b.monthlyPayment);
}

function suggestForCollateral(input: NegotiationInput): NegotiationOption[] {
  const { amount, termMonths } = input.current;
  const built = present(
    input.products.map((item) =>
      buildOption(
        item.collateral === null ? "collateral_none" : "collateral_lower_rate",
        item,
        amount,
        termMonths,
        input,
      ),
    ),
  );
  const free = built
    .filter((option) => option.collateral === null)
    .sort((a, b) => b.amount - a.amount || a.ratePercent - b.ratePercent);
  const secured = built
    .filter((option) => option.collateral !== null)
    .sort((a, b) => a.ratePercent - b.ratePercent || b.amount - a.amount);
  return [...free.slice(0, 2), ...secured.slice(0, 1)];
}

/**
 * До трёх вариантов условий под выбранный приоритет. Пустой список значит,
 * что лучше текущих условий в рамках правил продуктов не нашлось.
 */
export function suggestNegotiationOptions(
  input: NegotiationInput,
): NegotiationOption[] {
  const product = input.products.find(
    (item) => item.id === input.current.productId,
  );
  if (!product) {
    return [];
  }
  const suggestions: Record<NegotiationPriority, NegotiationOption[]> = {
    amount: suggestForAmount(input, product),
    term: suggestForTerm(input, product),
    speed: suggestForSpeed(input, product),
    product: suggestForProduct(input, product),
    collateral: suggestForCollateral(input),
  };
  return finalize(suggestions[input.priority], input);
}
