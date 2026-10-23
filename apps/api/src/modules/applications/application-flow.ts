import type { ApplicationStage, WaitingOn } from "@repo/contracts/application";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

export interface ApplicationFlow {
  stage: ApplicationStage;
  waitingOn: WaitingOn;
  blocker: string;
}

/**
 * Этап и ожидание выводятся из статуса и готовности скоринга, а не хранятся:
 * пауза не может оставить в базе устаревшее `waitingOn`.
 */
export function deriveFlow(application: ApplicationWorkflow): ApplicationFlow {
  switch (application.status) {
    case "draft":
      return {
        stage: "intake",
        waitingOn: "client",
        blocker: "Клиент не отправил заявку",
      };
    case "needs_client":
      return {
        stage: "completeness",
        waitingOn: "client",
        blocker: "Ждём документы от клиента",
      };
    case "approved":
    case "counter_offer":
      return {
        stage: "signing",
        waitingOn: "client",
        blocker: "Ждём ответ клиента на предложение",
      };
    case "signing":
      return {
        stage: "signing",
        waitingOn: "client",
        blocker: "Ждём подпись договора клиентом",
      };
    case "funded":
      return {
        stage: "disbursement",
        waitingOn: "nobody",
        blocker: "Кредит выдан",
      };
    case "rejected":
    case "cancelled":
      return {
        stage: "decision",
        waitingOn: "nobody",
        blocker: "Заявка закрыта",
      };
    case "in_review":
      return application.scoring
        ? {
            stage: "decision",
            waitingOn: "employee",
            blocker:
              application.scoring.details?.reasons[0] ??
              "Ждёт решения сотрудника",
          }
        : {
            stage: "scoring",
            waitingOn: "system",
            blocker: "Проверка заявки выполняется",
          };
  }
}

export function isClosed(application: ApplicationWorkflow): boolean {
  return (
    application.status === "rejected" ||
    application.status === "cancelled" ||
    application.status === "funded"
  );
}
