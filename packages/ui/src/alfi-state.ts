/**
 * Эмоции Альфи. Объект вместо enum: тип остаётся объединением строк,
 * поэтому чистая логика подсказок обходится импортом типа без UI-пакета.
 */
export const AlfiState = {
  Idle: "idle",
  Greeting: "greeting",
  Explain: "explain",
  Checking: "checking",
  NeedsAnswer: "needs_answer",
  Success: "success",
  Attention: "attention",
} as const;
export type AlfiState = (typeof AlfiState)[keyof typeof AlfiState];

export enum AlfiOperation {
  ApplicationCreated = "application_created",
  CheckingStarted = "checking_started",
  CheckCompleted = "check_completed",
  NeedsInfo = "needs_info",
  DocumentRejected = "document_rejected",
  OfferReady = "offer_ready",
  DecisionChanged = "decision_changed",
  ManualReview = "manual_review",
  ActionCompleted = "action_completed",
  ActionFailed = "action_failed",
}

export const alfiStateMeta: Readonly<
  Record<AlfiState, { label: string; description: string }>
> = {
  [AlfiState.Idle]: {
    label: "Альфи готов помочь",
    description: "Помощник ждёт следующего действия.",
  },
  [AlfiState.Greeting]: {
    label: "Альфи приветствует",
    description: "Помощник показывает начало следующего шага.",
  },
  [AlfiState.Explain]: {
    label: "Альфи объясняет",
    description: "Помощник объясняет рейтинг, запрос или изменение условий.",
  },
  [AlfiState.Checking]: {
    label: "Альфи проверяет",
    description: "Система проверяет данные, документ или источник.",
  },
  [AlfiState.NeedsAnswer]: {
    label: "От вас нужен ответ",
    description: "Найдено поле или подтверждение, которое нужно уточнить.",
  },
  [AlfiState.Success]: {
    label: "Шаг завершён",
    description: "Подтверждение принятого ответа или завершённого действия.",
  },
  [AlfiState.Attention]: {
    label: "Нужна проверка",
    description: "Есть риск или фактор, который требует внимания сотрудника.",
  },
};

export const alfiOperationState: Readonly<Record<AlfiOperation, AlfiState>> = {
  [AlfiOperation.ApplicationCreated]: AlfiState.Greeting,
  [AlfiOperation.CheckingStarted]: AlfiState.Checking,
  [AlfiOperation.CheckCompleted]: AlfiState.Explain,
  [AlfiOperation.NeedsInfo]: AlfiState.NeedsAnswer,
  [AlfiOperation.DocumentRejected]: AlfiState.Attention,
  [AlfiOperation.OfferReady]: AlfiState.Success,
  [AlfiOperation.DecisionChanged]: AlfiState.Explain,
  [AlfiOperation.ManualReview]: AlfiState.Attention,
  [AlfiOperation.ActionCompleted]: AlfiState.Success,
  [AlfiOperation.ActionFailed]: AlfiState.Attention,
};

export const alfiStateAssets: Readonly<Record<AlfiState, string>> = {
  [AlfiState.Idle]: "/alfi/states/idle.svg",
  [AlfiState.Greeting]: "/alfi/states/greeting.svg",
  [AlfiState.Explain]: "/alfi/states/explain.svg",
  [AlfiState.Checking]: "/alfi/states/checking.svg",
  [AlfiState.NeedsAnswer]: "/alfi/states/needs-answer.svg",
  [AlfiState.Success]: "/alfi/states/success.svg",
  [AlfiState.Attention]: "/alfi/states/attention.svg",
};
