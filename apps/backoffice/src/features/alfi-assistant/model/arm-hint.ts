import type { Application } from "@repo/contracts/application";
import type { AlfiDockHint } from "@repo/ui/alfi";
import type { AlfiGuidance, AlfiGuidanceContext } from "@repo/ui/alfi-guidance";

import { ax } from "./text";

const t = ax.arm;

/** Блок действий по заявке, к которому ведёт кнопка «Показать». */
export const armActionsTarget = "actions";

const guidedRecommendations = new Set<string>([
  "approve",
  "counter_offer",
  "request_info",
  "reject",
]);

/** Подсказка, когда очередь не загрузилась: честно про ошибку. */
export function loadErrorHint(reason: string): AlfiDockHint {
  return {
    state: "attention",
    title: ax.loadError.title,
    message: ax.loadError.message(reason),
  };
}

/** Тексты по заявке, в приложении это getAlfiGuidance из модуля Альфи. */
export type GuidanceSource = (context: AlfiGuidanceContext) => AlfiGuidance;

/** Подсказка Альфи для сотрудника по адресу страницы и очереди. */
export function armHint(
  pathname: string,
  applications: readonly Application[],
  employeeId: string,
  guide: GuidanceSource,
): AlfiDockHint {
  const opened = /^\/applications\/([^/]+)$/.exec(pathname);
  const app = opened && applications.find((item) => item.id === opened[1]);
  if (app) {
    return applicationHint(app, guide);
  }
  return queueHint(applications, employeeId);
}

function applicationHint(
  app: Application,
  guide: GuidanceSource,
): AlfiDockHint {
  // Ход за клиентом: общая подсказка говорит «Нужно действие клиента», но
  // запрос часто инициировал сам сотрудник, поэтому показываем состояние,
  // а не требование что-то делать.
  if (app.waitingOn === "client") {
    return clientTurnHint(app);
  }
  const recommendation = app.scoring?.recommendation;
  const guidance = guide({
    role: "employee",
    status: app.status,
    stage: app.stage,
    waitingOn: app.waitingOn,
    blocker: app.blocker || null,
    recommendation:
      recommendation && guidedRecommendations.has(recommendation)
        ? (recommendation as AlfiGuidanceContext["recommendation"])
        : undefined,
    hold: app.hold?.state ?? null,
  });
  const actionable = app.waitingOn === "employee" || app.hold !== null;
  return {
    state: guidance.state,
    title: guidance.title,
    message: guidance.action
      ? `${guidance.message} ${guidance.action}.`
      : guidance.message,
    action: actionable
      ? { label: t.showActions, target: armActionsTarget }
      : undefined,
  };
}

/** Состояние, когда заявка ждёт клиента: только информация, без действий. */
function clientTurnHint(app: Application): AlfiDockHint {
  const turn = t.clientTurn;
  if (app.status === "needs_client") {
    return {
      state: "explain",
      title: turn.documents.title,
      message: turn.documents.message,
    };
  }
  if (app.status === "approved" || app.status === "counter_offer") {
    return {
      state: "explain",
      title: turn.offer.title,
      message: turn.offer.message,
    };
  }
  return {
    state: "explain",
    title: turn.signing.title,
    message: turn.signing.message,
  };
}

function queueHint(
  applications: readonly Application[],
  employeeId: string,
): AlfiDockHint {
  const waiting = applications
    .filter(
      (app) =>
        app.waitingOn === "employee" &&
        app.hold === null &&
        (app.assigneeId === null || app.assigneeId === employeeId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const oldest = waiting[0];
  if (!oldest) {
    return {
      state: "idle",
      ...t.queueEmpty,
    };
  }
  return {
    state: "explain",
    title: t.queue.title(waiting.length),
    message: t.queue.message(oldest.number),
    action: {
      label: t.open(oldest.number),
      href: `/applications/${oldest.id}`,
    },
  };
}
