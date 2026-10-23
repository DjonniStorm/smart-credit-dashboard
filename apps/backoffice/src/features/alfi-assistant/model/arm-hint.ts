import type { Application } from "@repo/contracts/application";
import { AlfiState } from "@repo/ui/alfi";
import type { AlfiDockHint } from "@repo/ui/alfi-dock";
import {
  type AlfiGuidanceContext,
  getAlfiGuidance,
} from "@repo/ui/alfi-guidance";

/** Блок действий по заявке, к которому ведёт кнопка «Показать». */
export const armActionsTarget = "actions";

const guidedRecommendations = new Set<string>([
  "approve",
  "counter_offer",
  "request_info",
  "reject",
]);

/** Подсказка Альфи для сотрудника по адресу страницы и очереди. */
export function armHint(
  pathname: string,
  applications: readonly Application[],
  employeeId: string,
): AlfiDockHint {
  const opened = /^\/applications\/([^/]+)$/.exec(pathname);
  const app = opened && applications.find((item) => item.id === opened[1]);
  if (app) {
    return applicationHint(app);
  }
  return queueHint(applications, employeeId);
}

function applicationHint(app: Application): AlfiDockHint {
  const recommendation = app.scoring?.recommendation;
  const guidance = getAlfiGuidance({
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
      ? { label: "Показать действия", target: armActionsTarget }
      : undefined,
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
      state: AlfiState.Idle,
      title: "Ваша очередь разобрана",
      message: "Заявок, которые ждут вашего решения, сейчас нет.",
    };
  }
  return {
    state: AlfiState.Explain,
    title: `Ждут вашего решения: ${waiting.length}`,
    message: `Начните с самой старой, ${oldest.number}. Решение принимаете вы, я только подсказываю порядок.`,
    action: {
      label: `Открыть ${oldest.number}`,
      href: `/applications/${oldest.id}`,
    },
  };
}
