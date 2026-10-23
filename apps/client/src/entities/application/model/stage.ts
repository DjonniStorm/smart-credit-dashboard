import type { Application } from "@repo/contracts/cabinet";

import { tx } from "@/shared/i18n";

export const stages = tx.stages;

/** Клиент сам отказался от предложения банка. */
export function isDeclinedByClient(app: Application) {
  return app.status === "rejected" && app.decision?.outcome !== "rejected";
}

/** Индекс текущего этапа для StageRail и флаг «ход за клиентом». */
export function stageOf(app: Application): {
  current: number;
  waitingForClient: boolean;
} {
  switch (app.status) {
    case "draft":
      return { current: 0, waitingForClient: true };
    case "in_review":
      return { current: app.checksPassed < 1 ? 1 : 2, waitingForClient: false };
    case "needs_client":
      return { current: 2, waitingForClient: true };
    case "counter_offer":
      return { current: 3, waitingForClient: true };
    case "rejected":
      return { current: 3, waitingForClient: false };
    case "approved":
      if (!app.deal) return { current: 3, waitingForClient: true };
      if (app.deal.stage === "offer")
        return { current: 4, waitingForClient: false };
      if (app.deal.stage === "signing")
        return { current: 4, waitingForClient: true };
      return { current: 5, waitingForClient: false };
    case "disbursed":
      return { current: stages.length, waitingForClient: false };
    case "blocked":
      return { current: 3, waitingForClient: false };
  }
}

/** Что делать дальше, одной фразой для карточки и страницы заявки. */
export function nextStepOf(app: Application): string {
  if (app.status === "blocked")
    return "Заявка заблокирована для ручной проверки";
  if (isDeclinedByClient(app)) return tx.nextStep.declined;
  if (app.status === "approved") {
    if (!app.deal) return tx.nextStep.approved_offer;
    if (app.deal.stage === "offer") return tx.nextStep.approved_preparing;
    return app.deal.stage === "signing"
      ? tx.nextStep.approved_signing
      : tx.nextStep.approved_disbursing;
  }
  return tx.nextStep[app.status];
}

/** Ждёт ли заявка действия клиента. */
export function needsClient(app: Application) {
  return stageOf(app).waitingForClient;
}
