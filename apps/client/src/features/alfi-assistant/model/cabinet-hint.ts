import type { Application } from "@repo/contracts/cabinet";
import type { AlfiDockHint } from "@repo/ui/alfi";

// Модель напрямую, без UI сущности: подсказки проверяются тестами в node.
import { needsClient, nextStepOf } from "@/entities/application/model/stage";
import { ax } from "@/shared/i18n";

const t = ax.cabinet;

/** Элементы страницы заявки, к которым ведёт кнопка «Показать». */
export const alfiTargets = {
  nextStep: "next-step",
  offerDecision: "offer-decision",
  decision: "decision",
} as const;

const showNextStep = { label: t.showNextStep, target: alfiTargets.nextStep };
const showOfferDecision = {
  label: t.showNextStep,
  target: alfiTargets.offerDecision,
};

/** Подсказка, когда заявки не загрузились: честно про ошибку. */
export function loadErrorHint(reason: string): AlfiDockHint {
  return {
    state: "attention",
    title: ax.loadError.title,
    message: ax.loadError.message(reason),
  };
}

/** Подсказка Альфи по адресу страницы и заявкам клиента. */
export function cabinetHint(
  pathname: string,
  applications: readonly Application[],
): AlfiDockHint {
  if (pathname === "/applications/new") {
    return { state: "explain", ...t.newApplication };
  }

  const opened = /^\/applications\/([^/]+)(\/sign)?$/.exec(pathname);
  const app = opened && applications.find((item) => item.id === opened[1]);
  if (app && opened[2]) {
    return { state: "explain", ...t.signing };
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
        state: "needs_answer",
        title: t.needsClient.title,
        message:
          app.requests.find((request) => !request.answer)?.question ??
          t.needsClient.fallback,
        action: showNextStep,
      };
    case "counter_offer":
      return {
        state: "explain",
        ...t.counterOffer,
        action: showOfferDecision,
      };
    case "approved":
      if (app.deal?.stage === "signing") {
        return {
          state: "success",
          title: t.approved.signingTitle,
          message: nextStepOf(app),
          action: { label: t.toSigning, href: `/applications/${app.id}/sign` },
        };
      }
      return {
        state: "success",
        title: app.deal ? t.approved.signedTitle : t.approved.title,
        message: nextStepOf(app),
        action: app.deal ? undefined : showOfferDecision,
      };
    case "in_review":
      return {
        state: "checking",
        title: t.inReview.title,
        message: t.inReview.message(app.checksPassed),
      };
    case "rejected":
      return {
        state: "attention",
        ...t.rejected,
        action: { label: t.showDecision, target: alfiTargets.decision },
      };
    case "blocked":
      return { state: "attention", ...t.blocked };
    case "disbursed":
      return { state: "success", ...t.disbursed };
    case "draft":
      return {
        state: "greeting",
        title: t.draft.title,
        message: nextStepOf(app),
        action: { label: t.continueDraft, href: "/applications/new?draft=1" },
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
      state: "needs_answer",
      title: t.waiting.title(waiting.number),
      message: nextStepOf(waiting),
      action: { label: t.openApplication, href: `/applications/${waiting.id}` },
    };
  }
  if (applications.length === 0) {
    return {
      state: "greeting",
      ...t.empty,
      action: { label: t.submit, href: "/applications/new" },
    };
  }
  return {
    state: "idle",
    ...t.bankTurn,
    action:
      pathname === "/" ? undefined : { label: t.myApplications, href: "/" },
  };
}
