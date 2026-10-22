// Переходы заявки по конвейеру. Чистые функции над записью мока:
// их же проигрывает сид, поэтому история демо-заявок честная.
import type { ApplicationStatus } from "@repo/contracts";
import type {
  Actor,
  Application,
  CheckSource,
  ClientResponse,
  CreditProduct,
  Employee,
  EmployeeAction,
  RejectReason,
} from "@repo/contracts/application";

import {
  type RawSources,
  computeDecision,
  computeScore,
  resolveCheck,
} from "./engine";

export interface MockRecord {
  app: Application;
  raw: RawSources;
  /** Когда источник ответит, мс от эпохи. */
  due: Partial<Record<CheckSource, number>>;
  /** Источники, которые на ближайший запрос не ответят. */
  failOnce: CheckSource[];
}

export class ArmActionError extends Error {}

export const SYSTEM: Actor = { kind: "system", name: "Конвейер" };
const SOURCES: CheckSource[] = ["egrul", "fns", "bki"];
const SOURCE_NAME: Record<CheckSource, string> = {
  egrul: "ЕГРЮЛ/ЕГРИП",
  fns: "ФНС «Прозрачный бизнес»",
  bki: "БКИ",
};
/** Через сколько источник не считается ответившим. */
export const SOURCE_TIMEOUT_MS = 10_000;

export const rejectReasonLabel: Record<RejectReason, string> = {
  company_inactive: "Компания не действует",
  bki_overdue: "Просрочки по кредитам",
  tax_debt: "Налоговая задолженность",
  debt_load: "Высокая долговая нагрузка",
  low_score: "Низкий балл скоринга",
  other: "Другая причина",
};

const rub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function log(
  rec: MockRecord,
  now: number,
  actor: Actor,
  title: string,
  comment: string | null = null,
  toStatus: ApplicationStatus | null = null,
  kind: "status_changed" | "action" | "comment_added" | "handoff" | "hold" =
    toStatus ? "status_changed" : "action",
) {
  const { app } = rec;
  app.events.push({
    id: `${app.id}-${app.events.length + 1}`,
    applicationId: app.id,
    at: new Date(now).toISOString(),
    actor,
    title,
    comment,
    fromStatus: toStatus && toStatus !== app.status ? app.status : null,
    toStatus: toStatus && toStatus !== app.status ? toStatus : null,
    kind,
  });
  if (toStatus) app.status = toStatus;
  app.updatedAt = new Date(now).toISOString();
}

function employeeActor(e: Employee): Actor {
  return { kind: "employee", name: e.name };
}

/** Запросить источники заново. delays: через сколько мс каждый ответит. */
export function requestChecks(
  rec: MockRecord,
  now: number,
  delays: Partial<Record<CheckSource, number>>,
) {
  const { app } = rec;
  for (const source of Object.keys(delays) as CheckSource[]) {
    rec.due[source] = now + delays[source]!;
    const check = {
      source,
      state: "pending" as const,
      summary: "Ждём ответ",
      facts: [],
      requestedAt: new Date(now).toISOString(),
      respondedAt: null,
      responseMs: null,
    };
    const i = app.checks.findIndex((c) => c.source === source);
    if (i === -1) app.checks.push(check);
    else app.checks[i] = check;
  }
  app.stage = "enrichment";
  app.waitingOn = "system";
  app.blocker = "Идут запросы во внешние источники";
  app.updatedAt = new Date(now).toISOString();
}

/** Заявка пришла из кабинета клиента: проверка полноты и запуск обогащения. */
export function submit(
  rec: MockRecord,
  now: number,
  delays: Record<CheckSource, number>,
) {
  log(
    rec,
    now,
    { kind: "client", name: rec.app.applicant.name },
    "Заявка подана",
    null,
    "in_review",
  );
  rec.app.stage = "completeness";
  log(rec, now + 200, SYSTEM, "Проверка полноты пройдена");
  requestChecks(rec, now + 400, delays);
  log(
    rec,
    now + 400,
    SYSTEM,
    "Запрошены ЕГРЮЛ/ЕГРИП, ФНС «Прозрачный бизнес», БКИ",
  );
}

/** Продвинуть автоматические этапы до момента now. */
export function tick(
  rec: MockRecord,
  now: number,
  products: CreditProduct[],
): boolean {
  const { app } = rec;
  if (app.hold) return false;
  let changed = false;
  for (const source of SOURCES) {
    const due = rec.due[source];
    const check = app.checks.find((c) => c.source === source);
    if (due === undefined || !check || check.state !== "pending") continue;
    const failing = rec.failOnce.includes(source);
    const answerAt = failing
      ? Date.parse(check.requestedAt) + SOURCE_TIMEOUT_MS
      : due;
    if (answerAt > now) continue;
    changed = true;
    delete rec.due[source];
    const responseMs = answerAt - Date.parse(check.requestedAt);
    if (failing) {
      rec.failOnce = rec.failOnce.filter((s) => s !== source);
      Object.assign(check, {
        state: "unavailable",
        summary: `Источник не ответил за ${SOURCE_TIMEOUT_MS / 1000} с`,
        respondedAt: null,
        responseMs: null,
      });
      log(rec, answerAt, SYSTEM, `${SOURCE_NAME[source]}: нет ответа`);
    } else {
      Object.assign(check, resolveCheck(source, app, rec.raw), {
        respondedAt: new Date(answerAt).toISOString(),
        responseMs,
      });
      log(rec, answerAt, SYSTEM, `${SOURCE_NAME[source]}: ${check.summary}`);
    }
  }

  if (
    app.stage !== "enrichment" ||
    app.checks.some((c) => c.state === "pending")
  )
    return changed;

  const down = app.checks.filter((c) => c.state === "unavailable");
  if (down.length) {
    if (app.waitingOn !== "employee") {
      app.waitingOn = "employee";
      app.blocker = `${down.map((c) => SOURCE_NAME[c.source]).join(", ")} не ответило: повторите запрос`;
      changed = true;
    }
    return changed;
  }

  const product = products.find((p) => p.id === app.request.productId)!;
  const at = Math.max(...app.checks.map((c) => Date.parse(c.respondedAt!)));
  const date = new Date(at + 300);
  app.stage = "scoring";
  app.scoring = computeScore(app, rec.raw, date);
  log(
    rec,
    at + 300,
    SYSTEM,
    `Скоринг: ${app.scoring.score} из 100`,
    app.scoring.model,
  );
  const { rejectReason, ...decision } = computeDecision(
    app,
    rec.raw,
    app.scoring,
    product,
    date,
  );
  app.decision = decision;
  app.stage = "decision";
  app.waitingOn = "employee";
  app.blocker = blockerFor(decision.recommendation, rejectReason);
  log(rec, at + 600, SYSTEM, "Рекомендация готова", decision.explanation);
  return true;
}

function blockerFor(
  recommendation: NonNullable<Application["decision"]>["recommendation"],
  reason: RejectReason | null,
): string {
  switch (recommendation) {
    case "approve":
      return "Правила выполнены: подтвердите одобрение";
    case "counter_offer":
      return "Правила проходят на других условиях";
    case "request_info":
      return "Нужен документ от клиента";
    case "reject":
      return `Рекомендован отказ: ${rejectReasonLabel[reason ?? "other"].toLowerCase()}`;
  }
}

function assertDecisionStage(app: Application) {
  if (app.stage !== "decision" || app.waitingOn !== "employee") {
    throw new ArmActionError(
      "Решение по заявке сейчас принять нельзя: она не на этапе решения.",
    );
  }
}

function assertLimit(employee: Employee, amount: number) {
  if (amount > employee.approvalLimit) {
    throw new ArmActionError(
      `Сумма ${rub.format(amount)} выше вашего лимита ${rub.format(employee.approvalLimit)}. Передайте заявку руководителю.`,
    );
  }
}

export function applyAction(
  rec: MockRecord,
  action: EmployeeAction,
  employee: Employee,
  employees: Employee[],
  products: CreditProduct[],
  now: number,
) {
  const { app } = rec;
  const actor = employeeActor(employee);
  const comment = "comment" in action && action.comment ? action.comment : null;

  if (action.type === "pause" || action.type === "block") {
    if (app.hold) throw new ArmActionError("Заявка уже приостановлена.");
    if (
      app.status === "rejected" ||
      app.status === "disbursed" ||
      app.waitingOn === "nobody"
    ) {
      throw new ArmActionError("Закрытую заявку нельзя поставить на паузу или заблокировать.");
    }
    app.hold = {
      state: action.type === "pause" ? "paused" : "blocked",
      reason: action.reason,
      at: new Date(now).toISOString(),
      by: actor,
      previousWaitingOn: app.waitingOn,
      previousBlocker: app.blocker,
    };
    app.blocker = `${action.type === "pause" ? "Пауза" : "Блокировка"}: ${action.reason}`;
    log(
      rec,
      now,
      actor,
      action.type === "pause" ? "Заявка поставлена на паузу" : "Заявка заблокирована",
      action.reason,
      null,
      "hold",
    );
    return;
  }

  if (action.type === "resume") {
    if (!app.hold) throw new ArmActionError("Заявка не находится на паузе или блокировке.");
    const hold = app.hold;
    app.waitingOn = hold.previousWaitingOn;
    app.blocker = hold.previousBlocker;
    app.hold = null;
    log(
      rec,
      now,
      actor,
      "Заявка возвращена в работу",
      action.comment || null,
      null,
      "hold",
    );
    return;
  }

  if (app.hold) {
    throw new ArmActionError("Заявка приостановлена. Сначала верните её в работу.");
  }

  switch (action.type) {
    case "comment": {
      app.comments ??= [];
      app.comments.push({
        id: `${app.id}-comment-${app.comments.length + 1}`,
        applicationId: app.id,
        at: new Date(now).toISOString(),
        author: actor,
        visibility: action.visibility,
        body: action.body,
      });
      log(rec, now, actor, "Добавлен комментарий", action.body, null, "comment_added");
      return;
    }
    case "handoff": {
      if (app.status === "rejected" || app.status === "disbursed" || app.waitingOn === "nobody") {
        throw new ArmActionError("Закрытую заявку нельзя передать.");
      }
      const to = employees.find((e) => e.id === action.assigneeId);
      if (!to) throw new ArmActionError("Такого сотрудника нет.");
      app.comments ??= [];
      app.comments.push({
        id: `${app.id}-comment-${app.comments.length + 1}`,
        applicationId: app.id,
        at: new Date(now).toISOString(),
        author: actor,
        visibility: "handoff",
        body: action.summary,
      });
      app.handoff = {
        id: `${app.id}-handoff-${app.events.length + 1}`,
        applicationId: app.id,
        at: new Date(now).toISOString(),
        from: actor,
        toEmployeeId: to.id,
        summary: action.summary,
        verifiedFacts: action.verifiedFacts,
        openQuestions: action.openQuestions,
        requestedItems: action.requestedItems,
        nextStep: action.nextStep,
      };
      app.assigneeId = to.id;
      log(rec, now, actor, `Передано: ${to.name}`, action.summary, null, "handoff");
      return;
    }
    case "cancel": {
      if (app.status === "rejected" || app.status === "disbursed" || app.waitingOn === "nobody") {
        throw new ArmActionError("Заявка уже закрыта.");
      }
      app.rejectReason = "other";
      app.waitingOn = "nobody";
      app.blocker = `Отменено: ${action.reason}`;
      log(rec, now, actor, "Заявка отменена", action.reason, "rejected");
      return;
    }
    case "set_urgent":
      throw new ArmActionError("Срочный режим пока не подключён к модели заявки.");
    case "approve": {
      assertDecisionStage(app);
      // Одобрение всегда на условиях заявки. Другие условия: встречное предложение.
      const product = products.find((p) => p.id === app.request.productId);
      const terms = {
        productId: app.request.productId,
        amount: app.request.amount,
        termMonths: app.request.termMonths,
        ratePct: app.decision?.terms?.ratePct ?? product?.ratePct ?? 0,
      };
      assertLimit(employee, terms.amount);
      app.offer = terms;
      app.stage = "signing";
      app.waitingOn = "client";
      app.blocker = "Клиент подписывает договор";
      log(
        rec,
        now,
        actor,
        `Одобрено: ${rub.format(terms.amount)}`,
        comment,
        "approved",
      );
      return;
    }
    case "counter_offer": {
      assertDecisionStage(app);
      assertLimit(employee, action.terms.amount);
      app.offer = action.terms;
      app.waitingOn = "client";
      app.blocker = "Клиент решает по новым условиям";
      log(
        rec,
        now,
        actor,
        `Встречное предложение: ${rub.format(action.terms.amount)} на ${action.terms.termMonths} мес. под ${action.terms.ratePct} %`,
        comment,
        "counter_offer",
      );
      return;
    }
    case "request_info": {
      assertDecisionStage(app);
      app.requestedInfo = action.items;
      app.stage = "completeness";
      app.waitingOn = "client";
      app.blocker = `Ждём от клиента: ${action.items.join(", ").toLowerCase()}`;
      log(
        rec,
        now,
        actor,
        `Запрошено у клиента: ${action.items.join(", ")}`,
        comment,
        "needs_client",
      );
      return;
    }
    case "reject": {
      assertDecisionStage(app);
      app.rejectReason = action.reason;
      app.offer = null;
      app.waitingOn = "nobody";
      app.blocker = `Отказ: ${rejectReasonLabel[action.reason].toLowerCase()}`;
      log(
        rec,
        now,
        actor,
        `Отказ: ${rejectReasonLabel[action.reason]}`,
        comment,
        "rejected",
      );
      return;
    }
    case "assign": {
      const to = employees.find((e) => e.id === action.assigneeId);
      if (!to) throw new ArmActionError("Такого сотрудника нет.");
      app.assigneeId = to.id;
      log(
        rec,
        now,
        actor,
        to.id === employee.id ? "Взял заявку в работу" : `Передано: ${to.name}`,
      );
      return;
    }
    case "rerun_check": {
      const check = app.checks.find((c) => c.source === action.source);
      if (!check || check.state !== "unavailable") {
        throw new ArmActionError("Этот источник уже ответил.");
      }
      requestChecks(rec, now, { [action.source]: 3_000 });
      log(rec, now, actor, `Повторный запрос: ${SOURCE_NAME[action.source]}`);
      return;
    }
  }
}

/** Ответ клиента. В АРМ моделируется вместо кабинета клиента. */
export function applyClientResponse(
  rec: MockRecord,
  response: ClientResponse,
  now: number,
) {
  const { app } = rec;
  if (app.hold) {
    throw new ArmActionError("Заявка приостановлена. Ответ клиента пока не обрабатывается.");
  }
  const client: Actor = { kind: "client", name: app.applicant.name };
  if (response === "documents_sent" && app.status === "needs_client") {
    const docs = app.requestedInfo.join(", ");
    // Справка об уплате снимает задолженность: проверки идут заново.
    if (/налог/i.test(docs)) rec.raw.fns.taxDebtRub = 0;
    app.requestedInfo = [];
    log(rec, now, client, "Клиент прислал документы", docs, "in_review");
    requestChecks(rec, now, { egrul: 1_500, fns: 3_000, bki: 4_500 });
    return;
  }
  if (response === "offer_accepted" && app.status === "counter_offer") {
    app.stage = "signing";
    app.blocker = "Клиент подписывает договор";
    log(
      rec,
      now,
      client,
      "Клиент принял встречное предложение",
      null,
      "approved",
    );
    return;
  }
  if (response === "contract_signed" && app.status === "approved") {
    app.stage = "disbursement";
    app.waitingOn = "nobody";
    app.blocker = "Деньги перечислены";
    log(rec, now, client, "Договор подписан простой электронной подписью");
    log(
      rec,
      now + 1_000,
      SYSTEM,
      `Выдача: ${rub.format(app.offer?.amount ?? app.request.amount)} на расчётный счёт`,
      "Проводка смоделирована, реальных операций нет",
      "disbursed",
    );
    return;
  }
  throw new ArmActionError("Для этой заявки такой ответ клиента не ожидается.");
}
