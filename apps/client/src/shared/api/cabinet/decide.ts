import type {
  Application,
  ClientRequest,
  CreditProduct,
  Decision,
  DecisionFactor,
  OfferTerms,
} from "@repo/contracts/cabinet";

import { externalChecks } from "./fixtures";

// Упрощённая кредитная логика прототипа: набор правил вместо модели.
// Каждое правило оставляет фактор с входным значением и источником,
// поэтому клиент видит, по каким данным принято решение.

/** Доля платежей по долгам в месячном обороте, выше которой банк снижает сумму. */
const MAX_DEBT_LOAD = 0.35;
/** Кредит не больше этой доли годовой выручки. */
const MAX_AMOUNT_TO_REVENUE = 0.5;
const MIN_BUSINESS_AGE_MONTHS = 6;
const MAX_TOLERATED_OVERDUE_DAYS = 30;

export function monthlyPayment(
  amount: number,
  termMonths: number,
  ratePercent: number,
): number {
  const r = ratePercent / 100 / 12;
  if (r === 0) return Math.round(amount / termMonths);
  return Math.round((amount * r) / (1 - (1 + r) ** -termMonths));
}

/** Сумма, которую обслуживает платёж payment при ставке и сроке. */
function amountForPayment(
  payment: number,
  termMonths: number,
  ratePercent: number,
): number {
  const r = ratePercent / 100 / 12;
  return payment * ((1 - (1 + r) ** -termMonths) / r);
}

function monthsBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso);
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const money = (n: number) => `${rub.format(n)} ₽`;

/** Округление суммы предложения вниз до 10 000 ₽. */
const floorAmount = (n: number) => Math.floor(n / 10_000) * 10_000;

export type Verdict =
  | { kind: "request"; request: Omit<ClientRequest, "id" | "createdAt"> }
  | { kind: "decision"; decision: Omit<Decision, "decidedAt"> };

export function decide(
  app: Application,
  product: CreditProduct,
  keyRate: number,
  now: Date,
): Verdict {
  const checks = externalChecks[app.company.inn] ?? {
    overdueDays: 0,
    activeLoans: 0,
    taxDebt: 0,
  };
  const factors: DecisionFactor[] = [];
  const reject = (summary: string, advice: string): Verdict => ({
    kind: "decision",
    decision: { outcome: "rejected", summary, offer: null, factors, advice },
  });

  const ageMonths = monthsBetween(app.company.registeredAt, now);
  factors.push({
    label: "Возраст бизнеса",
    value: `${ageMonths} мес.`,
    source: "ЕГРЮЛ/ЕГРИП",
    effect:
      ageMonths < MIN_BUSINESS_AGE_MONTHS
        ? "negative"
        : ageMonths >= 36
          ? "positive"
          : "neutral",
    note:
      ageMonths < MIN_BUSINESS_AGE_MONTHS
        ? `Нужно не меньше ${MIN_BUSINESS_AGE_MONTHS} месяцев работы.`
        : ageMonths >= 36
          ? "Больше трёх лет работы снижает риск."
          : "Достаточно для кредита.",
  });
  if (ageMonths < MIN_BUSINESS_AGE_MONTHS) {
    return reject(
      "Компания работает меньше полугода, по такой короткой истории банк не может оценить риск.",
      `Подайте заявку снова, когда бизнесу исполнится ${MIN_BUSINESS_AGE_MONTHS} месяцев.`,
    );
  }

  factors.push({
    label: "Кредитная история",
    value:
      checks.overdueDays === 0
        ? `Просрочек нет, действующих кредитов: ${checks.activeLoans}`
        : `Просрочка ${checks.overdueDays} дн., действующих кредитов: ${checks.activeLoans}`,
    source: "Бюро кредитных историй (заглушка)",
    effect: checks.overdueDays === 0 ? "positive" : "negative",
    note:
      checks.overdueDays === 0
        ? "Платежи по прошлым кредитам вовремя."
        : checks.overdueDays > MAX_TOLERATED_OVERDUE_DAYS
          ? `Просрочка дольше ${MAX_TOLERATED_OVERDUE_DAYS} дней: главный повод для отказа.`
          : "Короткая просрочка повышает ставку на 1 п. п.",
  });
  if (checks.overdueDays > MAX_TOLERATED_OVERDUE_DAYS) {
    return reject(
      `В кредитной истории есть просрочка ${checks.overdueDays} дней. С такой просрочкой банк сейчас не может выдать кредит.`,
      "Погасите просроченный долг и подайте заявку через 3 месяца: история обновится, и банк пересмотрит решение.",
    );
  }

  const answeredTax = app.requests.some(
    (r) => r.documentKind === "tax_certificate" && r.answer,
  );
  if (checks.taxDebt > 0) {
    factors.push({
      label: "Налоговая задолженность",
      value: answeredTax
        ? `${money(checks.taxDebt)}, клиент прислал пояснение`
        : money(checks.taxDebt),
      source: "ФНС «Прозрачный бизнес» (заглушка)",
      effect: answeredTax ? "neutral" : "negative",
      note: answeredTax
        ? "Пояснение принято, долг не влияет на решение."
        : "Без справки банк не может продолжить.",
    });
    if (!answeredTax) {
      return {
        kind: "request",
        request: {
          question: `По данным ФНС у вас долг по налогам ${money(checks.taxDebt)}. Пришлите справку об отсутствии задолженности или напишите, когда долг погашен.`,
          why: "Неоплаченный налог может привести к блокировке счёта, поэтому банк проверяет его до решения.",
          documentKind: "tax_certificate",
          answer: null,
        },
      };
    }
  } else {
    factors.push({
      label: "Налоговая задолженность",
      value: "Нет",
      source: "ФНС «Прозрачный бизнес» (заглушка)",
      effect: "positive",
      note: "Налоги уплачены.",
    });
  }

  let rate = keyRate + product.spreadPp;
  if (checks.overdueDays > 0) rate += 1;
  if (ageMonths >= 36 && checks.overdueDays === 0) rate -= 0.5;

  const { avgMonthlyTurnover, monthlyDebtPayments, revenueLastYear } =
    app.financials;
  const payment = monthlyPayment(app.amount, app.termMonths, rate);
  const load =
    avgMonthlyTurnover > 0
      ? (monthlyDebtPayments + payment) / avgMonthlyTurnover
      : Infinity;

  // Максимум по нагрузке считаем на самом длинном сроке продукта:
  // встречное предложение сначала растягивает срок, потом режет сумму.
  const termForOffer =
    load > MAX_DEBT_LOAD ? product.maxTermMonths : app.termMonths;
  const maxByLoad = amountForPayment(
    Math.max(0, avgMonthlyTurnover * MAX_DEBT_LOAD - monthlyDebtPayments),
    termForOffer,
    rate,
  );
  const maxByRevenue = revenueLastYear * MAX_AMOUNT_TO_REVENUE;
  const cap = floorAmount(Math.min(maxByLoad, maxByRevenue, product.maxAmount));

  factors.push({
    label: "Долговая нагрузка",
    value: `${pct.format(load * 100)} % оборота уйдёт на платежи`,
    source: "Анкета и обороты по счёту",
    effect: load <= MAX_DEBT_LOAD ? "positive" : "negative",
    note:
      load <= MAX_DEBT_LOAD
        ? `Не выше ${MAX_DEBT_LOAD * 100} %: платёж по силам.`
        : `Выше ${MAX_DEBT_LOAD * 100} %: платёж будет давить на оборот.`,
  });
  factors.push({
    label: "Сумма к выручке",
    value: `${pct.format((app.amount / Math.max(revenueLastYear, 1)) * 100)} % годовой выручки`,
    source: "Анкета",
    effect: app.amount <= maxByRevenue ? "positive" : ("negative" as const),
    note:
      app.amount <= maxByRevenue
        ? `Не больше ${MAX_AMOUNT_TO_REVENUE * 100} % выручки.`
        : `Больше ${MAX_AMOUNT_TO_REVENUE * 100} % выручки за год.`,
  });

  if (cap < product.minAmount) {
    return reject(
      "Текущие обороты не позволяют обслуживать даже минимальную сумму по этому продукту.",
      `Попробуйте продукт с меньшей минимальной суммой или подайте заявку, когда платежи по другим кредитам станут меньше.`,
    );
  }

  if (app.amount <= cap && load <= MAX_DEBT_LOAD) {
    const offer: OfferTerms = {
      amount: app.amount,
      termMonths: app.termMonths,
      ratePercent: rate,
      monthlyPayment: payment,
    };
    return {
      kind: "decision",
      decision: {
        outcome: "approved",
        summary: "Банк одобрил заявку на тех условиях, которые вы запросили.",
        offer,
        factors,
        advice: null,
      },
    };
  }

  const offerAmount = Math.min(app.amount, cap);
  const offer: OfferTerms = {
    amount: offerAmount,
    termMonths: termForOffer,
    ratePercent: rate,
    monthlyPayment: monthlyPayment(offerAmount, termForOffer, rate),
  };
  return {
    kind: "decision",
    decision: {
      outcome: "counter_offer",
      summary:
        offerAmount < app.amount
          ? "Банк готов выдать кредит, но меньшую сумму на более долгий срок, чтобы платёж не съедал оборот."
          : "Банк готов выдать всю сумму, но на более долгий срок, чтобы платёж был ниже.",
      offer,
      factors,
      advice: null,
    },
  };
}
