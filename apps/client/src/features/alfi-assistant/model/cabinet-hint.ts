import type { Application } from "@repo/contracts/cabinet";
import { type AlfiDockHint, AlfiState } from "@repo/ui/alfi";

import { needsClient, nextStepOf } from "@/entities/application";
import { ax } from "@/shared/i18n";

const t = ax.cabinet;

/** Элементы страницы заявки, к которым ведёт кнопка «Показать». */
export const alfiTargets = {
  nextStep: "next-step",
  decision: "decision",
} as const;

const showNextStep = { label: t.showNextStep, target: alfiTargets.nextStep };

/** Подсказка Альфи по адресу страницы и заявкам клиента. */
export function cabinetHint(
  pathname: string,
  applications: readonly Application[],
): AlfiDockHint {
  if (pathname === "/applications/new") {
    return { state: AlfiState.Explain, ...t.newApplication };
  }

  const opened = /^\/applications\/([^/]+)(\/sign)?$/.exec(pathname);
  const app = opened && applications.find((item) => item.id === opened[1]);
  if (app && opened[2]) {
    return { state: AlfiState.Explain, ...t.signing };
  }
  if (app) {
    return applicationHint(app);
  }

  return overviewHint(pathname, applications);
}

function applicationHint(app: Application): AlfiDockHint {
  switch (app.status) {
    case "needs_client":
      return {
        state: AlfiState.NeedsAnswer,
        title: t.needsClient.title,
        message:
          app.requests.find((request) => !request.answer)?.question ??
          t.needsClient.fallback,
        action: showNextStep,
      };
    case "counter_offer":
      return {
        state: AlfiState.Explain,
        ...t.counterOffer,
        action: showNextStep,
      };
    case "approved":
      if (app.deal?.stage === "signing") {
        return {
          state: AlfiState.Success,
          title: t.approved.signingTitle,
          message: nextStepOf(app),
          action: { label: t.toSigning, href: `/applications/${app.id}/sign` },
        };
      }
      return {
        state: AlfiState.Success,
        title: app.deal ? t.approved.signedTitle : t.approved.title,
        message: nextStepOf(app),
        action: app.deal ? undefined : showNextStep,
      };
    case "in_review":
      return {
        state: AlfiState.Checking,
        title: t.inReview.title,
        message: t.inReview.message(app.checksPassed),
      };
    case "rejected":
      return {
        state: AlfiState.Attention,
        ...t.rejected,
        action: { label: t.showDecision, target: alfiTargets.decision },
      };
    case "blocked":
      return { state: AlfiState.Attention, ...t.blocked };
    case "disbursed":
      return { state: AlfiState.Success, ...t.disbursed };
    case "draft":
      return {
        state: AlfiState.Greeting,
        title: t.draft.title,
        message: nextStepOf(app),
        action: { label: t.continueDraft, href: "/applications/new" },
      };
  }
}

function overviewHint(
  pathname: string,
  applications: readonly Application[],
): AlfiDockHint {
  const waiting = applications.find(needsClient);
  if (waiting) {
    return {
      state: AlfiState.NeedsAnswer,
      title: t.waiting.title(waiting.number),
      message: nextStepOf(waiting),
      action: { label: t.openApplication, href: `/applications/${waiting.id}` },
    };
  }
  if (applications.length === 0) {
    return {
      state: AlfiState.Greeting,
      ...t.empty,
      action: { label: t.submit, href: "/applications/new" },
    };
  }
  return {
    state: AlfiState.Idle,
    ...t.bankTurn,
    action:
      pathname === "/" ? undefined : { label: t.myApplications, href: "/" },
  };
}
