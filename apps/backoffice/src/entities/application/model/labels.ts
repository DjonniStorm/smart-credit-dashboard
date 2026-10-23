import type { ApplicationStatus } from "@repo/contracts";
import type {
  ApplicationStage,
  CheckSource,
  CheckState,
  ClientResponse,
  CreditProductId,
  Recommendation,
  RiskBand,
  RuleOutcome,
  WaitingOn,
} from "@repo/contracts/application";
import { CREDIT_PRODUCTS } from "@repo/contracts/product-catalog";
import type { Tone } from "@repo/ui/tone-badge";

export const stageOrder: ApplicationStage[] = [
  "intake",
  "completeness",
  "enrichment",
  "scoring",
  "decision",
  "signing",
  "disbursement",
];

export const stageLabel: Record<ApplicationStage, string> = {
  intake: "Приём",
  completeness: "Полнота данных",
  enrichment: "Проверки",
  scoring: "Скоринг",
  decision: "Решение",
  signing: "Подписание",
  disbursement: "Выдача",
};

/** Статус глазами сотрудника, а не клиента. */
export const statusLabel: Record<ApplicationStatus, string> = {
  draft: "Черновик",
  in_review: "На рассмотрении",
  needs_client: "Запрошены документы",
  counter_offer: "Встречное предложение",
  approved: "Одобрена",
  disbursed: "Выдан",
  rejected: "Отказ",
};

export const statusTone: Record<ApplicationStatus, Tone> = {
  draft: "neutral",
  in_review: "neutral",
  needs_client: "neutral",
  counter_offer: "neutral",
  approved: "success",
  disbursed: "success",
  rejected: "danger",
};

export const waitingLabel: Record<WaitingOn, string> = {
  employee: "Нужно решение",
  client: "Ждём клиента",
  system: "Идёт автоматически",
  nobody: "Закрыта",
};

export const waitingOrder: Record<WaitingOn, number> = {
  employee: 0,
  system: 1,
  client: 2,
  nobody: 3,
};

export const productLabel: Record<CreditProductId, string> = Object.fromEntries(
  CREDIT_PRODUCTS.map((product) => [product.id, product.name]),
) as Record<CreditProductId, string>;

export const sourceLabel: Record<CheckSource, string> = {
  egrul: "ЕГРЮЛ/ЕГРИП",
  fns: "ФНС «Прозрачный бизнес»",
  bki: "Бюро кредитных историй",
};

export const checkStateLabel: Record<CheckState, string> = {
  pending: "Ждём ответ",
  passed: "Пройдена",
  warning: "Есть замечания",
  failed: "Не пройдена",
  unavailable: "Нет ответа",
};

export const checkStateTone: Record<CheckState, Tone> = {
  pending: "neutral",
  passed: "success",
  warning: "action",
  failed: "danger",
  unavailable: "danger",
};

export const riskLabel: Record<RiskBand, string> = {
  low: "Низкий риск",
  moderate: "Умеренный риск",
  high: "Высокий риск",
};

export const ruleTone: Record<RuleOutcome, Tone> = {
  pass: "success",
  attention: "action",
  fail: "danger",
};

export const ruleLabel: Record<RuleOutcome, string> = {
  pass: "Выполнено",
  attention: "Внимание",
  fail: "Не выполнено",
};

export const recommendationLabel: Record<Recommendation, string> = {
  approve: "Одобрить на условиях клиента",
  counter_offer: "Одобрить на других условиях",
  request_info: "Запросить документы",
  manual_review: "Оставить на ручной проверке",
  reject: "Отказать",
};

export const clientResponseLabel: Record<ClientResponse, string> = {
  documents_sent: "Клиент прислал документы",
  offer_accepted: "Клиент принял условия",
  contract_signed: "Клиент подписал договор",
};
