type ApplicationStage =
  | "intake"
  | "completeness"
  | "enrichment"
  | "scoring"
  | "decision"
  | "signing"
  | "disbursement";
type CheckSource = "egrul" | "fns" | "bki";
type CheckState = "passed" | "pending" | "warning" | "failed" | "unavailable";

const ru = {
  application: {
    queue: "Очередь заявок",
    loading: "Загружаем заявку",
    error: "Заявка не загрузилась",
    retry: "Повторить",
    submitted: (date: string) => `Подана ${date}`,
    number: (number: string) => `Заявка № ${number}`,
    unnamed: "Заявка",
    backToQueue: "Очередь заявок",
    assigneeSelf: "Вы",
    assigneeUnknown: "Неизвестен",
    tabs: {
      data: "Данные",
      checks: "Проверки",
      checkResults: "Результаты проверок",
      decision: "Скоринг и решение",
      history: "История",
    },
    card: {
      title: "Заявка",
      product: "Продукт",
      amount: "Сумма",
      term: "Срок",
      termValue: (months: number) => `${months} мес.`,
      purpose: "Цель",
      rate: "Ставка продукта",
      rateValue: (rate: number) => `от ${rate} %`,
      noProductData: "нет данных",
      assignee: "Ответственный",
      unassigned: "Не назначен",
    },
    applicant: {
      title: "Заявитель и данные из заявки",
      applicant: "Заявитель",
      ogrn: "ОГРН/ОГРНИП",
      director: "Руководитель",
      region: "Регион",
      revenue: "Выручка за 12 мес., со слов клиента",
      registeredAt: "Дата регистрации",
    },
    decision: {
      scoringTitle: "Скоринг: оценка риска",
      rulesTitle: "Кредитное решение: правила продукта",
      explanation:
        "Скоринг говорит о риске. Решение учитывает ещё продукт, сумму, срок и проверки, поэтому при том же балле условия по разным продуктам могут отличаться.",
      waitingSources: "Ждём ответы источников",
      noScoring: "Скоринга ещё нет",
      waitingText: "Скоринг считается, когда ответят все источники.",
    },
    aria: {
      summary: "Сводка и действия",
      openPage: "Открыть заявку отдельной страницей",
      close: "Закрыть панель заявки",
    },
  },
  summary: {
    requestedAmount: "Запрошенная сумма",
    term: "Срок",
    product: "Продукт",
    autonomy: "Автономность решения",
    policyUnavailable: "Данные policy ещё не загружены.",
    available: "Доступна",
    manualControl: "Только контроль",
    policyMeta: (model: string, policy: string, level: string) => `${model} · ${policy} · уровень ${level}`,
    controlWindow: (state: string) => `Контрольное окно: ${state}.`,
    windowOpen: "открыто",
    windowClosed: "закрыто",
    amountOutOfBand: "Сумма вне диапазона автономного решения.",
    inn: "ИНН",
    ogrn: (legalForm: string) => legalForm === "ip" ? "ОГРНИП" : "ОГРН",
  },
  workflow: {
    title: "Путь заявки",
    stepOf: (current: number, total: number) => `${current} из ${total}`,
    stepsLabel: "Этапы заявки",
    stages: {
      intake: {
        label: "Анкета",
        short: "Анкета и цель",
        detail: "Фиксируем продукт, сумму, срок и сведения о компании.",
        owner: "Клиент",
      },
      completeness: {
        label: "Документы",
        short: "Документы",
        detail: "Проверяем комплектность и качество загруженных документов.",
        owner: "Банк",
      },
      enrichment: {
        label: "Проверка данных",
        short: "ФНС · ЕГРЮЛ · БКИ",
        detail: "Получаем подтверждения из внешних и внутренних источников.",
        owner: "Система",
      },
      scoring: {
        label: "Оценка",
        short: "Риск-профиль",
        detail: "Рассчитываем score и объясняем вклад факторов в риск.",
        owner: "Модель",
      },
      decision: {
        label: "Решение",
        short: "Условия кредита",
        detail: "Правила продукта превращают скоринг в рекомендацию по заявке.",
        owner: "Сотрудник банка",
      },
      signing: {
        label: "Подписание",
        short: "Договор",
        detail: "Клиент принимает предложение и подписывает договор.",
        owner: "Клиент",
      },
      disbursement: {
        label: "Выдача",
        short: "Зачисление",
        detail: "Проверяем финальные условия и отправляем деньги клиенту.",
        owner: "Банк",
      },
    } satisfies Record<ApplicationStage, { label: string; short: string; detail: string; owner: string }>,
  },
  checks: {
    emptyTitle: "Проверки ещё не запускались",
    emptyText: "Конвейер запросит источники после проверки полноты заявки.",
    noResponse: "ответа нет",
    source: {
      egrul: "ЕГРЮЛ",
      fns: "ФНС",
      bki: "БКИ",
    } satisfies Record<CheckSource, string>,
    state: {
      passed: "Пройдена",
      pending: "Ждём ответ",
      warning: "Есть замечания",
      failed: "Не пройдена",
      unavailable: "Нет ответа",
    } satisfies Record<CheckState, string>,
  },
  risk: {
    title: "Кредитный риск",
    scoreOf: "из 100",
    waitingScore: "Скоринг посчитается, когда ответят все источники.",
    noScore: "Скоринга ещё нет.",
    recommendation: "Рекомендация",
    blocker: "Что мешает решению:",
    alfi: "Альфи",
    systemChecking: "Источники ещё проверяются. Решение появится после ответа системы.",
    rejected: "Решение отклонено. Проверьте причину и историю факторов.",
    rejectedWithReason: (reason: string) => `Отказ зафиксирован: ${reason.toLowerCase()}. Причина и факторы доступны в истории.`,
    disbursed: "Выдача завершена: деньги перечислены клиенту. Проверьте историю операции.",
    needsClient: (items: string) => items
      ? `Ждём от клиента: ${items}. После ответа проверки запустятся повторно.`
      : "Клиент должен ответить на запрос. После этого заявка вернётся в очередь.",
    counterOffer: (amount: string, term: string, rate: number) => `Клиенту предложены другие условия: ${amount} на ${term} под ${rate} %.`,
    counterOfferWaiting: "Клиенту отправлено встречное предложение. Дождитесь его ответа.",
    approved: "Заявка одобрена. Клиенту осталось подписать договор, после чего банк выполнит выдачу.",
    recommendationHint: (recommendation: string) => `Рекомендация «${recommendation.toLowerCase()}». Сверьте факторы и подтвердите или измените решение.`,
  },
  outcome: {
    requested: "Запрошено у клиента",
    rejectionReason: "Причина отказа:",
    offered: "Предложено клиенту",
    approved: "Одобренные условия",
    data: {
      purpose: "Цель",
      director: "Руководитель",
      region: "Регион",
      registeredAt: "Дата регистрации",
      revenue: "Выручка за 12 мес.",
      revenueValue: (amount: string) => `${amount}, со слов клиента`,
      assignee: "Ответственный",
    },
    productRules: "Как считается скоринг и правила продуктов",
  },
} as const;

export type BackofficeText = typeof ru;

const dictionaries: Record<string, BackofficeText> = { ru };

export function backofficeText(locale: string): BackofficeText {
  return dictionaries[locale] ?? ru;
}
