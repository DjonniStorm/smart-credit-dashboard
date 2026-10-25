// Тексты блока вариантов условий: выбор приоритета и предложения банка.

const days = (min: number, max: number) =>
  min === max ? `${min} раб. дн.` : `${min}–${max} раб. дн.`;

export const negotiationRu = {
  title: "Варианты от банка",
  lead: "Выберите приоритет — покажем до трёх вариантов условий. Понравившийся примените к заявке, сводка сверху пересчитается.",
  priorityLabel: "Что для вас важнее",
  priorities: {
    amount: { label: "Сумма", hint: "Получить как можно больше" },
    term: { label: "Срок", hint: "Подогнать платёж под оборот" },
    speed: { label: "Скорость", hint: "Решение без лишних проверок" },
    product: { label: "Продукт", hint: "Сравнить другие продукты" },
    collateral: { label: "Обеспечение", hint: "С залогом или без" },
  },
  optionsTitle: (count: number) =>
    count === 1 ? "Вариант условий" : `Варианты условий: ${count}`,
  legend:
    "В карточках — условия варианта и разница с текущим платежом. После применения сводка выше пересчитается.",
  tags: {
    amount_max: "Максимальная сумма на ваш срок",
    amount_long_term: "Максимальная сумма на самый длинный срок",
    term_longest: "Самый длинный срок, самый лёгкий платёж",
    term_balanced: "Срок посередине",
    term_shortest: "Самый короткий срок, меньше переплата",
    speed_fast: "Решение быстрее, без залога и ручного просмотра",
    product_alt: "Другой продукт",
    collateral_none: "Без залога",
    collateral_lower_rate: "С залогом, ставка ниже",
  },
  facts: {
    product: "Продукт",
    amount: "Сумма",
    term: "Срок",
    rate: "Ставка",
    payment: "Платёж",
    load: "Нагрузка на оборот",
    collateral: "Обеспечение",
    checks: "Проверки",
    requests: "Возможные запросы",
    decision: "Решение банка",
  },
  noCollateral: "Не требуется",
  baseChecks: "ЕГРЮЛ, БКИ, ФНС",
  extraChecks: {
    collateral_review: "оценка обеспечения",
    manager_review: "просмотр менеджером",
  },
  requests: {
    collateral_documents: "документы на обеспечение",
    turnover_statement: "выписка по счёту за 12 месяцев",
    reporting: "отчётность для подтверждения выручки",
  },
  noRequests: "Не ожидаются",
  decisionIn: (min: number, max: number) => `около ${days(min, max)}`,
  paymentDelta: (diff: number, formatted: string) => {
    if (diff === 0) {
      return "Платёж как сейчас";
    }
    return diff < 0
      ? `Платёж на ${formatted} меньше текущего`
      : `Платёж на ${formatted} больше текущего`;
  },
  notApproval:
    "Это не одобрение. Расчёт ориентировочный, решение банк примет после проверок.",
  apply: "Применить к заявке",
  applied: "Применено",
  recalculate: "Пересчитать от текущих условий",
  emptyTitle: "Лучше текущих условий не нашлось",
  emptyText:
    "В рамках правил продуктов и вашей нагрузки по этому приоритету вариантов лучше нет. Попробуйте другой приоритет.",
};
