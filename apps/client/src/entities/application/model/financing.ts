import type { Application } from "@repo/contracts/cabinet";

import { fx } from "@/shared/i18n";

import type { ApplicationDraft } from "./draft";
import { isDeclinedByClient, nextStepOf } from "./stage";

export type FinancingFilter = keyof typeof fx.filters;
export type Focus =
  | { kind: "application"; app: Application }
  | { kind: "draft"; draft: ApplicationDraft }
  | { kind: "empty" };
export type NextAction = {
  kind:
    | "request"
    | "sign"
    | "offer"
    | "wait"
    | "blocked"
    | "closed"
    | "invalid"
    | "draft"
    | "empty";
  title: string;
  description: string;
  why?: string;
  href?: string;
  label?: string;
};

export function isClosed(app: Application) {
  return app.status === "rejected" || app.status === "disbursed";
}

export function applicationAction(app: Application): NextAction {
  const href = "/applications/" + app.id;
  if (isClosed(app)) {
    const declined = isDeclinedByClient(app);
    return {
      kind: "closed",
      title:
        app.status === "disbursed"
          ? fx.fundedTitle
          : declined
            ? fx.declinedTitle
            : fx.rejectedTitle,
      description:
        app.status === "disbursed"
          ? fx.fundedHint
          : declined
            ? fx.declinedHint
            : fx.rejectedHint,
      href,
      label: fx.result,
    };
  }
  if (app.status === "blocked") {
    return {
      kind: "blocked",
      title: fx.blockedTitle,
      description: fx.blockedHint,
      href,
      label: fx.details,
    };
  }
  if (app.status === "needs_client") {
    const request = app.requests.find((item) => {
      return !item.answer;
    });
    if (request) {
      return {
        kind: "request",
        title: fx.requestTitle,
        description: request.question,
        why: request.why,
        href: href + "#next-step",
        label: fx.requestAction,
      };
    }
  } else if (app.status === "approved" && app.deal?.stage === "signing") {
    return {
      kind: "sign",
      title: fx.signTitle,
      description: fx.signHint,
      href: href + "/sign",
      label: fx.signAction,
    };
  } else if (
    (app.status === "approved" || app.status === "counter_offer") &&
    !app.deal &&
    app.decision?.offer
  ) {
    return {
      kind: "offer",
      title: fx.offerTitle,
      description: fx.offerHint,
      href: href + "#next-step",
      label: fx.offerAction,
    };
  } else if (
    app.status === "in_review" ||
    (app.status === "approved" && app.deal && app.deal.stage !== "done")
  ) {
    return {
      kind: "wait",
      title: fx.waitTitle,
      description: nextStepOf(app),
      href,
      label: fx.details,
    };
  }
  return {
    kind: "invalid",
    title: fx.invalidTitle,
    description: fx.invalidHint,
    href,
    label: fx.details,
  };
}

export function requiresAction(app: Application) {
  return ["request", "sign", "offer"].includes(applicationAction(app).kind);
}

export function matchesFilter(app: Application, filter: FinancingFilter) {
  if (app.status === "draft") {
    return false;
  }
  if (filter === "action") {
    return requiresAction(app);
  }
  if (filter === "closed") {
    return isClosed(app);
  }
  if (filter === "review") {
    return !isClosed(app) && !requiresAction(app);
  }
  return true;
}

export function countApplications(apps: readonly Application[]) {
  const submitted = apps.filter((app) => {
    return app.status !== "draft";
  });
  return {
    all: submitted.length,
    action: submitted.filter(requiresAction).length,
    review: submitted.filter((app) => {
      return matchesFilter(app, "review");
    }).length,
    closed: submitted.filter(isClosed).length,
  };
}

function rank(app: Application) {
  const kind = applicationAction(app).kind;
  return kind === "request"
    ? 0
    : kind === "sign"
      ? 1
      : kind === "offer"
        ? 2
        : isClosed(app)
          ? 5
          : 4;
}

function actionDate(app: Application) {
  // Адаптер датирует запрос через updatedAt; это не достоверное время появления действия.
  return Date.parse(app.createdAt) || 0;
}

export function resolveFocus(
  apps: readonly Application[],
  draft: ApplicationDraft | null,
  selected: string | null,
): Focus {
  if (selected === "draft" && draft) {
    return { kind: "draft", draft };
  }
  const chosen = apps.find((app) => {
    return app.id === selected;
  });
  if (chosen) {
    return { kind: "application", app: chosen };
  }
  const ordered = apps
    .filter((app) => {
      return app.status !== "draft";
    })
    .sort((a, b) => {
      return (
        rank(a) - rank(b) ||
        (isClosed(a) && isClosed(b)
          ? actionDate(b) - actionDate(a)
          : actionDate(a) - actionDate(b)) ||
        a.id.localeCompare(b.id)
      );
    });
  const first = ordered[0];
  if (draft && (!first || rank(first) > 2)) {
    return { kind: "draft", draft };
  }
  return first ? { kind: "application", app: first } : { kind: "empty" };
}

export function focusAction(focus: Focus): NextAction {
  if (focus.kind === "application") {
    return applicationAction(focus.app);
  }
  if (focus.kind === "draft") {
    return {
      kind: "draft",
      title: fx.draft,
      description: fx.draftHint,
      href: "/applications/new?draft=1",
      label: fx.continueDraft,
    };
  }
  return {
    kind: "empty",
    title: fx.empty,
    description: fx.emptyHint,
    href: "/products",
    label: fx.selectProduct,
  };
}
