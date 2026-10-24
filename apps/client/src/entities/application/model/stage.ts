import type { Application } from "@repo/contracts/cabinet";

import { tx } from "@/shared/i18n";

export const stages = tx.stages;

/** Клиент сам отказался от предложения банка: оффер был, решение по нему есть. */
export function isDeclinedByClient(app: Application) {
  return app.cancelledBy === "client" && app.decision !== null;
}

/** Клиент отозвал заявку до решения банка: оффера не было. */
export function isWithdrawnByClient(app: Application) {
  return app.cancelledBy === "client" && app.decision === null;
}

/** Сотрудник банка отменил заявку. */
export function isCancelledByManager(app: Application) {
  return app.cancelledBy === "employee";
}

/** Индекс этапа, на котором прервали путь: по последним данным заявки. */
function interruptIndex(app: Application): number {
  if (app.deal?.stage === "signing" || app.deal?.stage === "offer") {
    return 4;
  }
  if (app.decision?.offer) {
    return 3;
  }
  return app.checksPassed < 1 ? 1 : 2;
}

/** Индекс финального шага закрытой заявки: где именно она закончилась. */
function terminalIndex(app: Application): number {
  if (app.cancelledBy === "client") {
    return isDeclinedByClient(app) ? 3 : 0;
  }
  if (app.cancelledBy === "employee") {
    return interruptIndex(app);
  }
  return 3;
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
      return { current: terminalIndex(app), waitingForClient: false };
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
      return { current: interruptIndex(app), waitingForClient: false };
  }
}

/** Что делать дальше, одной фразой для карточки и страницы заявки. */
export function nextStepOf(app: Application): string {
  if (app.status === "blocked") {
    return "Заявка заблокирована для ручной проверки";
  }
  if (isCancelledByManager(app)) return tx.nextStep.cancelledByManager;
  if (isWithdrawnByClient(app)) return tx.nextStep.withdrawn;
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
