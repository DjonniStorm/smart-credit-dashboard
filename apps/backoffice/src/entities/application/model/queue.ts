import type { Application } from "@repo/contracts/application";

/** Вкладка очереди. Каждая заявка попадает ровно в одну. */
export type QueueGroup = "new" | "review" | "client" | "decision" | "closed";

export const queueGroupOrder: QueueGroup[] = [
  "new",
  "review",
  "client",
  "decision",
  "closed",
];

export const queueGroupLabel: Record<QueueGroup, string> = {
  new: "Новые",
  review: "На проверке",
  client: "Ожидают клиента",
  decision: "Решение",
  closed: "Закрыты",
};

export function queueGroup(app: Application): QueueGroup {
  if (app.waitingOn === "nobody") return "closed";
  if (app.waitingOn === "client") return "client";
  switch (app.stage) {
    case "intake":
    case "completeness":
      return "new";
    case "enrichment":
    case "scoring":
      return "review";
    case "decision":
      return "decision";
    default:
      return "closed";
  }
}

export function countByGroup(
  apps: Application[],
): Record<QueueGroup | "all", number> {
  const counts = {
    all: apps.length,
    new: 0,
    review: 0,
    client: 0,
    decision: 0,
    closed: 0,
  };
  for (const a of apps) counts[queueGroup(a)] += 1;
  return counts;
}

/** Цвет бейджа этапа из дизайн-системы. */
export type StageTone = "neutral" | "info" | "review" | "done" | "danger";

/** Подпись этапа в таблице: этап конвейера с учётом того, за кем ход. */
export function stageBadge(app: Application): {
  label: string;
  tone: StageTone;
} {
  if (app.status === "rejected") return { label: "Отказ", tone: "danger" };
  if (app.status === "disbursed")
    return { label: "Кредит выдан", tone: "done" };
  if (app.waitingOn === "client")
    return { label: "Ожидает клиента", tone: "neutral" };
  switch (app.stage) {
    case "intake":
      return { label: "Новая", tone: "neutral" };
    case "completeness":
      return { label: "Первичная проверка", tone: "info" };
    case "enrichment":
      return { label: "Запрос в источники", tone: "info" };
    case "scoring":
      return { label: "Скоринг", tone: "info" };
    case "decision":
      return { label: "Ждёт решения", tone: "review" };
    case "signing":
      return { label: "Подписание", tone: "done" };
    case "disbursement":
      return { label: "Выдача", tone: "done" };
  }
}
