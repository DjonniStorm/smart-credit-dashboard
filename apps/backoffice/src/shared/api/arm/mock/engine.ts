// Упрощённая кредитная логика для мока. Здесь же её будет повторять api:
// скоринг даёт балл риска, правила продукта превращают его в рекомендацию.
import type {
  Application,
  CheckSource,
  CreditDecision,
  CreditProduct,
  DecisionRule,
  OfferTerms,
  Recommendation,
  RejectReason,
  ScoreFactor,
  ScoringResult,
  SourceCheck,
} from "@repo/contracts/application";

/** Ответы источников до того, как их увидит сотрудник. Только в моке. */
export interface RawSources {
  egrul: { status: "active" | "liquidating"; ogrn: string; okved: string };
  fns: {
    taxDebtRub: number;
    employees: number;
    massRegistrationAddress: boolean;
  };
  bki: { activeLoans: number; totalDebtRub: number; overdueDays: number };
}

export const SCORE_BASE = 50;
const rub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
const pct = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export function businessAgeMonths(registeredAt: string, now: Date): number {
  const from = new Date(registeredAt);
  return (
    (now.getFullYear() - from.getFullYear()) * 12 +
    now.getMonth() -
    from.getMonth()
  );
}

function ageLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} мес.`;
  return m === 0 ? `${y} г.` : `${y} г. ${m} мес.`;
}

function debtLoad(app: Application, raw: RawSources): number {
  return (
    (raw.bki.totalDebtRub + app.request.amount) / app.applicant.annualRevenue
  );
}

/** Итог проверки источника: что видит сотрудник. */
export function resolveCheck(
  source: CheckSource,
  app: Application,
  raw: RawSources,
): Pick<SourceCheck, "state" | "summary" | "facts"> {
  if (source === "egrul") {
    const active = raw.egrul.status === "active";
    return {
      state: active ? "passed" : "failed",
      summary: active ? "Компания действует" : "Компания в процессе ликвидации",
      facts: [
        { label: "ОГРН", value: raw.egrul.ogrn },
        { label: "Статус", value: active ? "Действует" : "Ликвидация" },
        {
          label: "Дата регистрации",
          value: new Date(app.applicant.registeredAt).toLocaleDateString(
            "ru-RU",
          ),
        },
        { label: "ОКВЭД", value: raw.egrul.okved },
        { label: "Руководитель", value: app.applicant.director },
      ],
    };
  }
  if (source === "fns") {
    const { taxDebtRub, employees, massRegistrationAddress } = raw.fns;
    const issues = [
      taxDebtRub > 0 && `налоговая задолженность ${rub.format(taxDebtRub)}`,
      massRegistrationAddress && "адрес массовой регистрации",
    ].filter(Boolean);
    return {
      state: issues.length ? "warning" : "passed",
      summary: issues.length
        ? `Есть замечания: ${issues.join(", ")}`
        : "Нарушений не найдено",
      facts: [
        { label: "Налоговая задолженность", value: rub.format(taxDebtRub) },
        { label: "Сотрудников", value: String(employees) },
        {
          label: "Адрес массовой регистрации",
          value: massRegistrationAddress ? "Да" : "Нет",
        },
      ],
    };
  }
  const { activeLoans, totalDebtRub, overdueDays } = raw.bki;
  return {
    state: overdueDays > 30 ? "failed" : overdueDays > 0 ? "warning" : "passed",
    summary:
      overdueDays > 0
        ? `Просрочка до ${overdueDays} дн.`
        : "Кредитная история без просрочек",
    facts: [
      { label: "Действующих кредитов", value: String(activeLoans) },
      { label: "Общий долг", value: rub.format(totalDebtRub) },
      {
        label: "Максимальная просрочка",
        value: overdueDays > 0 ? `${overdueDays} дн.` : "Нет",
      },
    ],
  };
}

/** Балльная модель: каждый признак сдвигает балл от базы 50. */
export function computeScore(
  app: Application,
  raw: RawSources,
  now: Date,
): ScoringResult {
  const age = businessAgeMonths(app.applicant.registeredAt, now);
  const load = debtLoad(app, raw);
  const factors: ScoreFactor[] = [
    {
      id: "business_age",
      label: "Срок работы бизнеса",
      input: ageLabel(age),
      points: age >= 36 ? 10 : age >= 12 ? 4 : -8,
      source: "egrul",
    },
    {
      id: "overdue",
      label: "Просрочки по кредитам",
      input: raw.bki.overdueDays > 0 ? `до ${raw.bki.overdueDays} дн.` : "нет",
      points:
        raw.bki.overdueDays > 30 ? -25 : raw.bki.overdueDays > 0 ? -10 : 12,
      source: "bki",
    },
    {
      id: "active_loans",
      label: "Действующие кредиты",
      input: String(raw.bki.activeLoans),
      points: raw.bki.activeLoans >= 4 ? -6 : 0,
      source: "bki",
    },
    {
      id: "debt_load",
      label: "Долг после выдачи к выручке",
      input: `${pct.format(load * 100)} %`,
      points: load < 0.3 ? 8 : load <= 0.6 ? -4 : -14,
      source: "application",
    },
    {
      id: "tax_debt",
      label: "Налоговая задолженность",
      input: raw.fns.taxDebtRub > 0 ? rub.format(raw.fns.taxDebtRub) : "нет",
      points: raw.fns.taxDebtRub > 0 ? -10 : 4,
      source: "fns",
    },
    {
      id: "mass_address",
      label: "Адрес массовой регистрации",
      input: raw.fns.massRegistrationAddress ? "да" : "нет",
      points: raw.fns.massRegistrationAddress ? -8 : 0,
      source: "fns",
    },
    {
      id: "employees",
      label: "Сотрудники в штате",
      input: String(raw.fns.employees),
      points: raw.fns.employees >= 5 ? 4 : raw.fns.employees === 0 ? -4 : 0,
      source: "fns",
    },
  ];
  const sum = factors.reduce((acc, f) => acc + f.points, SCORE_BASE);
  const score = Math.max(0, Math.min(100, sum));
  return {
    model: "Балльная модель v0, правила",
    base: SCORE_BASE,
    score,
    band: score >= 70 ? "low" : score >= 50 ? "moderate" : "high",
    factors,
    computedAt: now.toISOString(),
  };
}

const roundDown = (n: number, step = 50_000) => Math.floor(n / step) * step;

/** Правила продукта поверх скоринга и проверок. Скоринг ≠ решение. */
export function computeDecision(
  app: Application,
  raw: RawSources,
  scoring: ScoringResult,
  product: CreditProduct,
  now: Date,
): CreditDecision & { rejectReason: RejectReason | null } {
  const age = businessAgeMonths(app.applicant.registeredAt, now);
  const load = debtLoad(app, raw);
  const { amount, termMonths } = app.request;
  const inLimits =
    amount >= product.minAmount &&
    amount <= product.maxAmount &&
    termMonths >= product.minTermMonths &&
    termMonths <= product.maxTermMonths;

  const rules: DecisionRule[] = [
    {
      id: "company_active",
      label: "Компания действует по ЕГРЮЛ/ЕГРИП",
      outcome: raw.egrul.status === "active" ? "pass" : "fail",
      detail:
        raw.egrul.status === "active"
          ? "Статус «Действует»"
          : "Идёт ликвидация, кредитовать нельзя",
    },
    {
      id: "business_age",
      label: `Бизнесу не меньше ${product.minBusinessAgeMonths} мес.`,
      outcome: age >= product.minBusinessAgeMonths ? "pass" : "fail",
      detail: `Работает ${ageLabel(age)}`,
    },
    {
      id: "bki_overdue",
      label: "Нет просрочек больше 30 дней",
      outcome:
        raw.bki.overdueDays > 30
          ? "fail"
          : raw.bki.overdueDays > 0
            ? "attention"
            : "pass",
      detail:
        raw.bki.overdueDays > 0
          ? `Просрочка до ${raw.bki.overdueDays} дн.`
          : "Просрочек нет",
    },
    {
      id: "tax_debt",
      label: "Нет налоговой задолженности",
      outcome: raw.fns.taxDebtRub > 0 ? "attention" : "pass",
      detail:
        raw.fns.taxDebtRub > 0
          ? `${rub.format(raw.fns.taxDebtRub)}: нужна справка об уплате`
          : "Задолженности нет",
    },
    {
      id: "limits",
      label: "Сумма и срок в границах продукта",
      outcome: inLimits ? "pass" : "attention",
      detail: `${rub.format(product.minAmount)} – ${rub.format(product.maxAmount)}, ${product.minTermMonths}–${product.maxTermMonths} мес.`,
    },
    {
      id: "debt_load",
      label: `Долг после выдачи не больше ${pct.format(product.maxDebtLoad * 100)} % выручки`,
      outcome: load <= product.maxDebtLoad ? "pass" : "attention",
      detail: `Сейчас ${pct.format(load * 100)} %`,
    },
    {
      id: "score",
      label: `Скоринг не ниже ${product.minScore}`,
      outcome:
        scoring.score >= product.minScore
          ? "pass"
          : scoring.score >= product.minScore - 10
            ? "attention"
            : "fail",
      detail: `Балл ${scoring.score}`,
    },
  ];
  const outcome = (id: string) => rules.find((r) => r.id === id)!.outcome;

  let recommendation: Recommendation = "approve";
  let rejectReason: RejectReason | null = null;
  let terms: OfferTerms | null = {
    productId: product.id,
    amount,
    termMonths,
    ratePct: product.ratePct,
  };
  let explanation =
    "Все правила продукта выполнены, условия совпадают с запросом клиента.";

  if (outcome("company_active") === "fail") {
    recommendation = "reject";
    rejectReason = "company_inactive";
  } else if (outcome("bki_overdue") === "fail") {
    recommendation = "reject";
    rejectReason = "bki_overdue";
  } else if (
    outcome("score") === "fail" ||
    outcome("business_age") === "fail"
  ) {
    recommendation = "reject";
    rejectReason = "low_score";
  } else if (outcome("tax_debt") === "attention") {
    recommendation = "request_info";
  } else if (
    outcome("debt_load") === "attention" ||
    outcome("score") === "attention" ||
    outcome("limits") === "attention"
  ) {
    const byLoad = roundDown(
      product.maxDebtLoad * app.applicant.annualRevenue - raw.bki.totalDebtRub,
    );
    const next = Math.min(amount, byLoad, product.maxAmount);
    if (next < product.minAmount) {
      recommendation = "reject";
      rejectReason = "debt_load";
    } else {
      recommendation = "counter_offer";
      const rateUp = outcome("score") === "attention" ? 2 : 0;
      terms = {
        productId: product.id,
        amount: next,
        termMonths: Math.min(
          Math.max(termMonths, product.minTermMonths),
          product.maxTermMonths,
        ),
        ratePct: product.ratePct + rateUp,
      };
      explanation =
        next < amount
          ? `Запрошенная сумма даёт нагрузку выше предела продукта. Максимум, который проходит по правилам: ${rub.format(next)}.`
          : "Условия приведены к границам продукта.";
      if (rateUp) explanation += " Балл в серой зоне: ставка выше на 2 п.п.";
    }
  }

  if (recommendation === "reject") {
    terms = null;
    explanation = "Не выполнено обязательное правило, отмечено красным.";
  }
  if (recommendation === "request_info") {
    terms = null;
    explanation =
      "Решение возможно после документа от клиента: справки об уплате налогов.";
  }

  return {
    recommendation,
    rules,
    terms,
    explanation,
    computedAt: now.toISOString(),
    rejectReason,
  };
}
