import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";

import type { ApiProductCatalog } from "@repo/contracts/api";
import type {
  ApplicationComment,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";
import { productRate } from "@repo/contracts/product-catalog";
import type {
  ApplicationWorkflow,
  WorkflowStatus,
} from "@repo/contracts/workflow";

import { deriveFlow, isClosed } from "./application-flow.ts";

export interface CommandContext {
  employee: Employee;
  now: string;
  catalog: ApiProductCatalog;
  /** id сотрудников, которым можно назначать и передавать заявки. */
  employeeIds: ReadonlySet<string>;
}

export interface CommandEvent {
  kind: "status_changed" | "action" | "comment_added" | "handoff" | "hold";
  title: string;
  comment: string | null;
  metadata: Record<string, string>;
}

export interface CommandOutcome {
  application: ApplicationWorkflow;
  event: CommandEvent;
  comment?: Omit<ApplicationComment, "id">;
  /** Нужно заново собрать данные и пересчитать скоринг. */
  recheck?: boolean;
}

const decisionTypes = new Set<EmployeeAction["type"]>([
  "approve",
  "counter_offer",
  "request_info",
  "reject",
]);

/**
 * Таблица переходов команд сотрудника. Статус меняется только здесь и только
 * по разрешённым из plan.md переходам; всё остальное даёт 409.
 */
export function runCommand(
  current: ApplicationWorkflow,
  action: EmployeeAction,
  ctx: CommandContext,
): CommandOutcome {
  if (current.hold && action.type !== "resume") {
    throw new ConflictException(
      current.hold.state === "blocked"
        ? "Заявка заблокирована: сначала снимите блокировку"
        : "Заявка на паузе: сначала верните её в работу",
    );
  }
  if (isClosed(current)) {
    throw new ConflictException("Заявка закрыта, действия недоступны");
  }
  if (decisionTypes.has(action.type)) {
    const flow = deriveFlow(current);
    if (flow.stage !== "decision" || flow.waitingOn !== "employee") {
      throw new ConflictException(
        "Решение сейчас недоступно: заявка не ждёт сотрудника",
      );
    }
  }

  const next: ApplicationWorkflow = { ...current, updatedAt: ctx.now };
  const actor = { kind: "employee" as const, name: ctx.employee.name };
  const base = { actionType: action.type, actorId: ctx.employee.id };

  const changeStatus = (
    to: WorkflowStatus,
    title: string,
    comment: string | null,
    extra: Record<string, string> = {},
  ): CommandOutcome => {
    next.status = to;
    return {
      application: next,
      event: {
        kind: "status_changed",
        title,
        comment,
        metadata: {
          ...base,
          fromStatus: current.status,
          toStatus: to,
          ...extra,
        },
      },
    };
  };
  const plain = (
    kind: CommandEvent["kind"],
    title: string,
    comment: string | null,
    extra: Record<string, string> = {},
  ): CommandOutcome => ({
    application: next,
    event: { kind, title, comment, metadata: { ...base, ...extra } },
  });

  switch (action.type) {
    case "approve": {
      requireLimit(ctx.employee, current.amount);
      const product = findProduct(ctx.catalog, current.productId);
      next.offer = {
        productId: product.id,
        amount: current.amount,
        termMonths: current.termMonths,
        ratePct: productRate(product, ctx.catalog.keyRate),
      };
      return changeStatus(
        "approved",
        "Заявка одобрена",
        action.comment || null,
      );
    }
    case "counter_offer": {
      requireLimit(ctx.employee, action.terms.amount);
      const product = findProduct(ctx.catalog, action.terms.productId);
      if (
        action.terms.amount < product.minAmount ||
        action.terms.amount > product.maxAmount ||
        action.terms.termMonths < product.minTermMonths ||
        action.terms.termMonths > product.maxTermMonths
      ) {
        throw new UnprocessableEntityException(
          "Условия выходят за лимиты продукта",
        );
      }
      next.offer = {
        productId: product.id,
        amount: action.terms.amount,
        termMonths: action.terms.termMonths,
        ratePct: productRate(product, ctx.catalog.keyRate),
      };
      return changeStatus(
        "counter_offer",
        "Отправлено встречное предложение",
        action.comment || null,
      );
    }
    case "request_info": {
      next.requestedInfo = action.items;
      return changeStatus(
        "needs_client",
        "Запрошены документы",
        action.comment || null,
      );
    }
    case "reject": {
      next.rejectReason = action.reason;
      return changeStatus("rejected", "Отказ", action.comment || null, {
        reason: action.reason,
      });
    }
    case "cancel":
      return changeStatus("cancelled", "Заявка отменена", action.reason);
    case "assign": {
      requireEmployee(ctx, action.assigneeId);
      next.assigneeId = action.assigneeId;
      return plain("action", "Назначен ответственный", null, {
        assigneeId: action.assigneeId,
      });
    }
    case "rerun_check": {
      if (current.status !== "in_review") {
        throw new ConflictException(
          "Повторная проверка возможна только на рассмотрении",
        );
      }
      next.scoring = null;
      next.decision = null;
      return {
        ...plain("action", "Повторный запрос в источник", null, {
          source: action.source,
        }),
        recheck: true,
      };
    }
    case "pause":
    case "block": {
      const flow = deriveFlow(current);
      next.hold = {
        state: action.type === "pause" ? "paused" : "blocked",
        reason: action.reason,
        at: ctx.now,
        by: actor,
        previousWaitingOn: flow.waitingOn,
        previousBlocker: flow.blocker,
      };
      return plain(
        "hold",
        action.type === "pause" ? "Пауза" : "Блокировка",
        action.reason,
        { holdState: next.hold.state },
      );
    }
    case "resume": {
      if (!current.hold) {
        throw new ConflictException("Заявка не на паузе и не заблокирована");
      }
      if (current.hold.state === "blocked" && ctx.employee.role !== "lead") {
        throw new ForbiddenException(
          "Снять блокировку может только руководитель",
        );
      }
      next.hold = null;
      return plain("hold", "Возвращена в работу", action.comment || null, {
        holdState: "none",
      });
    }
    case "comment": {
      return {
        ...plain("comment_added", "Комментарий", action.body, {
          visibility: action.visibility,
        }),
        comment: {
          applicationId: current.id,
          at: ctx.now,
          author: actor,
          visibility: action.visibility,
          body: action.body,
        },
      };
    }
    case "handoff": {
      requireEmployee(ctx, action.assigneeId);
      next.assigneeId = action.assigneeId;
      next.handoff = {
        id: `handoff-${current.id}-${ctx.now}`,
        applicationId: current.id,
        at: ctx.now,
        from: actor,
        toEmployeeId: action.assigneeId,
        summary: action.summary,
        verifiedFacts: action.verifiedFacts,
        openQuestions: action.openQuestions,
        requestedItems: action.requestedItems,
        nextStep: action.nextStep,
      };
      return {
        ...plain("handoff", "Передача заявки", action.summary, {
          assigneeId: action.assigneeId,
        }),
        comment: {
          applicationId: current.id,
          at: ctx.now,
          author: actor,
          visibility: "handoff",
          body: action.summary,
        },
      };
    }
    case "set_urgent": {
      next.urgent = action.enabled;
      next.urgentReason = action.enabled ? action.reason || null : null;
      return plain(
        "action",
        action.enabled ? "Срочный режим включён" : "Срочный режим снят",
        action.reason || null,
        { urgent: String(action.enabled) },
      );
    }
  }
}

function requireLimit(employee: Employee, amount: number): void {
  if (amount > employee.approvalLimit) {
    throw new ForbiddenException(
      "Сумма выше вашего лимита одобрения: передайте руководителю",
    );
  }
}

function requireEmployee(ctx: CommandContext, id: string): void {
  if (!ctx.employeeIds.has(id)) {
    throw new UnprocessableEntityException("Сотрудник не найден");
  }
}

function findProduct(catalog: ApiProductCatalog, id: string) {
  const product = catalog.products.find((item) => item.id === id);
  if (!product) {
    throw new UnprocessableEntityException("Продукт не найден в каталоге");
  }
  return product;
}
